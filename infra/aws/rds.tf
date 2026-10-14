# RDS PostgreSQL Free Tier Instance
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-postgres"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = "db.t4g.micro" # AWS Free Tier eligible (750 hrs/month)
  allocated_storage = 20             # 20 GB free tier storage
  storage_type      = "gp3"

  db_name  = "foliolive"
  username = var.db_username
  password = var.db_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 7
  publicly_accessible     = false

  tags = {
    Name = "${var.project_name}-postgres"
  }
}
