# AWS Systems Manager (SSM) Parameter Store for Application Secrets
# Never checked into git; retrieved dynamically by the EC2 instance profile at boot.

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/jwt_secret"
  description = "Foliolive HMAC-SHA256 JWT signing secret key"
  type        = "SecureString"
  value       = var.jwt_secret

  tags = {
    Name = "${var.project_name}-jwt-secret"
  }
}

resource "aws_ssm_parameter" "postgres_password" {
  name        = "/${var.project_name}/postgres_password"
  description = "Foliolive PostgreSQL database master password"
  type        = "SecureString"
  value       = var.db_password

  tags = {
    Name = "${var.project_name}-postgres-password"
  }
}

resource "aws_ssm_parameter" "postgres_user" {
  name        = "/${var.project_name}/postgres_user"
  description = "Foliolive PostgreSQL database user"
  type        = "String"
  value       = var.db_username

  tags = {
    Name = "${var.project_name}-postgres-user"
  }
}

resource "aws_ssm_parameter" "postgres_db" {
  name        = "/${var.project_name}/postgres_db"
  description = "Foliolive PostgreSQL database name"
  type        = "String"
  value       = "foliolive"

  tags = {
    Name = "${var.project_name}-postgres-db"
  }
}
