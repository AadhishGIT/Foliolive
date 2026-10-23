# S3 & CloudFront for Shell Host, Micro-Frontends (MFEs), and EC2 Reverse Proxy
# Architecture: CloudFront terminates public HTTPS, serves static SPA assets from S3 via OAC,
# and reverse proxies dynamic API and WebSocket connections to the free-tier EC2 Docker Compose instance.

resource "random_id" "bucket_suffix" {
  byte_length = 6
}

# 1. S3 Bucket for Static Frontend Bundles
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-${random_id.bucket_suffix.b64_url}"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-frontend-bucket"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# 2. CloudFront Origin Access Control (OAC) for secure S3 read access
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-oac"
  description                       = "Origin Access Control for Foliolive Frontend S3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 3. CloudFront Edge Function for SPA Route Rewrites
# Rewrites subroutes (e.g. /portfolio, /risk, /alerts, /login) to /index.html without masking API 404s
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.project_name}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "SPA client-side routing rewrite for Foliolive shell and MFEs"
  publish = true
  code    = <<-EOF
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    return request;
}
EOF
}

# 4. Multi-Origin CloudFront CDN Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Free tier friendly (US, Canada, Europe)

  # Origin 1: S3 Static Web Assets
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  # Origin 2: Backend EC2 Instance (Docker Compose + Caddy Reverse Proxy)
  origin {
    domain_name = aws_eip.backend.public_dns
    origin_id   = "EC2-Backend"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 5
    }
  }

  # Default Cache Behavior: Static Shell & MFE files from S3
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
    compress    = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # Ordered Behavior 1: Hashed Static Assets (1 Year Immutable Cache)
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 31536000
    default_ttl = 31536000
    max_ttl     = 31536000
    compress    = true
  }

  # Ordered Behavior 2: Micro-Frontend Remote Entry Manifests (Zero-Cache for Instant Deployment)
  ordered_cache_behavior {
    path_pattern           = "*remoteEntry.js"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # Ordered Behavior 3: Dynamic BFF REST API Endpoints -> EC2
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Backend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # Ordered Behavior 4: Authentication & Cookie Session -> EC2
  ordered_cache_behavior {
    path_pattern           = "/auth/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Backend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # Ordered Behavior 5: Real-Time WebSocket Endpoint -> EC2
  ordered_cache_behavior {
    path_pattern           = "/ws*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Backend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = false
  }

  # Ordered Behavior 6: RUM Telemetry Endpoint -> EC2
  ordered_cache_behavior {
    path_pattern           = "/telemetry*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Backend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # Ordered Behavior 7: Health Check Endpoint -> EC2
  ordered_cache_behavior {
    path_pattern           = "/health*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Backend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["*"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # Ordered Behavior 8: Prometheus Metrics Endpoint -> EC2
  ordered_cache_behavior {
    path_pattern           = "/metrics*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Backend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["*"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # Ordered Behavior 9: Core API Spring Boot Actuator -> EC2
  ordered_cache_behavior {
    path_pattern           = "/actuator/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "EC2-Backend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # SPA 403 S3 AccessDenied Fallback
  custom_error_response {
    error_caching_min_ttl = 0
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}

# 5. S3 Bucket Policy allowing CloudFront OAC read access
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}
