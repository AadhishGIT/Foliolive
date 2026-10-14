variable "aws_region" {
  description = "AWS region for deployment"
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

variable "db_username" {
  description = "PostgreSQL master database username"
  type        = string
  default     = "foliolive_admin"
}

variable "db_password" {
  description = "PostgreSQL master database password"
  type        = string
  sensitive   = true
  default     = "ChangeMeInProduction2026!"
}

variable "core_api_image" {
  description = "ECR image URI for Core API (Spring Boot)"
  type        = string
  default     = "foliolive/core-api:latest"
}

variable "bff_image" {
  description = "ECR image URI for BFF Gateway (Node.js)"
  type        = string
  default     = "foliolive/bff:latest"
}

variable "jwt_secret" {
  description = "HMAC SHA256 Secret key for signing JWT tokens"
  type        = string
  sensitive   = true
  default     = "foliolive-production-super-secret-key-must-be-at-least-32-chars-long"
}
