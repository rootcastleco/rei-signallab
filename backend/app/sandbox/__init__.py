"""
Python scripting sandbox for REI SignalLab.

Layered defence:
  1. `guard.py`  — static AST analysis rejecting escapes before any execution.
  2. `runner.py` — child-process interpreter with rlimits and a stripped namespace.
  3. `config.ENABLE_PYTHON_SANDBOX` — kill switch, off by default in production.
"""

from .guard import SandboxPolicyError, validate_script

__all__ = ["SandboxPolicyError", "validate_script"]
