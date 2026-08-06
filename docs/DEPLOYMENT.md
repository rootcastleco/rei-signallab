# REI SignalLab 2.1 — Live Cloud Run & Firebase Deployment Guide

This guide documents the production deployment architecture, GCP Cloud Run containerization, Firebase Hosting `/api/**` proxy rewrites, health monitoring probes, and revision rollback procedures for **REI SignalLab**.

---

## 🏗️ 1. Target Production Architecture

```text
Browser Client
   │
   ▼
Firebase Hosting CDN (signallab-3305b.web.app)
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
| `CORS_ALLOWED_ORIGINS` | `https://signallab-3305b.web.app,https://signallab-3305b.firebaseapp.com,http://localhost:5173` | Strict production CORS allowlist |
| `MAX_UPLOAD_BYTES` | `26214400` (25 MB) | Maximum HTTP upload payload limit |
| `MAX_SIGNAL_SAMPLES` | `2000000` | Maximum decoded signal length limit |
| `REQUEST_TIMEOUT_SECONDS` | `300` | Cloud Run execution timeout cap |

### Frontend Environment Variables (`frontend/.env.example`)

| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `` (empty in prod, `http://localhost:8000` in dev) | Base API path (relative `/api/**` in prod for Firebase proxying) |
| `VITE_EXPECTED_API_VERSION` | `2.1.0` | Handshake version verification |

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
2. Ensures Artifact Registry repository `rei-signallab` exists.
3. Builds the production Docker container from [`backend/Dockerfile`](file:///c:/Appdev/rei-signallab/backend/Dockerfile).
4. Pushes container tags to Artifact Registry.
5. Deploys to Google Cloud Run with 2 GiB RAM, 2 CPUs, 300s timeout, max 5 instances, non-root user.
6. Verifies `/api/health/live` and `/api/health/ready` endpoints.

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

Deploy hosting updates:

```bash
npx firebase deploy --only hosting
```

---

## 🧪 5. Health Monitoring & Smoke Test Verification

After deployment, verify the live endpoints via curl:

```bash
# 1. Live Probe
curl -i https://signallab-3305b.web.app/api/health/live

# 2. Ready Probe
curl -i https://signallab-3305b.web.app/api/health/ready

# 3. Version Manifest
curl -i https://signallab-3305b.web.app/api/version

# 4. Vibration Demo Analysis API Test
curl -i -X POST https://signallab-3305b.web.app/api/vibration/analyze \
  -H "Content-Type: application/json" \
  -d '{"sample_rate": 25600, "rpm": {"manual_rpm": 1500.0}}'
```

### Verification Criteria
- Status: `HTTP 200 OK`
- Header: `Content-Type: application/json`
- Body: Valid JSON payload (no `<!DOCTYPE html>` or `index.html`).

---

## 🔄 6. Revision Rollback Procedures

### Google Cloud Run Rollback

If a backend revision exhibits runtime failures:

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

If a frontend bundle release breaks compatibility:

```bash
# 1. View deployment history in Firebase Console or CLI
firebase hosting:channels:list

# 2. Roll back to previous hosting version via Firebase Console
# Console: Hosting -> Release History -> Rollback
```
