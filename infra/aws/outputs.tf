# Terraform Deployment Outputs

output "cloudfront_domain_name" {
  description = "CloudFront CDN domain URL for the frontend application"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "s3_bucket_name" {
  description = "S3 bucket name where frontend bundles are uploaded"
  value       = aws_s3_bucket.frontend.id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name (BFF & Core API endpoint)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}
