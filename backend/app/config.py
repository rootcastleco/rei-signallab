import os
from typing import List


def _env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    """
    Application Configuration Settings for REI SignalLab FastAPI Engine.
    Parses environment variables with production-ready defaults.
    """
    APP_ENV: str = os.getenv("APP_ENV", "production")
    APP_VERSION: str = os.getenv("APP_VERSION", "2.1.0")
    COMMIT_SHA: str = os.getenv("COMMIT_SHA", "environment-derived")
    BUILD_TIMESTAMP: str = os.getenv("BUILD_TIMESTAMP", "environment-derived")

    # CORS Allowlist
    # signallab.site is the primary origin; the Firebase URLs remain live as
    # mirrors. Both dev ports are listed because vite.config.js serves on 3000
    # while 5173 is Vite's own default.
    _DEFAULT_CORS_ORIGINS: List[str] = [
        "https://signallab.site",
        "https://www.signallab.site",
        "https://signallab-3305b.web.app",
        "https://signallab-3305b.firebaseapp.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    _cors_raw: str = os.getenv("CORS_ALLOWED_ORIGINS", "")

    @property
    def CORS_ALLOWED_ORIGINS(self) -> List[str]:
        if not self._cors_raw:
            return list(self._DEFAULT_CORS_ORIGINS)
        return [origin.strip() for origin in self._cors_raw.split(",") if origin.strip()]

    # Resource & Request Limits
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", 26214400))  # 25 MB
    MAX_SIGNAL_SAMPLES: int = int(os.getenv("MAX_SIGNAL_SAMPLES", 2000000))  # 2M samples
    MAX_GRAPH_NODES: int = int(os.getenv("MAX_GRAPH_NODES", 200))
    MAX_GRAPH_CONNECTIONS: int = int(os.getenv("MAX_GRAPH_CONNECTIONS", 500))
    # Each sandbox node spawns its own interpreter, so a graph full of them is a
    # cheap way to buy MAX_GRAPH_NODES x timeout seconds of CPU per request.
    MAX_SANDBOX_NODES_PER_GRAPH: int = int(os.getenv("MAX_SANDBOX_NODES_PER_GRAPH", 4))
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", 300))

    # Python Scripting Sandbox.
    # The sandbox executes user-supplied code. It is disabled by default in production
    # and must be opted into explicitly via ENABLE_PYTHON_SANDBOX=true.
    ENABLE_PYTHON_SANDBOX: bool = _env_flag("ENABLE_PYTHON_SANDBOX", APP_ENV != "production")
    PYTHON_SANDBOX_TIMEOUT_SECONDS: float = float(os.getenv("PYTHON_SANDBOX_TIMEOUT_SECONDS", 8.0))
    PYTHON_SANDBOX_MEMORY_MB: int = int(os.getenv("PYTHON_SANDBOX_MEMORY_MB", 512))
    PYTHON_SANDBOX_MAX_CODE_BYTES: int = int(os.getenv("PYTHON_SANDBOX_MAX_CODE_BYTES", 100000))
    PYTHON_SANDBOX_MAX_OUTPUT_BYTES: int = int(os.getenv("PYTHON_SANDBOX_MAX_OUTPUT_BYTES", 8388608))  # 8 MB

    # Rate Limiting (per-instance, fixed window keyed on client IP)
    RATE_LIMIT_ENABLED: bool = _env_flag("RATE_LIMIT_ENABLED", True)
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", 60))
    RATE_LIMIT_DEFAULT_PER_WINDOW: int = int(os.getenv("RATE_LIMIT_DEFAULT_PER_WINDOW", 240))
    RATE_LIMIT_COMPUTE_PER_WINDOW: int = int(os.getenv("RATE_LIMIT_COMPUTE_PER_WINDOW", 60))
    RATE_LIMIT_SANDBOX_PER_WINDOW: int = int(os.getenv("RATE_LIMIT_SANDBOX_PER_WINDOW", 10))

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
