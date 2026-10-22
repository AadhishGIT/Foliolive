#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
TF_STATE_BUCKET="foliolive-tfstate-${ACCOUNT_ID}-${AWS_REGION}"

if ! aws s3api head-bucket --bucket "$TF_STATE_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$TF_STATE_BUCKET" --region "$AWS_REGION" >/dev/null
  else
    aws s3api create-bucket \
      --bucket "$TF_STATE_BUCKET" \
      --region "$AWS_REGION" \
      --create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
  fi
fi

aws s3api put-public-access-block \
  --bucket "$TF_STATE_BUCKET" \
  --region "$AWS_REGION" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-versioning \
  --bucket "$TF_STATE_BUCKET" \
  --region "$AWS_REGION" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket "$TF_STATE_BUCKET" \
  --region "$AWS_REGION" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

if ! aws dynamodb describe-table \
  --table-name foliolive-terraform-locks \
  --region "$AWS_REGION" >/dev/null 2>&1; then
  aws dynamodb create-table \
    --table-name foliolive-terraform-locks \
    --region "$AWS_REGION" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
fi
aws dynamodb wait table-exists \
  --table-name foliolive-terraform-locks \
  --region "$AWS_REGION"

printf '%s\n' "$TF_STATE_BUCKET"
