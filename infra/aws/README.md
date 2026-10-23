# Foliolive AWS Free-Tier Infrastructure Guide

This directory contains the Infrastructure as Code (IaC) definitions using [HashiCorp Terraform](https://www.terraform.io/) to deploy the complete Foliolive institutional platform strictly within the **AWS Free Tier**.

See **[ADR-0012: AWS Free Tier Single EC2 Docker Compose vs ECS/ALB](../../docs/adr/0012-aws-free-tier-single-ec2-docker-compose-vs-ecs-alb.md)** for detailed technical rationale, memory allocation budgets, and trade-off analysis.

---

## Architecture Topology

```
                                      [ Institutional Clients ]
                                                  │
                                                  ▼ HTTPS (Port 443)
                                       ┌─────────────────────┐
                                       │  Amazon CloudFront  │
                                       │  (Global Edge CDN)  │
                                       └──────────┬──────────┘
                         ┌────────────────────────┴────────────────────────┐
                         │ /assets/*, *.html, *remoteEntry.js              │ /api/*, /auth/*, /ws*, /telemetry*
                         ▼                                                 ▼ (HTTP port 80 over VPC)
              ┌─────────────────────┐                           ┌─────────────────────────────────────────┐
              │   Amazon S3 Bucket  │                           │   Amazon EC2 (t3.micro, 1 vCPU, 1 GB)   │
              │  (Origin Access Ctrl)                           │   20 GB gp3 EBS (with 2 GB Swapfile)    │
              │  • Shell Host (3100)│                           │                                         │
              │  • Portfolio MFE    │                           │  ┌───────────────────────────────────┐  │
              │  • Risk MFE         │                           │  │     Caddy 2 (Reverse Proxy)       │  │
              │  • Alerts MFE       │                           │  └─────────┬─────────────────────────┘  │
              └─────────────────────┘                           │            │                            │
                                                                │            ├──────────────┐             │
                                                                │            ▼              ▼             │
                                                                │  ┌──────────────────┐ ┌──────────────┐  │
                                                                │  │   BFF Gateway    │ │   Core API   │  │
                                                                │  │ (Node 20, 192MB) │ │ (Java 21,    │  │
                                                                │  │ • WebSocket Gate │ │  384MB JRE)  │  │
                                                                │  │ • Rate Limiter   │ │ • Flyway     │  │
                                                                │  │ • Telemetry / RUM│ │ • Risk Math  │  │
                                                                │  └─────────┬────────┘ └──────┬───────┘  │
                                                                │            │                 │          │
                                                                │            └────────┬────────┘          │
                                                                │                     ▼                   │
                                                                │           ┌──────────────────┐          │
                                                                │           │  PostgreSQL 16   │          │
                                                                │           │   (128 MB RAM)   │          │
                                                                │           └──────────────────┘          │
                                                                └─────────────────────────────────────────┘
```

---

## Free-Tier Cost Model & Budget Analysis

| Component          | AWS Resource         | Specification                            | Monthly Free Tier Allowance               | First 12 Months Cost | Post-12 Months Ongoing Cost   |
| :----------------- | :------------------- | :--------------------------------------- | :---------------------------------------- | :------------------- | :---------------------------- |
| **Edge CDN**       | Amazon CloudFront    | PriceClass_100 (NA/EU), TLS 1.3, OAC     | 1.0 TB data out / month, 10M requests     | **$0.00 / mo**       | $0.00 / mo (Always Free Tier) |
| **Static Storage** | Amazon S3            | Standard storage, private ACL            | 5.0 GB storage, 20,000 GET requests       | **$0.00 / mo**       | < $0.02 / mo (< 50 MB used)   |
| **Compute**        | Amazon EC2           | `t3.micro` (or `t2.micro`), 1 vCPU, 1 GB | 750 hours / month (1 continuous instance) | **$0.00 / mo**       | ~$7.50 / mo                   |
| **Block Storage**  | Amazon EBS           | 20 GB gp3 volume (3,000 IOPS, 125 MB/s)  | 30.0 GB gp2/gp3 total storage             | **$0.00 / mo**       | ~$1.60 / mo (20 GB × $0.08)   |
| **Secrets Mgmt**   | SSM Parameter Store  | Standard parameters (JWT, DB passwords)  | Free tier unlimited standard calls        | **$0.00 / mo**       | **$0.00 / mo**                |
| **Edge Rewrite**   | CloudFront Functions | Viewer-request JavaScript router         | 2,000,000 invocations / month             | **$0.00 / mo**       | **$0.00 / mo**                |
| **Load Balancer**  | _None (Eliminated)_  | Multi-origin CloudFront direct to Caddy  | N/A ($18+/mo avoided)                     | **$0.00 / mo**       | **$0.00 / mo**                |
| **Total**          |                      |                                          |                                           | **$0.00 / mo**       | **~$9.10 / mo**               |

> [!IMPORTANT]
> **Free Tier Compliance Warnings**:
>
> 1. **Do not run more than ONE EC2 instance** concurrently under the same AWS account in this region; the 750 free hours cover exactly one `t3.micro` running 24/7.
> 2. **Root Volume Ceiling**: The EBS volume size is locked to `20 GB gp3` to remain safely below the 30 GB AWS Free Tier threshold.
> 3. **No ALB or NAT Gateways**: AWS Application Load Balancers cost ~$18-$22/month and NAT Gateways cost ~$32/month. Neither is covered by AWS Free Tier. CloudFront multi-origin routing directly terminates edge HTTPS and proxies backend traffic to EC2 port 80 at zero additional charge.
> 4. **Terraform State Backend**: The encrypted, versioned S3 state bucket and on-demand DynamoDB lock table are retained after teardown and may incur small storage/request charges.

---

## One-Command Deployment

The repository provides an end-to-end automated deployment script that initializes Terraform, applies infrastructure, compiles frontend bundles, uploads them to S3 with immutable/zero-cache headers, and invalidates CloudFront:

```bash
# Set AWS credentials and region
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Run one-command automated deployment
./infra/aws/deploy.sh
```

### Manual Step-by-Step Deployment

If you prefer to inspect each stage manually:

#### 1. Initialize State and Provision Infrastructure

Terraform state is stored in an encrypted, versioned S3 bucket with a DynamoDB lock table. The bootstrap script creates these resources if needed and imports any existing Foliolive infrastructure into the shared state.

```bash
cd infra/aws
bash ./bootstrap-state.sh
terraform plan -out=tfplan
terraform apply tfplan
```

#### 2. Build and Deploy Static Bundles

```bash
cd ../..
pnpm install --frozen-lockfile
pnpm build

S3_BUCKET=$(terraform -chdir=infra/aws output -raw s3_bucket_name)

# Upload hashed assets (1-year immutable cache)
aws s3 sync apps/shell/dist/assets "s3://${S3_BUCKET}/assets" \
  --cache-control "public, max-age=31536000, immutable"

# Upload SPA entrypoint (zero cache for instant updates)
aws s3 cp apps/shell/dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "public, max-age=0, must-revalidate"

# Upload micro-frontend remotes
aws s3 sync apps/portfolio-mfe/dist "s3://${S3_BUCKET}/portfolio-mfe/"
aws s3 sync apps/risk-mfe/dist "s3://${S3_BUCKET}/risk-mfe/"
aws s3 sync apps/alerts-mfe/dist "s3://${S3_BUCKET}/alerts-mfe/"

# Invalidate CloudFront distribution edge cache
CF_DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DefaultCacheBehavior.TargetOriginId=='S3-${S3_BUCKET}'].Id" --output text)
aws cloudfront create-invalidation --distribution-id "${CF_DIST_ID}" --paths "/*"
```

---

## One-Command Teardown

To destroy the application infrastructure:

```bash
./infra/aws/teardown.sh
```

Or manually:

```bash
cd infra/aws
bash ./bootstrap-state.sh
terraform destroy -auto-approve
```

The remote Terraform state bucket and DynamoDB lock table are retained so future deployments can safely reuse state.

---

## Public Demo Credentials

The deployment configures public demo credentials displayed directly on the login screen (`/login`) with BFF rate limiting to protect the free-tier EC2 instance against abuse:

| Role                       | Username      | Password       | Permissions                                                    |
| :------------------------- | :------------ | :------------- | :------------------------------------------------------------- |
| **Lead Portfolio Manager** | `pm_demo`     | `Password123!` | Read & Write (create/edit/delete risk limits, trade execution) |
| **Risk Analyst / Viewer**  | `viewer_demo` | `Password123!` | Read-Only (view portfolios, risk analytics, live alerts feed)  |

---

## Live Endpoints

Once deployed, retrieve the outputs via `terraform output`:

- **Public Demo UI**: `https://<cloudfront-id>.cloudfront.net/login`
- **Backend Health Check**: `https://<cloudfront-id>.cloudfront.net/health`
- **Prometheus Metrics**: `https://<cloudfront-id>.cloudfront.net/metrics`
- **Core API Spring Actuator**: `https://<cloudfront-id>.cloudfront.net/actuator/health`
