# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :x:                |
| < 2.0   | :x:                |

## Reporting a Vulnerability

Report suspected vulnerabilities privately via [GitHub Security Advisories](https://github.com/rootcastleco/rei-signallab/security/advisories/new),
or by email to the maintainer listed on [rootcastle.com](https://rootcastle.com).
Please do not open a public issue for an unpatched vulnerability.

Include the affected endpoint or component, reproduction steps, and the impact
you were able to demonstrate. Expect an acknowledgement within 5 working days
and a status update at least every 10 working days until resolution.

## Security Model

### Trust boundary

The API accepts unauthenticated requests. Every endpoint must therefore treat
its input as hostile. Request bodies are validated by Pydantic schemas, upload
and sample counts are capped by `MAX_UPLOAD_BYTES` / `MAX_SIGNAL_SAMPLES`, graph
size is capped by `MAX_GRAPH_NODES` / `MAX_GRAPH_CONNECTIONS`, and every route
is subject to per-instance rate limiting.

### Python scripting sandbox

`POST /api/python/execute` executes user-supplied Python. It is the highest-risk
surface in the project and is **disabled by default under `APP_ENV=production`**.

Defence is layered:

1. **Static AST policy** (`backend/app/sandbox/guard.py`) — rejects imports
   outside a numeric/plotting allowlist, all dunder access (which is what makes
   `().__class__.__base__.__subclasses__()` traversal possible), and the
   reflection and code-loading builtins.
2. **Process isolation** (`backend/app/sandbox/runner.py`) — execution happens in
   a child process under `RLIMIT_AS` and `RLIMIT_CPU`, with a parent-enforced
   wall-clock timeout, socket creation disabled and a restricted builtins map.
3. **Kill switch** — `ENABLE_PYTHON_SANDBOX` gates the feature entirely.

This is a hardened interpreter, **not an OS-level jail**. If you enable the
sandbox on a public deployment, isolate it as described in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md#-python-scripting-sandbox).

Sandbox-escape reports are considered valid vulnerabilities against a
deployment configured per that guidance. Regression coverage for known escape
classes lives in `backend/tests/test_security_golden.py`.

### Rate limiting

Limits are enforced per Cloud Run instance and are keyed on client IP. Traffic
spread across many instances multiplies the effective quota — treat this as
protection against a single client saturating one instance's CPU, not as a
distributed quota.
