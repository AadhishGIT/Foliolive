# ADR 0012: AWS Free-Tier Single EC2 Docker Compose vs ECS Fargate and ALB

## Status

Accepted

## Date

2026-10-16

## Context

Phase 8 requires deploying the Foliolive platform to Amazon Web Services (AWS) under a strict requirement: **the entire architecture must operate strictly within the AWS Free Tier, incurring $0.00/month during the 12-month promotional period and minimal cost (<$10/month) thereafter**. Any service that exceeds free-tier limits without justification is prohibited.

### Evaluated Architecture Topologies

#### Topology A: Distributed Microservices (ECS Fargate + Application Load Balancer + Amazon RDS PostgreSQL)

- **Components**:
  - AWS Application Load Balancer (ALB) for SSL termination and path routing.
  - AWS ECS Fargate tasks running `core-api` (Spring Boot) and `bff` (Node.js).
  - Amazon RDS PostgreSQL (`db.t4g.micro` or `db.t3.micro`).
  - Amazon S3 + CloudFront for frontend static assets.
- **Cost Analysis**:
  - **ALB**: ~$16.20 - $22.50 / month (ALB is only free for 750 hours in Month 1 with 15 LCUs; thereafter, it incurs ~$0.0225/hour + LCU charges).
  - **ECS Fargate**: ~$15.00 - $20.00 / month (Fargate vCPU and memory are **not** eligible for the EC2 750 hours/month Free Tier; only EC2 instances qualify).
  - **RDS PostgreSQL**: Free for 12 months (750 hours on `db.t4g.micro`), then ~$14.50/month.
  - **Total Estimated Cost**: **$31.20 - $42.50 / month during Free Tier**; **$45.00 - $60.00 / month post-Free Tier**.
- **Verdict**: **Rejected**. Incurs unavoidable monthly charges (primarily ALB and Fargate compute) and violates the hard requirement of remaining free-tier eligible.

#### Topology B: Single Free-Tier EC2 Instance running Docker Compose + CloudFront Multi-Origin (Selected)

- **Components**:
  - **Frontend Storage & CDN**: Amazon S3 + Amazon CloudFront (Origin Access Control, HTTPS, immutable asset caching, non-cached `remoteEntry.js` and `index.html`).
  - **Edge Path Routing & SSL**: CloudFront serves both frontend assets from S3 and proxies backend requests (`/api/*`, `/auth/*`, `/ws`, `/health`, `/metrics`, `/telemetry`) to the EC2 backend.
  - **Compute & Database**: A single `t3.micro` (or `t2.micro`) EC2 instance running Docker Compose orchestrating:
    - `core-api` (Java 21 / Spring Boot 3 JRE, memory capped at 384 MB).
    - `bff` (Node.js 20 + ws + Market Simulator, memory capped at 128 MB).
    - `postgres` (PostgreSQL 16 Alpine, memory capped at 96 MB).
    - `caddy` / reverse proxy with automated health probes.
  - **Operating System Memory Optimization**: 2.0 GiB swap file created via cloud-init `user_data`, providing 3.0 GiB total virtual memory on the 1.0 GiB physical RAM instance.
  - **Secrets Management**: AWS Systems Manager (SSM) Parameter Store with IAM Instance Profile.
- **Cost Analysis**:
  - **EC2 Compute (`t3.micro` / `t2.micro`)**: 750 hours / month included in AWS Free Tier ($0.00).
  - **EBS Storage**: 20 GB `gp3` root volume (Free Tier includes 30 GB EBS) ($0.00).
  - **S3 Storage & Requests**: < 100 MB frontend build (Free Tier includes 5 GB storage & 20,000 GETs) ($0.00).
  - **CloudFront CDN**: 1 TB data transfer out and 10,000,000 HTTPS requests free forever ($0.00).
  - **Application Load Balancer**: **$0.00** (Eliminated; CloudFront terminates TLS at edge).
  - **Total Estimated Cost**: **$0.00 / month during Free Tier**; **~$8.50 - $9.20 / month post-Free Tier**.
- **Verdict**: **Accepted**. 100% compliant with the AWS Free Tier, single unified HTTPS origin, and simple one-command teardown.

## Decision

We adopt **Topology B**: a single free-tier `t3.micro` EC2 instance managed via Docker Compose, fronted by a CloudFront multi-origin distribution with S3 for static micro-frontends:

1. **CloudFront Multi-Origin Routing**:
   - `S3 Origin` (via OAC): Default behavior serves Shell SPA, `/portfolio-mfe/*`, `/risk-mfe/*`, `/alerts-mfe/*`.
   - `EC2 Origin`: CloudFront routes `/api/*`, `/auth/*`, `/ws`, `/health`, `/metrics`, and `/telemetry*` directly to the EC2 instance over HTTP (CloudFront terminates public HTTPS).
   - WebSocket upgrades (`Connection: Upgrade`, `Upgrade: websocket`) are natively forwarded by CloudFront to the Node.js BFF gateway.
2. **Caching Strategy**:
   - `*remoteEntry.js` & `*.html`: `Cache-Control: no-cache, no-store, must-revalidate` (TTL = 0) so remote micro-frontend updates are immediately picked up without browser cache clearing.
   - `/assets/*` (Vite hashed bundles): `Cache-Control: public, max-age=31536000, immutable` (TTL = 1 year).
   - `/api/*`, `/auth/*`, `/ws`, `/telemetry`: Managed `CachingDisabled` policy forwarding all headers and cookies.
3. **RAM & Process Envelopes**:
   - A 2.0 GiB swap space prevents out-of-memory kernel kills on `t3.micro`.
   - Spring Boot JVM configured with `-XX:+UseContainerSupport -XX:MaxRAMPercentage=45.0 -Xss256k`.
   - Node.js configured with `--max-old-space-size=192`.
4. **Secrets Management**:
   - JWT secret and PostgreSQL passwords are stored in SSM Parameter Store (`/foliolive/*`).
   - The EC2 IAM role retrieves secrets at boot time via AWS CLI; no credentials exist in source code.
5. **One-Command Lifecycle**:
   - `terraform apply -auto-approve` provisions the entire stack.
   - `terraform destroy -auto-approve` tears down all resources without orphaned costs.

## Consequences

### Positive

- **Guaranteed Free Tier**: 0 dollars billed during the 12-month AWS Free Tier period.
- **Single Domain & Unified SSL**: Frontend and backend share the CloudFront domain (`https://<dist-id>.cloudfront.net`), completely eliminating cross-origin cookie issues (`SameSite=Lax` cookies work seamlessly).
- **Sub-Second WebSocket Edge Latency**: WebSocket traffic connects through CloudFront's global edge network directly to the BFF gateway.
- **Reproducibility**: The Docker Compose environment on EC2 matches local development identically.

### Negative / Trade-Offs

- **Single Point of Failure for Backend**: The EC2 instance is a single node. While suitable for portfolio demonstrations, an enterprise production multi-region deployment would scale out to ECS/EKS behind an ALB once out of the free-tier constraint.
- **Manual Database Backups**: Postgres data persists on the EBS volume rather than automated RDS snapshots, managed via Docker volume mounts.
