#!/usr/bin/env bash
#
# One-time GCP setup so the CD pipeline can deploy without long-lived keys.
#
# Creates a deployer service account, a Workload Identity Federation pool and
# provider scoped to this repository, and prints the three values to store as
# GitHub repository secrets.
#
# Run this once, from a shell authenticated as a project owner:
#
#   gcloud auth login
#   ./scripts/setup-github-wif.sh
#
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-signallab-3305b}"
GITHUB_REPO="${GITHUB_REPO:-rootcastleco/rei-signallab}"
POOL_ID="${POOL_ID:-github-pool}"
PROVIDER_ID="${PROVIDER_ID:-github-provider}"
SA_ID="${SA_ID:-github-deployer}"

SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "================================================================="
echo " 🔐 GitHub -> GCP Workload Identity Federation Setup"
echo "================================================================="
echo "   Project:     ${PROJECT_ID}"
echo "   Repository:  ${GITHUB_REPO}"
echo "-----------------------------------------------------------------"

if ! gcloud auth print-access-token >/dev/null 2>&1; then
  echo "❌ Not authenticated. Run 'gcloud auth login' first."
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

# The project NUMBER (not the ID) is what the WIF principal set is keyed on.
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
echo "✓ Project number resolved: ${PROJECT_NUMBER}"

echo "🔧 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  firebasehosting.googleapis.com \
  --project="${PROJECT_ID}"

echo "👤 Ensuring deployer service account exists..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_ID}" \
    --display-name="GitHub Actions Deployer" \
    --project="${PROJECT_ID}"
else
  echo "   (already exists)"
fi

echo "🔑 Granting deployment roles..."
for ROLE in \
  roles/run.admin \
  roles/artifactregistry.admin \
  roles/iam.serviceAccountUser \
  roles/firebasehosting.admin
do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet >/dev/null
  echo "   + ${ROLE}"
done

echo "🏊 Ensuring Workload Identity pool exists..."
if ! gcloud iam workload-identity-pools describe "${POOL_ID}" \
      --location=global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${POOL_ID}" \
    --location=global \
    --display-name="GitHub Actions Pool" \
    --project="${PROJECT_ID}"
else
  echo "   (already exists)"
fi

echo "🔗 Ensuring OIDC provider exists..."
# The attribute-condition is the security boundary: without it, ANY GitHub
# repository could mint tokens for this service account.
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
      --location=global --workload-identity-pool="${POOL_ID}" \
      --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --location=global \
    --workload-identity-pool="${POOL_ID}" \
    --display-name="GitHub OIDC Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --project="${PROJECT_ID}"
else
  echo "   (already exists)"
fi

echo "🤝 Allowing ${GITHUB_REPO} to impersonate the deployer..."
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}" \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null

PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

echo ""
echo "================================================================="
echo " ✅ SETUP COMPLETE — add these three GitHub repository secrets"
echo "================================================================="
echo ""
echo "   GCP_WORKLOAD_IDENTITY_PROVIDER"
echo "     ${PROVIDER_RESOURCE}"
echo ""
echo "   GCP_SERVICE_ACCOUNT"
echo "     ${SA_EMAIL}"
echo ""
echo "   GCP_PROJECT_ID"
echo "     ${PROJECT_ID}"
echo ""
echo "-----------------------------------------------------------------"
echo " Set them with the GitHub CLI:"
echo ""
echo "   gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --body '${PROVIDER_RESOURCE}'"
echo "   gh secret set GCP_SERVICE_ACCOUNT --body '${SA_EMAIL}'"
echo "   gh secret set GCP_PROJECT_ID --body '${PROJECT_ID}'"
echo ""
echo " Then push to main, or re-run the latest CD workflow, to deploy."
echo "================================================================="
