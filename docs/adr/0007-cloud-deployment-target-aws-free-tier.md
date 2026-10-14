# ADR 0007: Cloud Deployment Target: AWS Free Tier Architecture

## Status

Accepted

## Context

The platform must be deployable to production on AWS using free-tier / cost-effective infrastructure to demonstrate real-world cloud engineering without incurring excessive commercial cloud expenses.

The stack comprises:

- Static assets: Shell and Micro-Frontend bundles (Vite outputs: HTML, JS, CSS)
- Containerized backend services: Node.js BFF (WebSocket + HTTP) and Spring Boot Core API (JVM)
- Relational database: PostgreSQL 16
- Monitoring: Prometheus & Grafana

We evaluated:

1. **Single EC2 t2.micro / t4g.small instance with Docker Compose**: Simple and cost-effective, fits within AWS Free Tier (750 hours/month of t2.micro or t4g.small), but single point of failure and memory-constrained for running Spring Boot + Node + Postgres on 1GB RAM unless swap and JVM heap are strictly configured.
2. **AWS ECS Fargate + RDS PostgreSQL + S3/CloudFront**: Enterprise-standard serverless containers, zero host maintenance. S3 + CloudFront serves static MFE assets with global CDN caching for virtually zero cost. ECS Fargate runs backend containers. RDS PostgreSQL db.t3.micro is free-tier eligible (750 hours/month).
3. **AWS App Runner + S3/CloudFront**: Simpler container orchestration than ECS Fargate, automatic HTTPS and domain provisioning.

## Decision

We choose a **hybrid architecture optimized for AWS Free Tier**:

1. **Frontend MFEs (`shell`, `portfolio-mfe`, `risk-mfe`, `alerts-mfe`)**:
   - Built into static production artifacts and hosted on **AWS S3** fronted by **Amazon CloudFront** CDN.
   - Micro-frontend remote entries are versioned and served with CORS headers enabled.
2. **Backend Containers (`bff`, `core-api`)**:
   - Packaged as multi-stage lightweight OCI container images.
   - Deployed to **AWS ECS Fargate** (or EC2 t4g.micro with optimized JVM heap limits: `-XX:MaxRAMPercentage=75.0`).
3. **Database**:
   - **AWS RDS PostgreSQL (db.t3.micro or db.t4g.micro)**, utilizing 20GB gp2/gp3 storage within free-tier quotas.
4. **IaC**:
   - Infrastructure defined via Terraform scripts in `infra/aws/`.

## Consequences

### Positive

- Fully reproducible, automated cloud deployment.
- Static MFE assets benefit from edge caching and near-zero latency worldwide.
- Free-tier compliant, avoiding unplanned cloud bills while showcasing production IaC.

### Negative / Tradeoffs

- Multi-container JVM + Node deployment requires vigilant memory tuning on small instances.
