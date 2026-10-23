# Foliolive AWS Terraform Variables

variable "aws_region" {
  description = "AWS region for deployment (e.g. us-east-1, us-east-2, eu-west-1)"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "foliolive"
}

variable "container_image_namespace" {
  description = "Docker image repository namespace on GHCR (e.g. aadhishgit/foliolive)"
  type        = string
  default     = "aadhishgit/foliolive"
}

variable "instance_type" {
  description = "Free-tier eligible EC2 instance type (750 hours/month free on AWS Free Tier)"
  type        = string
  default     = "t3.micro" # Note: In us-east-1, t2.micro or t3.micro are free-tier eligible
}

variable "ssh_key_name" {
  description = "Optional AWS EC2 Key Pair name for SSH administration"
  type        = string
  default     = ""
}

variable "db_username" {
  description = "PostgreSQL database username"
  type        = string
  default     = "foliolive_user"
}

variable "db_password" {
  description = "PostgreSQL database password (stored securely in AWS SSM Parameter Store)"
  type        = string
  sensitive   = true
  default     = "foliolive_prod_password_2026_secure!"
}

variable "jwt_secret" {
  description = "HMAC SHA-256 secret key for signing JWT tokens (stored securely in AWS SSM Parameter Store)"
  type        = string
  sensitive   = true
  default     = "foliolive-production-hmac-sha256-secret-must-be-at-least-32-bytes-secure!"
}
