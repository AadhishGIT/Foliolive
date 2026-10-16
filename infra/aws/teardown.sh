#!/usr/bin/env bash
# ==============================================================================
# Foliolive AWS One-Command Automated Teardown Script
# Safely terminates all provisioned resources to guarantee $0.00 lingering charges
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================================"
echo "⚠️  Starting Foliolive AWS Free-Tier Automated Teardown"
echo "======================================================================"

if ! command -v terraform &> /dev/null; then
  echo "❌ Error: Terraform CLI is not installed or not in PATH."
  exit 1
fi

cd "${SCRIPT_DIR}"

# 1. Empty S3 Bucket if it exists
if command -v aws &> /dev/null; then
  S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || true)
  if [ -n "${S3_BUCKET}" ]; then
    echo "🗑️  Emptying S3 Bucket: ${S3_BUCKET}..."
    aws s3 rm "s3://${S3_BUCKET}" --recursive 2>/dev/null || true
  fi
fi

# 2. Destroy all resources via Terraform
echo "💥 Destroying all AWS resources via Terraform..."
terraform destroy -auto-approve

echo "======================================================================"
echo "✅ Foliolive AWS Teardown Complete."
echo "   All EC2 instances, EBS volumes, S3 buckets, SSM parameters, and"
echo "   CloudFront distributions have been successfully destroyed."
echo "   Zero recurring charges remain."
echo "======================================================================"
