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

# 2. Capture Exact Active 100% Traffic Revision for Auto-Rollback
PREVIOUS_REVISION=""
SERVICE_JSON="$(gcloud run services describe "${CLOUD_RUN_SERVICE}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format=json 2>/dev/null || echo '')"
if [ -n "${SERVICE_JSON}" ]; then
  PREVIOUS_REVISION="$(
    jq -r '
      .status.traffic[]? | select(.percent == 100 or .percent == null) | .revisionName
    ' <<<"${SERVICE_JSON}" | head -n 1
  )"
  if [ -z "${PREVIOUS_REVISION}" ] || [ "${PREVIOUS_REVISION}" = "null" ]; then
    PREVIOUS_REVISION="$(
      jq -r '.status.latestReadyRevisionName // .status.traffic[0].revisionName // ""' <<<"${SERVICE_JSON}"
    )"
  fi
fi

if [ -n "${PREVIOUS_REVISION}" ] && [ "${PREVIOUS_REVISION}" != "null" ]; then
  echo "📌 Active production revision for rollback: ${PREVIOUS_REVISION}"
else
  PREVIOUS_REVISION=""
  echo "ℹ️  No existing service found; this is a first deployment."
fi

rollback_cloud_run() {
  if [ -n "${PREVIOUS_REVISION}" ]; then
    echo "🔄 Rolling back Cloud Run traffic to revision: ${PREVIOUS_REVISION}..."
    gcloud run services update-traffic "${CLOUD_RUN_SERVICE}" \
      --region="${GCP_REGION}" \
      --project="${GCP_PROJECT_ID}" \
      --to-revisions="${PREVIOUS_REVISION}=100" || true
    echo "⚠️  Cloud Run traffic rollback executed to: ${PREVIOUS_REVISION}"
  else
    echo "⚠️  No previous revision available for rollback."
  fi
}

# 3. Configure Docker Authentication for Artifact Registry
echo "🔑 Configuring Docker authentication for Artifact Registry..."
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

# 4. Ensure Artifact Registry Repository Exists
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

# 5. Build Docker Image
echo "🐳 Building backend Docker image..."
docker build \
  -t "${IMAGE_TAG}" \
  -t "${IMAGE_LATEST}" \
  -f backend/Dockerfile \
  backend/

# 6. Push Image to Artifact Registry
echo "⬆️ Pushing image to Artifact Registry..."
docker push "${IMAGE_TAG}"
docker push "${IMAGE_LATEST}"

# 7. Create Temporary Environment Variables YAML File
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

# 8. Deploy to Google Cloud Run with --env-vars-file
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

# 9. Get Deployed Service URL
SERVICE_URL="$(gcloud run services describe "${CLOUD_RUN_SERVICE}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)')"
echo "🌐 Deployed Cloud Run Service URL: ${SERVICE_URL}"

# 10. JSON-Validated Health & Functional Smoke Checks with Auto-Rollback
check_json_endpoint() {
  local url="$1"
  local expected_status="$2"
  local label="$3"
  local headers body

  headers="$(mktemp)"
  body="$(mktemp)"
  trap 'rm -f "${headers}" "${body}"' RETURN

  echo "🧪 Verifying ${label} (${url})..."

  if ! curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --dump-header "${headers}" \
    --output "${body}" \
    "${url}"; then
    echo "❌ ${label}: HTTP request failed."
    cat "${headers}" 2>/dev/null || true
    return 1
  fi

  if ! grep -qi '^content-type:.*application/json' "${headers}"; then
    echo "❌ ${label}: NON_JSON_RESPONSE — expected application/json."
    echo "Response headers:"
    cat "${headers}"
    echo "Response body (first 500 chars):"
    head -c 500 "${body}"
    return 1
  fi

  if ! jq -e --arg status "${expected_status}" '.status == $status' "${body}" >/dev/null 2>&1; then
    echo "❌ ${label}: Expected status='${expected_status}', got:"
    jq '.' "${body}" 2>/dev/null || cat "${body}"
    return 1
  fi

  echo "✓ ${label} passed (status=${expected_status}, Content-Type=application/json)."
}

SMOKE_FAILED=0

# Health Probes
check_json_endpoint "${SERVICE_URL}/api/health/live" "ok" "Liveness Probe" || SMOKE_FAILED=1
check_json_endpoint "${SERVICE_URL}/api/health/ready" "ready" "Readiness Probe" || SMOKE_FAILED=1

# Version Manifest (strict git SHA regex check)
echo "🧪 Verifying Version Manifest (${SERVICE_URL}/api/version)..."
VERSION_JSON="$(curl --fail --silent --show-error "${SERVICE_URL}/api/version" 2>/dev/null || echo "")"
if [ -z "${VERSION_JSON}" ]; then
  echo "❌ Version Manifest: HTTP request failed."
  SMOKE_FAILED=1
elif ! jq -e '
  .service == "rei-signallab-api" and
  .version == "2.1.0" and
  .apiVersion == "v1" and
  (.commitSha | test("^[0-9a-f]{7,40}$"))
' <<<"${VERSION_JSON}" >/dev/null 2>&1; then
  echo "❌ Version Manifest: Identity, version, or strict commitSha regex assertion failed."
  echo "${VERSION_JSON}" | jq '.' 2>/dev/null || echo "${VERSION_JSON}"
  SMOKE_FAILED=1
else
  echo "✓ Version Manifest passed (strict commitSha regex verified)."
fi

# Node Catalog Registry Functional Test
echo "🧪 Verifying Node Catalog Registry (${SERVICE_URL}/api/nodes)..."
NODES_JSON="$(curl --fail --silent --show-error "${SERVICE_URL}/api/nodes" 2>/dev/null || echo "")"
if ! jq -e 'type == "array" and length > 0' <<<"${NODES_JSON}" >/dev/null 2>&1; then
  echo "❌ Node Catalog Registry test failed."
  SMOKE_FAILED=1
else
  echo "✓ Node Catalog Registry functional test passed ($(jq 'length' <<<"${NODES_JSON}") registered nodes)."
fi

# Vibration Analysis DSP Engine Functional Test
echo "🧪 Verifying Vibration Analysis DSP Engine (${SERVICE_URL}/api/vibration/analyze)..."
VIB_JSON="$(curl --fail --silent --show-error \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"sample_rate": 25600, "rpm": {"manual_rpm": 1500.0}}' \
  "${SERVICE_URL}/api/vibration/analyze" 2>/dev/null || echo "")"

if ! jq -e '
  (.trust_mode | length > 0) and
  (.time_metrics.rms_acc_g | type == "number") and
  (.fft_frequencies | length > 0)
' <<<"${VIB_JSON}" >/dev/null 2>&1; then
  echo "❌ Vibration Analysis DSP Engine test failed."
  echo "${VIB_JSON}" | jq '.' 2>/dev/null || echo "${VIB_JSON}"
  SMOKE_FAILED=1
else
  echo "✓ Vibration Analysis DSP Engine functional test passed."
fi

if [ "${SMOKE_FAILED}" -ne 0 ]; then
  echo ""
  echo "================================================================="
  echo " ❌ SMOKE TEST FAILED — INITIATING AUTO-ROLLBACK"
  echo "================================================================="
  rollback_cloud_run
  exit 1
fi

echo "================================================================="
echo " 🎉 DEPLOYMENT SUCCESSFUL!"
echo "   - Service URL:     ${SERVICE_URL}"
echo "   - Live Probe:      ${SERVICE_URL}/api/health/live"
echo "   - Ready Probe:     ${SERVICE_URL}/api/health/ready"
echo "   - Version Probe:   ${SERVICE_URL}/api/version"
echo "   - Previous Rev:    ${PREVIOUS_REVISION:-'(first deploy)'}"
echo "================================================================="
