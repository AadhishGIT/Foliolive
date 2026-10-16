#!/usr/bin/env bash
# ==============================================================================
# Foliolive AWS One-Command Automated Deployment Script
# Provisions Free-Tier Infrastructure, Builds Frontends, Uploads to S3, and Deploys
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "======================================================================"
echo "🚀 Starting Foliolive AWS Free-Tier Automated Deployment"
echo "======================================================================"

# 1. Check required tools
for tool in terraform aws jq pnpm; do
  if ! command -v "$tool" &> /dev/null; then
    echo "❌ Error: Required command '$tool' is not installed or not in PATH."
    exit 1
  fi
done

# 2. Terraform Init & Apply
echo "📦 [1/4] Provisioning AWS Infrastructure with Terraform..."
cd "${SCRIPT_DIR}"
terraform init -upgrade
terraform apply -auto-approve

# 3. Retrieve Outputs
S3_BUCKET=$(terraform output -raw s3_bucket_name)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
EC2_IP=$(terraform output -raw ec2_public_ip)
DEMO_URL=$(terraform output -raw public_demo_url)

echo "✅ Infrastructure provisioned:"
echo "   - S3 Bucket:         ${S3_BUCKET}"
echo "   - CloudFront Domain: ${CLOUDFRONT_DOMAIN}"
echo "   - EC2 Backend IP:    ${EC2_IP}"
echo "   - Public Demo URL:   ${DEMO_URL}"

# 4. Build Frontends
echo "🔨 [2/4] Building Shell and Micro-Frontend Production Bundles..."
cd "${ROOT_DIR}"
pnpm install --frozen-lockfile
pnpm build

# 5. Sync to S3 with Strict Cache Policies
echo "☁️  [3/4] Uploading Static Bundles to S3..."

# Shell Host
echo "   Uploading Shell Host..."
aws s3 sync apps/shell/dist "s3://${S3_BUCKET}/" \
  --delete \
  --exclude "assets/*" \
  --exclude "*.html"
aws s3 sync apps/shell/dist/assets "s3://${S3_BUCKET}/assets" \
  --cache-control "public, max-age=31536000, immutable"
aws s3 cp apps/shell/dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "public, max-age=0, must-revalidate"

# Portfolio MFE
if [ -d "apps/portfolio-mfe/dist" ]; then
  echo "   Uploading Portfolio MFE..."
  aws s3 sync apps/portfolio-mfe/dist "s3://${S3_BUCKET}/portfolio-mfe/" \
    --exclude "*remoteEntry.js" \
    --exclude "assets/*"
  if [ -d "apps/portfolio-mfe/dist/assets" ]; then
    aws s3 sync apps/portfolio-mfe/dist/assets "s3://${S3_BUCKET}/portfolio-mfe/assets" \
      --cache-control "public, max-age=31536000, immutable"
  fi
  if [ -f "apps/portfolio-mfe/dist/remoteEntry.js" ]; then
    aws s3 cp apps/portfolio-mfe/dist/remoteEntry.js "s3://${S3_BUCKET}/portfolio-mfe/remoteEntry.js" \
      --cache-control "public, max-age=0, must-revalidate"
  fi
fi

# Risk MFE
if [ -d "apps/risk-mfe/dist" ]; then
  echo "   Uploading Risk MFE..."
  aws s3 sync apps/risk-mfe/dist "s3://${S3_BUCKET}/risk-mfe/" \
    --exclude "*remoteEntry.js" \
    --exclude "assets/*"
  if [ -d "apps/risk-mfe/dist/assets" ]; then
    aws s3 sync apps/risk-mfe/dist/assets "s3://${S3_BUCKET}/risk-mfe/assets" \
      --cache-control "public, max-age=31536000, immutable"
  fi
  if [ -f "apps/risk-mfe/dist/remoteEntry.js" ]; then
    aws s3 cp apps/risk-mfe/dist/remoteEntry.js "s3://${S3_BUCKET}/risk-mfe/remoteEntry.js" \
      --cache-control "public, max-age=0, must-revalidate"
  fi
fi

# Alerts MFE
if [ -d "apps/alerts-mfe/dist" ]; then
  echo "   Uploading Alerts MFE..."
  aws s3 sync apps/alerts-mfe/dist "s3://${S3_BUCKET}/alerts-mfe/" \
    --exclude "*remoteEntry.js" \
    --exclude "assets/*"
  if [ -d "apps/alerts-mfe/dist/assets" ]; then
    aws s3 sync apps/alerts-mfe/dist/assets "s3://${S3_BUCKET}/alerts-mfe/assets" \
      --cache-control "public, max-age=31536000, immutable"
  fi
  if [ -f "apps/alerts-mfe/dist/remoteEntry.js" ]; then
    aws s3 cp apps/alerts-mfe/dist/remoteEntry.js "s3://${S3_BUCKET}/alerts-mfe/remoteEntry.js" \
      --cache-control "public, max-age=0, must-revalidate"
  fi
fi

# 6. Invalidate CloudFront Cache
echo "🔄 [4/4] Invalidating CloudFront Edge Cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null && contains(Aliases.Items, '${CLOUDFRONT_DOMAIN#https://}') || contains(DomainName, '${CLOUDFRONT_DOMAIN#https://}')].Id" --output text || true)

if [ -n "${DISTRIBUTION_ID}" ]; then
  echo "   Creating cache invalidation for distribution ${DISTRIBUTION_ID}..."
  aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*" > /dev/null
  echo "   Cache invalidation submitted."
fi

echo "======================================================================"
echo "🎉 Foliolive Successfully Deployed to AWS Free Tier!"
echo "======================================================================"
echo "🌐 Public Demo Application: ${DEMO_URL}"
echo "📊 CloudFront Endpoint:     ${CLOUDFRONT_DOMAIN}"
echo "🏥 Backend Health Check:    ${CLOUDFRONT_DOMAIN}/health"
echo "📈 Prometheus Metrics:      ${CLOUDFRONT_DOMAIN}/metrics"
echo "🩺 Core API Actuator:       ${CLOUDFRONT_DOMAIN}/actuator/health"
echo ""
echo "🔑 Demo Credentials:"
echo "   - Read-Only Analyst:  viewer_demo / Password123!"
echo "   - Portfolio Manager:  pm_demo     / Password123!"
echo "======================================================================"
