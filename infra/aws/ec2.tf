# EC2 Single-Instance Backend Provisioning (Free Tier Eligible)
# Runs Docker Compose (PostgreSQL 16, Java 21 Core API, Node.js 20 BFF, and Caddy Reverse Proxy)

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical Ubuntu AWS account

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM Role allowing EC2 to read configuration secrets from SSM Parameter Store
resource "aws_iam_role" "ec2_ssm" {
  name = "${var.project_name}-ec2-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ec2-ssm-role"
  }
}

resource "aws_iam_policy" "ssm_read" {
  name        = "${var.project_name}-ssm-read-policy"
  description = "Allows EC2 instance to read Foliolive secrets from SSM Parameter Store"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_attach" {
  role       = aws_iam_role.ec2_ssm.name
  policy_arn = aws_iam_policy.ssm_read.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-instance-profile"
  role = aws_iam_role.ec2_ssm.name
}

# Free-Tier Single EC2 Instance
resource "aws_instance" "backend" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  subnet_id            = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.backend.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  key_name                    = var.ssh_key_name != "" ? var.ssh_key_name : null
  user_data_replace_on_change = true

  # 20 GB gp3 volume is 100% within the 30 GB AWS Free Tier allowance
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.project_name}-backend-root-ebs"
    }
  }

  user_data = <<-EOF
              #!/bin/bash
              set -ex

              # 1. Setup 2GB Swap Space to comfortably support JVM + Node + Postgres on 1GB RAM
              if [ ! -f /swapfile ]; then
                fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
                echo '/swapfile none swap sw 0 0' >> /etc/fstab
                sysctl vm.swappiness=15
                echo 'vm.swappiness=15' >> /etc/sysctl.conf
              fi

              # 2. Install Docker & AWS CLI
              apt-get update -y
              apt-get install -y ca-certificates curl gnupg lsb-release jq unzip awscli

              mkdir -m 0755 -p /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

              echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

              systemctl enable docker
              systemctl start docker

              # 3. Directory Setup
              mkdir -p /opt/foliolive
              cd /opt/foliolive

              # 4. Fetch Secrets from AWS SSM Parameter Store
              REGION="${var.aws_region}"
              PROJECT="${var.project_name}"

              JWT_SECRET=$(aws ssm get-parameter --name "/$PROJECT/jwt_secret" --with-decryption --query "Parameter.Value" --output text --region $REGION || echo "${var.jwt_secret}")
              POSTGRES_PASS=$(aws ssm get-parameter --name "/$PROJECT/postgres_password" --with-decryption --query "Parameter.Value" --output text --region $REGION || echo "${var.db_password}")
              POSTGRES_USER=$(aws ssm get-parameter --name "/$PROJECT/postgres_user" --query "Parameter.Value" --output text --region $REGION || echo "${var.db_username}")

              cat <<ENVEOF > /opt/foliolive/.env
              POSTGRES_DB=foliolive
              POSTGRES_USER=$POSTGRES_USER
              POSTGRES_PASSWORD=$POSTGRES_PASS
              JWT_SECRET=$JWT_SECRET
              CORE_API_URL=http://core-api:8080
              BFF_PORT=4000
              ENVEOF

              # 5. Create Caddyfile for Reverse Proxying and Header Normalization
              cat <<CADDYEOF > /opt/foliolive/Caddyfile
              :80 {
                  # API & Telemetry routing
                  handle /api/* {
                      reverse_proxy bff:4000
                  }
                  handle /auth/* {
                      reverse_proxy bff:4000
                  }
                  handle /telemetry* {
                      reverse_proxy bff:4000
                  }
                  handle /ws* {
                      reverse_proxy bff:4000
                  }
                  handle /health* {
                      reverse_proxy bff:4000
                  }
                  handle /metrics* {
                      reverse_proxy bff:4000
                  }

                  # Direct Core API Actuator routing
                  handle /actuator/* {
                      reverse_proxy core-api:8080
                  }

                  # Default root probe
                  handle {
                      respond "Foliolive Backend Gateway (Free Tier) - Active" 200
                  }
              }
              CADDYEOF

              # 6. Create Production Docker Compose Configuration
              cat <<COMPOSEEOF > /opt/foliolive/docker-compose.yml
              services:
                postgres:
                  image: postgres:16-alpine
                  container_name: foliolive-postgres
                  restart: always
                  environment:
                    POSTGRES_DB: $${POSTGRES_DB}
                    POSTGRES_USER: $${POSTGRES_USER}
                    POSTGRES_PASSWORD: $${POSTGRES_PASSWORD}
                  volumes:
                    - postgres-data:/var/lib/postgresql/data
                  deploy:
                    resources:
                      limits:
                        memory: 128M
                  healthcheck:
                    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
                    interval: 5s
                    timeout: 5s
                    retries: 5

                core-api:
                  image: ghcr.io/${var.container_image_namespace}/core-api:latest
                  container_name: foliolive-core-api
                  restart: always
                  environment:
                    POSTGRES_HOST: postgres
                    POSTGRES_PORT: 5432
                    POSTGRES_DB: $${POSTGRES_DB}
                    POSTGRES_USER: $${POSTGRES_USER}
                    POSTGRES_PASSWORD: $${POSTGRES_PASSWORD}
                    JWT_SECRET: $${JWT_SECRET}
                    JAVA_OPTS: "-XX:+UseContainerSupport -XX:MaxRAMPercentage=45.0 -Xss256k"
                  deploy:
                    resources:
                      limits:
                        memory: 384M
                  depends_on:
                    postgres:
                      condition: service_healthy

                bff:
                  image: ghcr.io/${var.container_image_namespace}/bff:latest
                  container_name: foliolive-bff
                  restart: always
                  environment:
                    PORT: 4000
                    BFF_PORT: 4000
                    CORE_API_URL: http://core-api:8080
                    JWT_SECRET: $${JWT_SECRET}
                    NODE_ENV: production
                    SIMULATION_SEED: 42
                  deploy:
                    resources:
                      limits:
                        memory: 192M
                  depends_on:
                    - core-api

                caddy:
                  image: caddy:2-alpine
                  container_name: foliolive-caddy
                  restart: always
                  ports:
                    - "80:80"
                    - "443:443"
                  volumes:
                    - /opt/foliolive/Caddyfile:/etc/caddy/Caddyfile
                    - caddy-data:/data
                    - caddy-config:/config
                  deploy:
                    resources:
                      limits:
                        memory: 64M

              volumes:
                postgres-data:
                caddy-data:
                caddy-config:
              COMPOSEEOF

              # 7. Systemd Service for Auto-Restart
              cat <<SERVICEOF > /etc/systemd/system/foliolive.service
              [Unit]
              Description=Foliolive Institutional Backend Service (Docker Compose)
              Requires=docker.service
              After=docker.service

              [Service]
              Type=oneshot
              RemainAfterExit=yes
              WorkingDirectory=/opt/foliolive
              ExecStart=/usr/bin/docker compose up -d
              ExecStop=/usr/bin/docker compose down
              TimeoutStartSec=300

              [Install]
              WantedBy=multi-user.target
              SERVICEOF

              systemctl daemon-reload
              systemctl enable foliolive.service
              systemctl start foliolive.service || true
              EOF

  tags = {
    Name = "${var.project_name}-backend-ec2"
  }
}

# Stable Elastic IP for EC2 backend to prevent IP/DNS rotation across restarts
resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-backend-eip"
  }
}
