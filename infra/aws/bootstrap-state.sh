#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGION="${TF_VAR_aws_region:-${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}}"
export TF_VAR_aws_region="${REGION}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
STATE_BUCKET="foliolive-terraform-state-${ACCOUNT_ID}-${REGION}"
LOCK_TABLE="foliolive-terraform-locks"

if ! aws s3api head-bucket --bucket "${STATE_BUCKET}" 2>/dev/null; then
  if [ "${REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${STATE_BUCKET}" --region "${REGION}"
  else
    aws s3api create-bucket \
      --bucket "${STATE_BUCKET}" \
      --region "${REGION}" \
      --create-bucket-configuration "LocationConstraint=${REGION}"
  fi
fi

aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

if ! aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${REGION}" >/dev/null 2>&1; then
  aws dynamodb create-table \
    --table-name "${LOCK_TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}"
  aws dynamodb wait table-exists --table-name "${LOCK_TABLE}" --region "${REGION}"
fi

terraform -chdir="${SCRIPT_DIR}" init -input=false -reconfigure \
  -backend-config="bucket=${STATE_BUCKET}" \
  -backend-config="key=foliolive/production/terraform.tfstate" \
  -backend-config="region=${REGION}" \
  -backend-config="dynamodb_table=${LOCK_TABLE}" \
  -backend-config="encrypt=true"

import_if_found() {
  local address="$1"
  local id="$2"

  if [ -z "${id}" ] || [ "${id}" = "None" ]; then
    return
  fi
  local state
  state="$(terraform -chdir="${SCRIPT_DIR}" state list)"
  if ! grep -Fxq "${address}" <<< "${state}"; then
    terraform -chdir="${SCRIPT_DIR}" import -input=false "${address}" "${id}"
  fi
}

PROJECT="${TF_VAR_project_name:-foliolive}"
VPC_ID="$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=${PROJECT}-vpc" \
  --query 'Vpcs[0].VpcId' --output text)"
import_if_found aws_vpc.main "${VPC_ID}"

if [ -n "${VPC_ID}" ] && [ "${VPC_ID}" != "None" ]; then
  import_if_found aws_internet_gateway.gw "$(aws ec2 describe-internet-gateways \
    --filters "Name=attachment.vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${PROJECT}-igw" \
    --query 'InternetGateways[0].InternetGatewayId' --output text)"
  SUBNET_ID="$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${PROJECT}-public-subnet" \
    --query 'Subnets[0].SubnetId' --output text)"
  import_if_found aws_subnet.public "${SUBNET_ID}"
  ROUTE_TABLE_ID="$(aws ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${PROJECT}-public-rt" \
    --query 'RouteTables[0].RouteTableId' --output text)"
  import_if_found aws_route_table.public "${ROUTE_TABLE_ID}"
  if [ -n "${SUBNET_ID}" ] && [ "${SUBNET_ID}" != "None" ] &&
    [ -n "${ROUTE_TABLE_ID}" ] && [ "${ROUTE_TABLE_ID}" != "None" ]; then
    import_if_found aws_route_table_association.public "${SUBNET_ID}/${ROUTE_TABLE_ID}"
  fi
  import_if_found aws_security_group.backend "$(aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${PROJECT}-backend-sg" \
    --query 'SecurityGroups[0].GroupId' --output text)"
fi

ROLE_NAME="${PROJECT}-ec2-ssm-role"
POLICY_ARN="$(aws iam list-policies --scope Local \
  --query "Policies[?PolicyName=='${PROJECT}-ssm-read-policy'].Arn | [0]" --output text)"
import_if_found aws_iam_role.ec2_ssm "$(aws iam get-role \
  --role-name "${ROLE_NAME}" --query 'Role.RoleName' --output text 2>/dev/null || true)"
import_if_found aws_iam_policy.ssm_read "${POLICY_ARN}"
if [ -n "${POLICY_ARN}" ] && [ "${POLICY_ARN}" != "None" ]; then
  ATTACHED_POLICY="$(aws iam list-attached-role-policies --role-name "${ROLE_NAME}" \
    --query "AttachedPolicies[?PolicyArn=='${POLICY_ARN}'].PolicyArn | [0]" \
    --output text 2>/dev/null || true)"
  if [ -n "${ATTACHED_POLICY}" ] && [ "${ATTACHED_POLICY}" != "None" ]; then
    import_if_found aws_iam_role_policy_attachment.ssm_attach \
      "${ROLE_NAME}/${ATTACHED_POLICY}"
  fi
fi
import_if_found aws_iam_instance_profile.ec2_profile "$(aws iam get-instance-profile \
  --instance-profile-name "${PROJECT}-ec2-instance-profile" \
  --query 'InstanceProfile.InstanceProfileName' --output text 2>/dev/null || true)"
import_if_found aws_instance.backend "$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=${PROJECT}-backend-ec2" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)"

for parameter in jwt_secret postgres_password postgres_user postgres_db; do
  import_if_found "aws_ssm_parameter.${parameter}" \
    "$(aws ssm get-parameter --name "/${PROJECT}/${parameter}" --query 'Parameter.Name' \
      --output text 2>/dev/null || true)"
done

DISTRIBUTION_ID=""
S3_BUCKET=""
for candidate in $(aws cloudfront list-distributions \
  --query 'DistributionList.Items[].Id' --output text); do
  if [ "${candidate}" = "None" ]; then
    continue
  fi
  DISTRIBUTION_ARN="$(aws cloudfront get-distribution --id "${candidate}" \
    --query 'Distribution.ARN' --output text)"
  DISTRIBUTION_NAME="$(aws cloudfront list-tags-for-resource --resource "${DISTRIBUTION_ARN}" \
    --query "Tags.Items[?Key=='Name'].Value | [0]" --output text)"
  if [ "${DISTRIBUTION_NAME}" = "${PROJECT}-cloudfront" ]; then
    DISTRIBUTION_ID="${candidate}"
    S3_DOMAIN="$(aws cloudfront get-distribution --id "${DISTRIBUTION_ID}" \
      --query "Distribution.DistributionConfig.Origins.Items[?contains(DomainName, '.s3.')].DomainName | [0]" \
      --output text)"
    if [ -n "${S3_DOMAIN}" ] && [ "${S3_DOMAIN}" != "None" ]; then
      S3_BUCKET="${S3_DOMAIN%%.*}"
    fi
    break
  fi
done

if [ -z "${S3_BUCKET}" ] || [ "${S3_BUCKET}" = "None" ]; then
  S3_BUCKET="$(aws s3api list-buckets \
    --query "Buckets[?starts_with(Name, '${PROJECT}-frontend-')].Name | [0]" \
    --output text)"
fi

if [ -n "${S3_BUCKET}" ] && [ "${S3_BUCKET}" != "None" ]; then
  SUFFIX="${S3_BUCKET##*-}"
  import_if_found random_id.bucket_suffix "${SUFFIX}"
  import_if_found aws_s3_bucket.frontend "${S3_BUCKET}"
  if aws s3api get-public-access-block --bucket "${S3_BUCKET}" >/dev/null 2>&1; then
    import_if_found aws_s3_bucket_public_access_block.frontend "${S3_BUCKET}"
  fi
  if aws s3api get-bucket-cors --bucket "${S3_BUCKET}" >/dev/null 2>&1; then
    import_if_found aws_s3_bucket_cors_configuration.frontend "${S3_BUCKET}"
  fi
  if aws s3api get-bucket-policy --bucket "${S3_BUCKET}" >/dev/null 2>&1; then
    import_if_found aws_s3_bucket_policy.frontend "${S3_BUCKET}"
  fi
fi

import_if_found aws_cloudfront_origin_access_control.oac "$(aws cloudfront \
  list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${PROJECT}-oac'].Id | [0]" \
  --output text)"
import_if_found aws_cloudfront_function.spa_rewrite "$(aws cloudfront list-functions \
  --query "FunctionList.Items[?Name=='${PROJECT}-spa-rewrite'].Name | [0]" \
  --output text)"

import_if_found aws_cloudfront_distribution.frontend "${DISTRIBUTION_ID}"
