#!/usr/bin/env bash
set -euo pipefail

# Parametric Defaults
GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
GCP_REGION="${GCP_REGION:-europe-west1}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-rei-signallab-api}"
IMAGE_NAME="${IMAGE_NAME:-rei-signallab-api}"
COMMIT_SHA="${COMMIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo "local")}"
BUILD_TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
REPOSITORY_NAME="rei-signallab"

echo "================================================================="
echo " 🚀 REI SignalLab Cloud Run Deployment Script"
echo "================================================================="

if [ -z "${GCP_PROJECT_ID}" ]; then
  echo "❌ ERROR: GCP_PROJECT_ID environment variable is required."
  echo "Usage: GCP_PROJECT_ID=signallab-3305b ./scripts/deploy-cloud-run.sh"
  exit 1
fi

echo "📋 Deployment Configuration:"
echo "   - Project ID:         ${GCP_PROJECT_ID}"
echo "   - Region:             ${GCP_REGION}"
echo "   - Cloud Run Service:  ${CLOUD_RUN_SERVICE}"
echo "   - Image Name:         ${IMAGE_NAME}"
echo "   - Commit SHA:         ${COMMIT_SHA}"
echo "   - Build Timestamp:    ${BUILD_TIMESTAMP}"
echo "-----------------------------------------------------------------"

# 1. Verify Google Cloud Authentication
echo "🔍 Checking Google Cloud authentication..."
if ! gcloud auth print-access-token >/dev/null 2>&1; then
  echo "❌ ERROR: Not authenticated with Google Cloud CLI. Run 'gcloud auth login' or configure credentials."
  exit 1
fi
echo "✓ Authenticated with GCP."

# 2. Configure Docker Authentication for Artifact Registry
echo "🔑 Configuring Docker authentication for Artifact Registry..."
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

# 3. Ensure Artifact Registry Repository Exists
IMAGE_TAG="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:${COMMIT_SHA}"
IMAGE_LATEST="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:latest"

echo "📦 Checking Artifact Registry repository '${REPOSITORY_NAME}' in ${GCP_REGION}..."
if ! gcloud artifacts repositories describe "${REPOSITORY_NAME}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  echo "🛠️ Creating Artifact Registry repository '${REPOSITORY_NAME}'..."
  gcloud artifacts repositories create "${REPOSITORY_NAME}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="REI SignalLab Docker Container Repository" \
    --project="${GCP_PROJECT_ID}"
fi

# 4. Build Docker Image
echo "🐳 Building backend Docker image..."
docker build \
  -t "${IMAGE_TAG}" \
  -t "${IMAGE_LATEST}" \
  -f backend/Dockerfile \
  backend/

# 5. Push Image to Artifact Registry
echo "⬆️ Pushing image to Artifact Registry..."
docker push "${IMAGE_TAG}"
docker push "${IMAGE_LATEST}"

# 6. Create Temporary Environment Variables YAML File
ENV_FILE="$(mktemp)"
trap 'rm -f "${ENV_FILE}"' EXIT

cat > "${ENV_FILE}" <<EOF
APP_ENV: "production"
APP_VERSION: "2.1.0"
COMMIT_SHA: "${COMMIT_SHA}"
BUILD_TIMESTAMP: "${BUILD_TIMESTAMP}"
CORS_ALLOWED_ORIGINS: "https://signallab-3305b.web.app,https://signallab-3305b.firebaseapp.com,http://localhost:5173"
MAX_UPLOAD_BYTES: "26214400"
MAX_SIGNAL_SAMPLES: "2000000"
MAX_GRAPH_NODES: "200"
MAX_GRAPH_CONNECTIONS: "500"
REQUEST_TIMEOUT_SECONDS: "300"
LOG_LEVEL: "INFO"
EOF

# 7. Deploy to Google Cloud Run with --env-vars-file
echo "☁️ Deploying service to Google Cloud Run (${CLOUD_RUN_SERVICE})..."
gcloud run deploy "${CLOUD_RUN_SERVICE}" \
  --image="${IMAGE_TAG}" \
  --platform=managed \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --concurrency=8 \
  --min-instances=0 \
  --max-instances=5 \
  --env-vars-file="${ENV_FILE}"

# 8. Get Deployed Service URL
SERVICE_URL="$(gcloud run services describe "${CLOUD_RUN_SERVICE}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)')"
echo "🌐 Deployed Cloud Run Service URL: ${SERVICE_URL}"

# 9. Run Live Health Checks
echo "🧪 Verifying service liveness (/api/health/live)..."
LIVE_RES="$(curl -fsS "${SERVICE_URL}/api/health/live" || echo "failed")"
if [[ "${LIVE_RES}" != *"status"* ]] || [[ "${LIVE_RES}" != *"ok"* ]]; then
  echo "❌ Health Liveness Check Failed! Response: ${LIVE_RES}"
  exit 1
fi
echo "✓ Liveness check passed."

echo "🧪 Verifying service readiness (/api/health/ready)..."
READY_RES="$(curl -fsS "${SERVICE_URL}/api/health/ready" || echo "failed")"
if [[ "${READY_RES}" != *"status"* ]] || [[ "${READY_RES}" != *"ready"* ]]; then
  echo "❌ Health Readiness Check Failed! Response: ${READY_RES}"
  exit 1
fi
echo "✓ Readiness check passed."

echo "================================================================="
echo " 🎉 DEPLOYMENT SUCCESSFUL!"
echo "   - Service URL:     ${SERVICE_URL}"
echo "   - Live Probe:      ${SERVICE_URL}/api/health/live"
echo "   - Ready Probe:     ${SERVICE_URL}/api/health/ready"
echo "   - Version Probe:   ${SERVICE_URL}/api/version"
echo "================================================================="
