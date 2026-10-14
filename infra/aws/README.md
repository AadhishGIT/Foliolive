# Foliolive AWS Free Tier Deployment Guide

This directory contains the Infrastructure as Code (IaC) definitions using Terraform to deploy the complete Foliolive institutional platform to the **AWS Free Tier**.

---

## Architecture Topology

```
                                  [ User Browser ]
                                         │
                    ┌────────────────────┴────────────────────┐
                    │ HTTPS (Port 443)                        │ WSS / HTTP
                    ▼                                         ▼
         ┌─────────────────────┐                   ┌─────────────────────┐
         │  Amazon CloudFront  │                   │ Application Load    │
         │  (Global Edge CDN)  │                   │ Balancer (ALB)      │
         └──────────┬──────────┘                   └──────────┬──────────┘
                    │ S3 Read                                 │ Path Routing
                    ▼                                         ├────────────────────────┐
         ┌─────────────────────┐                              ▼                        ▼
         │   Amazon S3 Bucket  │                   ┌─────────────────────┐  ┌─────────────────────┐
         │  (Shell & MFE Bundles)                  │   BFF Gateway       │  │   Core Domain API   │
         └─────────────────────┘                   │   (ECS Fargate)     │  │   (ECS Fargate)     │
                                                   │   Node.js 20 / ws   │  │   Spring Boot 3     │
                                                   └──────────┬──────────┘  └──────────┬──────────┘
                                                              │                        │ JPA / Flyway
                                                              └────────────────────────┼────────┐
                                                                                       ▼        ▼
                                                                            ┌─────────────────────┐
                                                                            │  Amazon RDS Postgres│
                                                                            │  (db.t4g.micro)     │
                                                                            └─────────────────────┘
```

---

## Free-Tier Resource Allocation

| Resource               | AWS Service           | Specification                                                   | Monthly Free Tier Limit        |
| :--------------------- | :-------------------- | :-------------------------------------------------------------- | :----------------------------- |
| **Frontend CDN**       | CloudFront            | Global edge caching, HTTP/2 & HTTP/3                            | 1 TB data transfer-out / month |
| **Frontend Storage**   | Amazon S3             | Versioned static bundles with CORS                              | 5 GB standard storage          |
| **Relational DB**      | Amazon RDS PostgreSQL | `db.t4g.micro`, 20 GB gp3 storage                               | 750 hours/month                |
| **Backend Containers** | Amazon ECS Fargate    | `core-api` (0.5 vCPU, 1 GB RAM) & `bff` (0.25 vCPU, 0.5 GB RAM) | Spot / low-compute allocation  |
| **Telemetry Logs**     | Amazon CloudWatch     | 7-day retention log stream                                      | 5 GB ingestion & archiving     |

---

## Prerequisites

1. [Terraform CLI >= 1.5.0](https://developer.hashicorp.com/terraform/install)
2. [AWS CLI v2](https://aws.amazon.com/cli/) configured with valid deployment credentials:
   ```bash
   aws configure
   ```
3. Docker installed for container image compilation.

---

## Deployment Steps

### 1. Build and Push OCI Container Images to ECR

```bash
# Authenticate Docker to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and push Core API (Spring Boot)
docker build -t <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/foliolive/core-api:latest -f services/core-api/Dockerfile services/core-api/
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/foliolive/core-api:latest

# Build and push BFF Gateway (Node.js)
docker build -t <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/foliolive/bff:latest -f services/bff/Dockerfile .
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/foliolive/bff:latest
```

### 2. Initialize and Apply Terraform Infrastructure

```bash
cd infra/aws

# Initialize providers
terraform init

# Plan infrastructure deployment
terraform plan -out=tfplan

# Apply resources
terraform apply tfplan
```

### 3. Deploy Frontend Bundles to S3 & Invalidate CloudFront

```bash
# Build production client bundles
pnpm build

# Retrieve S3 bucket name from Terraform outputs
S3_BUCKET=$(terraform output -raw s3_bucket_name)
CF_DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DefaultCacheBehavior.TargetOriginId=='S3-${S3_BUCKET}'].Id" --output text)

# Sync static build outputs to S3
aws s3 sync apps/shell/dist s3://${S3_BUCKET}/ --delete
aws s3 sync apps/portfolio-mfe/dist s3://${S3_BUCKET}/portfolio-mfe/
aws s3 sync apps/risk-mfe/dist s3://${S3_BUCKET}/risk-mfe/
aws s3 sync apps/alerts-mfe/dist s3://${S3_BUCKET}/alerts-mfe/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths "/*"
```

---

## Verification

Upon completion of `terraform apply`, retrieve the live URLs:

```bash
terraform output
```

- **Frontend CloudFront URL**: `https://<distribution-id>.cloudfront.net`
- **Application Load Balancer**: `http://<alb-id>.us-east-1.elb.amazonaws.com`
- **Health Check**: `curl http://<alb-id>.us-east-1.elb.amazonaws.com/health`
- **Core API Swagger UI**: `http://<alb-id>.us-east-1.elb.amazonaws.com/swagger-ui/index.html`
