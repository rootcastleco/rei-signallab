"""
Child-process interpreter for the Python DSP sandbox.

Executed as ``python -m app.sandbox.runner``. Reads a JSON job from stdin,
runs the script under OS resource limits in a stripped namespace, and writes a
JSON result to stdout after a sentinel line.

Running out-of-process is what makes the timeout and memory ceiling real: the
parent can kill this process, and a runaway allocation takes down the child
rather than the API worker.
"""

import base64
import io
import json
import sys
from typing import Any, Dict, List

RESULT_SENTINEL = "__REI_SANDBOX_RESULT__"


def _apply_resource_limits(memory_mb: int, cpu_seconds: int) -> List[str]:
    """Apply POSIX rlimits. Returns the names of limits that could not be set."""
    unavailable: List[str] = []
    try:
        import resource  # POSIX only; absent on Windows dev machines.
    except ImportError:
        return ["resource_module"]

    if memory_mb >= 256:
        try:
            limit_bytes = memory_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (limit_bytes, limit_bytes))
        except (ValueError, OSError):
            unavailable.append("RLIMIT_AS")

    if cpu_seconds > 0:
        try:
            resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
        except (ValueError, OSError):
            unavailable.append("RLIMIT_CPU")

    try:
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    except (ValueError, OSError):
        unavailable.append("RLIMIT_CORE")

    return unavailable


def _disable_network() -> None:
    """Neutralise socket creation inside the child."""
    try:
        import socket
    except ImportError:
        return

    def _blocked(*_args, **_kwargs):
        raise PermissionError("Network access is disabled in the DSP sandbox.")

    socket.socket = _blocked  # type: ignore[assignment]
    socket.create_connection = _blocked  # type: ignore[assignment]
    socket.create_server = _blocked  # type: ignore[assignment]


SAFE_BUILTIN_NAMES = (
    "abs", "all", "any", "bin", "bool", "bytes", "callable", "chr", "complex",
    "dict", "divmod", "enumerate", "filter", "float", "format", "frozenset",
    "hex", "int", "isinstance", "issubclass", "iter", "len", "list", "map",
    "max", "min", "next", "object", "oct", "ord", "pow", "print", "range",
    "repr", "reversed", "round", "set", "slice", "sorted", "str", "sum",
    "tuple", "type", "zip",
    "ArithmeticError", "AssertionError", "AttributeError", "Exception",
    "IndexError", "KeyError", "MemoryError", "NameError", "OverflowError",
    "RuntimeError", "StopIteration", "TypeError", "ValueError",
    "ZeroDivisionError",
)


def _build_namespace(np, scipy_signal, plt, matplotlib) -> Dict[str, Any]:
    import builtins

    safe_builtins = {
        name: getattr(builtins, name) for name in SAFE_BUILTIN_NAMES if hasattr(builtins, name)
    }

    # `import` statements are pre-screened by the AST guard; the runtime hook
    # re-checks the allowlist so a bypass of one layer is not sufficient.
    from app.sandbox.guard import ALLOWED_IMPORT_ROOTS

    real_import = builtins.__import__

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        if level:
            raise ImportError("Relative imports are not permitted in the DSP sandbox.")
        if name.split(".")[0] not in ALLOWED_IMPORT_ROOTS:
            raise ImportError(f"Import of module '{name}' is not permitted in the DSP sandbox.")
        return real_import(name, globals, locals, fromlist, level)

    safe_builtins["__import__"] = guarded_import

    return {
        "__builtins__": safe_builtins,
        "__name__": "rei_sandbox_script",
        "np": np,
        "numpy": np,
        "scipy_signal": scipy_signal,
        "signal": scipy_signal,
        "plt": plt,
        "matplotlib": matplotlib,
        "t": None,
        "raw_signal": None,
        "filtered_signal": None,
        "output_signal": None,
        "sample_rate": 44100,
    }


def _to_float_list(value: Any, np) -> List[float]:
    array = np.asarray(value, dtype=np.float64)
    if array.ndim == 0:
        return [float(array)]
    return array.ravel().tolist()


def run_job(job: Dict[str, Any]) -> Dict[str, Any]:
    code = job.get("code", "")
    max_output_bytes = int(job.get("max_output_bytes", 8 * 1024 * 1024))

    import numpy as np
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from scipy import signal as scipy_signal

    plt.close("all")
    plt.style.use("dark_background")
    plt.figure(figsize=(9, 4), dpi=100)

    namespace = _build_namespace(np, scipy_signal, plt, matplotlib)

    # Host-supplied inputs are injected as values rather than spliced into the
    # source, so a large signal vector does not inflate the script past the
    # size cap (and cannot alter how the script parses).
    for key, value in (job.get("variables") or {}).items():
        if isinstance(key, str) and key.isidentifier() and not key.startswith("_"):
            namespace[key] = np.asarray(value, dtype=np.float64) if isinstance(value, list) else value

    logs: List[str] = []
    plot_base64 = None
    stdout_buffer = io.StringIO()
    real_stdout = sys.stdout

    try:
        sys.stdout = stdout_buffer
        exec(compile(code, "<dsp-script>", "exec"), namespace)  # noqa: S102 - guarded above
    except BaseException as exc:  # noqa: BLE001 - surfaced to the caller as a log line
        sys.stdout = real_stdout
        plt.close("all")
        return {
            "status": "error",
            "logs": [f"Python Execution Error: {type(exc).__name__}: {exc}"],
            "plot_base64": None,
            "time": [],
            "raw_signal": [],
            "filtered_signal": [],
            "output_signal": None,
        }
    finally:
        sys.stdout = real_stdout

    console_out = stdout_buffer.getvalue()
    if len(console_out) > max_output_bytes:
        console_out = console_out[:max_output_bytes] + "\n[Output Truncated: size cap exceeded]"

    if console_out.strip():
        logs.extend(console_out.strip().splitlines()[:200])
    else:
        logs.append("Python DSP Script executed successfully.")

    try:
        figure = plt.gcf()
        if len(figure.axes) > 0:
            figure.patch.set_facecolor("#0D1117")
            buffer = io.BytesIO()
            plt.savefig(buffer, format="png", bbox_inches="tight", facecolor=figure.get_facecolor())
            plot_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    finally:
        plt.close("all")

    time_vector = _to_float_list(namespace["t"], np) if namespace.get("t") is not None else []
    raw_signal = _to_float_list(namespace["raw_signal"], np) if namespace.get("raw_signal") is not None else []

    if namespace.get("filtered_signal") is not None:
        filtered_signal = _to_float_list(namespace["filtered_signal"], np)
    else:
        filtered_signal = list(raw_signal)

    # `output_signal` is the convention used by the graph's sandbox node; it is
    # reported separately so the node can tell "script produced nothing" apart
    # from "script echoed its input".
    output_signal = (
        _to_float_list(namespace["output_signal"], np)
        if namespace.get("output_signal") is not None
        else None
    )

    return {
        "status": "success",
        "logs": logs,
        "plot_base64": plot_base64,
        "time": time_vector,
        "raw_signal": raw_signal,
        "filtered_signal": filtered_signal,
        "output_signal": output_signal,
    }


def main() -> int:
    raw_job = sys.stdin.read()
    try:
        job = json.loads(raw_job)
    except json.JSONDecodeError as exc:
        result = {"status": "error", "logs": [f"Sandbox job decode failure: {exc}"]}
    else:
        _apply_resource_limits(
            memory_mb=int(job.get("memory_mb", 768)),
            cpu_seconds=int(job.get("cpu_seconds", 10)),
        )
        _disable_network()
        try:
            result = run_job(job)
        except MemoryError:
            result = {"status": "error", "logs": ["Sandbox memory limit exceeded."]}
        except BaseException as exc:  # noqa: BLE001
            result = {"status": "error", "logs": [f"Sandbox failure: {type(exc).__name__}: {exc}"]}

    result.setdefault("plot_base64", None)
    result.setdefault("time", [])
    result.setdefault("raw_signal", [])
    result.setdefault("filtered_signal", [])
    result.setdefault("output_signal", None)

    sys.stdout.write("\n" + RESULT_SENTINEL + "\n")
    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
