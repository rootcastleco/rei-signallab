"""
Parent-side driver for the Python DSP scripting sandbox.

Scripts are screened by the AST guard and then executed in a short-lived child
process (`app.sandbox.runner`) with a wall-clock timeout and OS resource limits.
Nothing from a submitted script runs inside the API worker.
"""

import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import settings
from app.sandbox.guard import SandboxPolicyError, validate_script
from app.sandbox.runner import RESULT_SENTINEL

logger = logging.getLogger("python_sandbox_engine")

#: Directory containing the `app` package (i.e. `backend/`), used as the
#: child's working directory so that `python -m app.sandbox.runner` resolves.
_PACKAGE_PARENT = Path(__file__).resolve().parents[1]


def _failure(message: str) -> Dict[str, Any]:
    return {
        "status": "error",
        "logs": [message],
        "plot_base64": None,
        "time": [],
        "raw_signal": [],
        "filtered_signal": [],
        "output_signal": None,
    }


class PythonDSPEngine:
    """
    Out-of-process Python DSP scripting sandbox.

    Executes user scripts under a static AST policy, a wall-clock timeout, a
    memory ceiling and a restricted namespace, then returns captured console
    output, an optional rendered Matplotlib figure, and any signal vectors the
    script assigned to `t`, `raw_signal` and `filtered_signal`.
    """

    @staticmethod
    def execute_script(
        script_code: str, variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        return PythonDSPEngine.execute_python_script(script_code, variables)

    @staticmethod
    def execute_python_script(
        script_code: str, variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run ``script_code`` in the isolated interpreter.

        ``variables`` are injected into the script's namespace as values — use
        it instead of formatting data into the source, which both inflates the
        script past the size cap and lets data influence parsing.
        """
        if not settings.ENABLE_PYTHON_SANDBOX:
            return _failure(
                "Python DSP Sandbox is disabled on this deployment. "
                "Set ENABLE_PYTHON_SANDBOX=true on an isolated instance to enable it."
            )

        try:
            validate_script(script_code, max_bytes=settings.PYTHON_SANDBOX_MAX_CODE_BYTES)
        except SandboxPolicyError as exc:
            return _failure(f"Security Violation: {exc}")

        job = json.dumps(
            {
                "code": script_code,
                "variables": variables or {},
                "memory_mb": settings.PYTHON_SANDBOX_MEMORY_MB,
                "cpu_seconds": int(settings.PYTHON_SANDBOX_TIMEOUT_SECONDS) + 2,
                "max_output_bytes": settings.PYTHON_SANDBOX_MAX_OUTPUT_BYTES,
            }
        )

        child_env = {
            key: value
            for key, value in os.environ.items()
            if key in ("PATH", "LANG", "LC_ALL", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR")
        }
        child_env["PYTHONPATH"] = str(_PACKAGE_PARENT)
        child_env["PYTHONDONTWRITEBYTECODE"] = "1"
        child_env["MPLBACKEND"] = "Agg"

        try:
            completed = subprocess.run(
                [sys.executable, "-m", "app.sandbox.runner"],
                input=job,
                capture_output=True,
                text=True,
                cwd=str(_PACKAGE_PARENT),
                env=child_env,
                timeout=settings.PYTHON_SANDBOX_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return _failure(
                f"Execution Timeout: script exceeded the "
                f"{settings.PYTHON_SANDBOX_TIMEOUT_SECONDS:g}s sandbox limit and was terminated."
            )
        except OSError as exc:
            logger.error("Sandbox subprocess could not be started: %s", exc, exc_info=True)
            return _failure("Sandbox Unavailable: the isolated interpreter could not be started.")

        result = _parse_child_output(completed.stdout)
        if result is not None:
            return result

        logger.error(
            "Sandbox child produced no parsable result (exit=%s stderr=%s)",
            completed.returncode,
            completed.stderr[-2000:],
        )
        if completed.returncode and completed.returncode < 0:
            return _failure(
                f"Sandbox Terminated: the interpreter was killed by signal {-completed.returncode} "
                "(most likely the memory or CPU limit)."
            )
        return _failure("Sandbox Failure: the isolated interpreter returned no result.")


def _parse_child_output(stdout: str) -> Optional[Dict[str, Any]]:
    """Extract the JSON payload written after the runner's sentinel line."""
    marker = f"\n{RESULT_SENTINEL}\n"
    index = stdout.rfind(marker)
    if index == -1:
        return None
    try:
        payload = json.loads(stdout[index + len(marker):])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


PythonSandboxEngine = PythonDSPEngine
