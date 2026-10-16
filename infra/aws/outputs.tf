# Terraform Deployment Outputs for Foliolive Free-Tier Architecture

output "cloudfront_domain_name" {
  description = "CloudFront CDN domain URL for the frontend application"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "public_demo_url" {
  description = "Direct URL to Foliolive Institutional Demo Login"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}/login"
}

output "s3_bucket_name" {
  description = "S3 bucket name where Shell and MFE bundles are hosted"
  value       = aws_s3_bucket.frontend.id
}

output "ec2_instance_id" {
  description = "EC2 Backend instance ID"
  value       = aws_instance.backend.id
}

output "ec2_public_ip" {
  description = "Public IP address of the EC2 backend instance"
  value       = aws_instance.backend.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS hostname of the EC2 backend instance"
  value       = aws_instance.backend.public_dns
}

output "backend_health_url" {
  description = "Backend health check endpoint via CloudFront"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}/health"
}

output "prometheus_metrics_url" {
  description = "Prometheus metrics endpoint via CloudFront"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}/metrics"
}

output "core_actuator_health_url" {
  description = "Spring Boot Actuator health endpoint via CloudFront"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}/actuator/health"
}
