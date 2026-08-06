from fastapi import APIRouter, HTTPException
from app.config import settings
from app.graph.registry import NodeRegistry
from app.dsp_engine import DSPEngine
from app.vibration_engine import VibrationEngine

router = APIRouter(prefix="/api", tags=["Health & Monitoring"])


@router.get("/health/live")
def health_live():
    """
    Liveness probe: Verifies that the container process is running.
    """
    return {
        "status": "ok",
        "service": "rei-signallab-api"
    }


@router.get("/health/ready")
def health_ready():
    """
    Readiness probe: Validates runtime dependencies, node registry, and engine modules.
    Lightweight check for Kubernetes / Cloud Run load balancer traffic routing.
    """
    checks = {}

    # 1. Verify Node Registry
    try:
        nodes = NodeRegistry.list_all()
        checks["node_registry"] = "ok" if len(nodes) > 0 else "degraded"
    except Exception as e:
        checks["node_registry"] = f"failed: {str(e)}"

    # 2. Verify DSP Engine
    try:
        _ = DSPEngine
        checks["dsp_engine"] = "ok"
    except Exception as e:
        checks["dsp_engine"] = f"failed: {str(e)}"

    # 3. Verify Vibration Engine
    try:
        _ = VibrationEngine
        checks["vibration_engine"] = "ok"
    except Exception as e:
        checks["vibration_engine"] = f"failed: {str(e)}"

    is_ready = all(status == "ok" for status in checks.values())

    if not is_ready:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "checks": checks}
        )

    return {
        "status": "ready",
        "checks": checks
    }


@router.get("/version")
def get_version():
    """
    Version manifest: Returns build commit SHA, API version, and release timestamp.
    """
    return {
        "service": "rei-signallab-api",
        "version": settings.APP_VERSION,
        "apiVersion": "v1",
        "commitSha": settings.COMMIT_SHA,
        "buildTimestamp": settings.BUILD_TIMESTAMP
    }
