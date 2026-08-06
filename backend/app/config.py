import os
from typing import List


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
    _cors_raw: str = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "https://signallab-3305b.web.app,https://signallab-3305b.firebaseapp.com,http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def CORS_ALLOWED_ORIGINS(self) -> List[str]:
        if not self._cors_raw:
            return ["https://signallab-3305b.web.app", "https://signallab-3305b.firebaseapp.com", "http://localhost:5173"]
        return [origin.strip() for origin in self._cors_raw.split(",") if origin.strip()]

    # Resource & Request Limits
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", 26214400))  # 25 MB
    MAX_SIGNAL_SAMPLES: int = int(os.getenv("MAX_SIGNAL_SAMPLES", 2000000))  # 2M samples
    MAX_GRAPH_NODES: int = int(os.getenv("MAX_GRAPH_NODES", 200))
    MAX_GRAPH_CONNECTIONS: int = int(os.getenv("MAX_GRAPH_CONNECTIONS", 500))
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", 300))

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
