# REI SignalLab 2.1 — Live Cloud Run & Firebase Deployment Guide

This guide documents the production deployment architecture, GCP Cloud Run containerization, Firebase Hosting `/api/**` proxy rewrites, health monitoring probes, auto-rollback procedures, and CI/CD quality gates for **REI SignalLab**.

> [!IMPORTANT]
> Cloud Run and Firebase Hosting deployment infrastructure is configured. Production deployment requires the documented GCP/Firebase secrets and a successful deployment workflow run.

---

## 🏗️ 1. Target Production Architecture

```text
Browser Client
   │
   ▼
Firebase Hosting CDN (signallab.site)
   │
   ├── Static Web Assets (/assets/**, index.html) → Firebase CDN
   │
   └── API Requests (/api/**)
          │
          ▼ (Rewrite Proxy)
Google Cloud Run (rei-signallab-api in europe-west1)
          │
          ▼
FastAPI Application (Python 3.11 / Uvicorn)
```

- **Service Name**: `rei-signallab-api`
- **Default GCP Region**: `europe-west1`
- **Firebase Project**: `signallab-3305b`
- **Container Registry**: `${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/rei-signallab/rei-signallab-api:${COMMIT_SHA}`

---

## 🔐 2. Production Security & Environment Variables

### Backend Environment Variables (`backend/.env.example`)

| Variable | Recommended Value | Purpose |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | Runtime environment identifier |
| `APP_VERSION` | `2.1.0` | Application release version |
| `COMMIT_SHA` | `${GITHUB_SHA}` | Git commit hash |
| `BUILD_TIMESTAMP` | `${BUILD_TIMESTAMP}` | ISO UTC build timestamp |
| `CORS_ALLOWED_ORIGINS` | `https://signallab.site,https://www.signallab.site,https://signallab-3305b.web.app,https://signallab-3305b.firebaseapp.com` | Strict production CORS allowlist |
| `MAX_UPLOAD_BYTES` | `26214400` (25 MB) | Maximum HTTP upload payload limit |
| `MAX_SIGNAL_SAMPLES` | `2000000` | Maximum decoded signal length limit |
| `MAX_GRAPH_NODES` | `200` | Node ceiling enforced by the graph validator |
| `MAX_GRAPH_CONNECTIONS` | `500` | Connection ceiling enforced by the graph validator |
| `REQUEST_TIMEOUT_SECONDS` | `300` | Cloud Run execution timeout cap |
| `RATE_LIMIT_ENABLED` | `true` | Per-instance request throttling |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate limit window length |
| `RATE_LIMIT_DEFAULT_PER_WINDOW` | `240` | Global budget per caller per window |
| `RATE_LIMIT_COMPUTE_PER_WINDOW` | `60` | Budget for DSP / graph / export routes |
| `RATE_LIMIT_SANDBOX_PER_WINDOW` | `10` | Budget for `/api/python/execute` |
| `ENABLE_PYTHON_SANDBOX` | **`false`** | Executes user-supplied code — see below |
| `PYTHON_SANDBOX_TIMEOUT_SECONDS` | `8` | Wall-clock kill deadline for a script |
| `PYTHON_SANDBOX_MEMORY_MB` | `512` | `RLIMIT_AS` ceiling for the sandbox child |

### ⚠️ Python Scripting Sandbox

`POST /api/python/execute` runs code submitted by the caller. It is **disabled by
default whenever `APP_ENV=production`** and must be opted into explicitly with
`ENABLE_PYTHON_SANDBOX=true`.

When enabled, each request is screened by a static AST policy
(`app/sandbox/guard.py`) and then executed in a **separate short-lived process**
with a wall-clock timeout, `RLIMIT_AS` / `RLIMIT_CPU` ceilings, socket creation
disabled, and a restricted builtins namespace. No submitted code runs inside the
API worker.

Before enabling it on a public deployment:

- Run it on a **dedicated Cloud Run service** with its own service account
  holding no project permissions, so a sandbox escape gains no IAM reach.
- Set `--memory` to at least `2Gi` — the child process loads its own NumPy /
  SciPy / Matplotlib and needs headroom beyond `PYTHON_SANDBOX_MEMORY_MB`.
- Set `--execution-environment=gen2` and mount the root filesystem read-only.
- Keep `RATE_LIMIT_SANDBOX_PER_WINDOW` low and put authentication in front of it.

The layered guard raises the cost of an escape substantially, but it is not an
OS-level jail. Treat the service as untrusted and isolate it accordingly.

### Frontend Environment Variables (`frontend/.env.example`)

| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `` (empty in prod, `http://localhost:8000` in dev) | Base API path (relative `/api/**` in prod for Firebase proxying) |
| `VITE_EXPECTED_APP_VERSION` | `2.1.0` | Backend application release version check |
| `VITE_EXPECTED_API_VERSION` | `v1` | Backend API version check |

### Authentication & Secrets

The deployment pipeline uses **Workload Identity Federation** (WIF) for both Cloud Run and Firebase deployments — no long-lived service account JSON keys are stored in secrets.

Required GitHub repository secrets:

| Secret | Purpose |
| :--- | :--- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name |
| `GCP_SERVICE_ACCOUNT` | Google service account email for WIF |
| `GCP_PROJECT_ID` | GCP project ID (`signallab-3305b`) |

#### First-time setup

[`scripts/setup-github-wif.sh`](../scripts/setup-github-wif.sh) provisions all
of this in one run — deployer service account, roles, WIF pool and OIDC provider
scoped to this repository — and prints the three secret values:

```bash
gcloud auth login
./scripts/setup-github-wif.sh
```

The provider is created with an `attribute-condition` pinning it to
`rootcastleco/rei-signallab`. Without that condition any GitHub repository could
mint tokens for the deployer account, so do not remove it.

The script is idempotent and safe to re-run.

---

## 🚀 3. Manual Cloud Run Deployment

You can deploy the backend manually using the automated deployment script [`scripts/deploy-cloud-run.sh`](file:///c:/Appdev/rei-signallab/scripts/deploy-cloud-run.sh):

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project signallab-3305b

# 2. Run Deployment Script
GCP_PROJECT_ID=signallab-3305b GCP_REGION=europe-west1 ./scripts/deploy-cloud-run.sh
```

The script automatically:
1. Validates GCP authentication.
2. Captures the previous active Cloud Run revision for auto-rollback.
3. Ensures Artifact Registry repository `rei-signallab` exists.
4. Builds the production Docker container from [`backend/Dockerfile`](file:///c:/Appdev/rei-signallab/backend/Dockerfile).
5. Pushes container tags to Artifact Registry.
6. Passes environment variables via `--env-vars-file` (YAML) to avoid comma-delimiter conflicts.
7. Deploys to Google Cloud Run with 2 GiB RAM, 2 CPUs, 300s timeout, max 5 instances, non-root user.
8. Verifies `/api/health/live`, `/api/health/ready`, and `/api/version` with JSON content-type validation.
9. **Automatically rolls back to the previous revision** if any smoke test fails.

---

## ⚡ 4. Firebase Hosting Rewrites Configuration

In [`firebase.json`](file:///c:/Appdev/rei-signallab/firebase.json), the `/api/**` rewrite **must** be declared BEFORE the wildcard `**` SPA rewrite:

```json
{
  "hosting": {
    "public": "frontend/dist",
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "rei-signallab-api",
          "region": "europe-west1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

> [!NOTE]
> `pinTag: true` is deliberately omitted from `firebase.json` so that Firebase Hosting dynamically proxies all `/api/**` traffic to Cloud Run's active 100% traffic revision. When `gcloud run services update-traffic` rolls back Cloud Run to the previous revision upon a smoke test failure, Firebase Hosting traffic is immediately rolled back with zero latency!

Deploy hosting updates:

```bash
npx firebase-tools deploy --only hosting --project signallab-3305b --non-interactive
```

---

## 🧪 5. Health Monitoring & Smoke Test Verification

After deployment, verify the live endpoints with **JSON content-type validation**:

```bash
# JSON-validated health check function
check_json_endpoint() {
  local url="$1"
  local expected_status="$2"
  local headers body

  headers="$(mktemp)"
  body="$(mktemp)"
  trap 'rm -f "${headers}" "${body}"' RETURN

  curl --fail --silent --show-error --location \
    --dump-header "${headers}" --output "${body}" "${url}"

  grep -qi '^content-type:.*application/json' "${headers}" || {
    echo "NON_JSON_RESPONSE: ${url}"
    exit 1
  }

  jq -e --arg status "${expected_status}" '.status == $status' "${body}" >/dev/null
}

# 1. Live Probe
check_json_endpoint "https://signallab.site/api/health/live" "ok"

# 2. Ready Probe
check_json_endpoint "https://signallab.site/api/health/ready" "ready"

# 3. Version Manifest (full identity + version + commit validation)
VERSION_JSON="$(curl --fail --silent --show-error https://signallab.site/api/version)"
jq -e '
  .service == "rei-signallab-api" and
  .version == "2.1.0" and
  .apiVersion == "v1" and
  (.commitSha | length > 0)
' <<<"${VERSION_JSON}" >/dev/null
```

### Verification Criteria
- Status: `HTTP 200 OK`
- Header: `Content-Type: application/json` (not `text/html`)
- Body: Valid JSON payload (no `<!DOCTYPE html>` or `index.html`)
- Version manifest: `service == "rei-signallab-api"`, `version == "2.1.0"`, `apiVersion == "v1"`, `commitSha` is non-empty

---

## 🔄 6. Auto-Rollback & Manual Rollback Procedures

### Automatic Rollback (CI/CD Pipeline)

The deployment script captures the previous active Cloud Run revision before deploying. If smoke tests fail (HTTP error, non-JSON content-type, or assertion failure), the script automatically shifts 100% traffic back to the previous revision:

```bash
# Automatic during deploy script:
gcloud run services update-traffic rei-signallab-api \
  --region=europe-west1 \
  --project=signallab-3305b \
  --to-revisions="${PREVIOUS_REVISION}=100"
```

### Manual Cloud Run Rollback

```bash
# 1. List previous revisions
gcloud run revisions list --service=rei-signallab-api --region=europe-west1 --project=signallab-3305b

# 2. Shift 100% traffic to previous known-good revision
gcloud run services update-traffic rei-signallab-api \
  --region=europe-west1 \
  --project=signallab-3305b \
  --to-revisions=rei-signallab-api-00012-abc=100
```

### Firebase Hosting Rollback

```bash
# Roll back to previous hosting version via Firebase Console
# Console: Hosting -> Release History -> Rollback
```

---

## 🛡️ 7. Frontend Handshake State Machine

The frontend runs `verifyBackendHandshake()` on application mount, which validates:

1. **Readiness** — `GET /api/health/ready` returns `{ "status": "ready" }`
2. **Service identity** — `GET /api/version` returns `{ "service": "rei-signallab-api" }`
3. **Version compatibility** — `version` and `apiVersion` match expected values
4. **Build provenance** — `commitSha` is set and not `"environment-derived"`

The titlebar displays one of these states:

| State | Badge | Meaning |
| :--- | :--- | :--- |
| `CHECKING` | `CONNECTING...` (grey) | Handshake in progress |
| `API_VERIFIED` | `✓ API VERIFIED` (green) | All checks passed |
| `API_VERSION_MISMATCH` | `⚠ VERSION MISMATCH` (orange) | Version incompatibility |
| `BACKEND_IDENTITY_MISMATCH` | `✗ IDENTITY MISMATCH` (red) | Wrong service identity |
| `BACKEND_BUILD_UNVERIFIED` | `⚠ BUILD UNVERIFIED` (orange) | Missing commit SHA |
| `BACKEND_UNAVAILABLE` | `✗ BACKEND UNAVAILABLE` (red) | Backend unreachable |

---

## 🔧 8. CI/CD Quality Gates

### Pull Request CI (`.github/workflows/ci.yml`)

Runs on every pull request to `main`:

1. **Backend Pytest Suite** — 42 golden precision tests
2. **Frontend Vite Build** — Production bundle compilation
3. **Docker Container Startup Test** — Builds image, starts container, polls `/api/health/ready`

### Production CD (`.github/workflows/deploy.yml`)

Runs on push to `main`:

1. **Build & Test** — Pytest + Docker startup test + Vite build
2. **Deploy Cloud Run** — Captures previous revision, deploys new image
3. **Deploy Firebase** — Builds frontend, deploys hosting with API rewrites
4. **Production Smoke Test** — JSON content-type validated health checks with auto-rollback on failure
