# AISTATE — REI SignalLab Engineering Log

Running record of AI-assisted work on this repository: what was changed, why,
what was verified, and what is still open. Newest session first.

---

## Session 2026-08-06 — Hardening Pass (Phases 1–3)

Starting point: 44 backend tests, 0 frontend tests, no linter, an
unauthenticated remote-code-execution endpoint in production.
Ending point: 118 backend tests, 17 frontend tests, lint + audit gates in CI,
RCE closed.

### Phase 1 — Security hardening

**`/api/python/execute` was a working RCE.** The endpoint ran caller-supplied
code with `exec()` inside the API worker. Its protection was a substring
blacklist (`'import os' in code`) plus a small import blocklist — both trivially
bypassed by `__import__('o'+'s')`, `__import__('importlib').import_module('os')`,
or `().__class__.__base__.__subclasses__()`. The service is public and
unauthenticated.

Replaced with three layers:

| Layer | Location |
| :--- | :--- |
| Static AST policy — import allowlist, all dunder access, reflection/code-loading builtins | `backend/app/sandbox/guard.py` |
| Child-process interpreter — `RLIMIT_AS` + `RLIMIT_CPU`, parent wall-clock timeout, sockets disabled, restricted builtins | `backend/app/sandbox/runner.py` |
| Kill switch — `ENABLE_PYTHON_SANDBOX`, defaults **off** when `APP_ENV=production` | `backend/app/config.py` |

No caller-supplied code runs in the API worker any more. 28 escape attempts are
pinned as regression tests in `backend/tests/test_security_golden.py`.

**Resource limits were declared but never read.** `MAX_GRAPH_NODES`,
`MAX_GRAPH_CONNECTIONS` and `REQUEST_TIMEOUT_SECONDS` existed in `config.py`
with zero usages. The graph limits are now enforced in
`backend/app/graph/validator.py` before any per-node work happens.

**No rate limiting existed.** Added a dependency-free fixed-window limiter
(`backend/app/ratelimit.py`): global 240/min, compute 60/min, sandbox 10/min,
keyed on client IP with a `Retry-After` header. Per-instance, not distributed —
a shared store is the next step if traffic spreads across many instances.

**Eight vibration routes took `req: dict`**, bypassing validation and OpenAPI.
All now use Pydantic models; four of the schemas already existed in
`vibration_schemas.py` and were simply unused.

Found while working:

- `sandbox.python_exec` is a **second** path into the sandbox via
  `/api/graph/execute`. Covered by the kill switch (it lives in the engine), and
  capped further by `MAX_SANDBOX_NODES_PER_GRAPH=4` — 200 nodes x 8s would
  otherwise be purchasable in one request.
- That node was already broken: it read `res["data"]`, a key the engine never
  returned, so it silently passed its input through. Fixed, and the input signal
  is now injected as a value instead of being formatted into the source.
- A test caught `main.py` dropping `exc.headers`, which stripped `Retry-After`
  off 429 responses.
- `httpx` is required by `fastapi.testclient` but appeared in no requirements
  file. Added `backend/requirements-dev.txt`.

### Phase 2 — Quality gates

`package.json` declared `lint`, `typecheck` and `test` scripts, but eslint,
typescript and vitest were not installed, no eslint config existed, and there
were zero test files. CI only ran `npm run build`.

- **Vitest + Testing Library + jsdom** installed; 17 tests covering
  `src/config.js` — the API error envelope, non-JSON/stale-cache rejection,
  timeout and network mapping, and all six backend-handshake states.
- **ESLint 9 flat config** added. First run: 153 problems, but **zero**
  `no-undef` and zero React hook-rule violations — no real defects.
  Defect-class rules are errors; the ~145 pre-existing findings (unused vars,
  unescaped entities) are warnings so the gate could go live immediately.
  `--fix` changed nothing, so no mechanical edits landed in this commit.
- `typecheck` script removed — it invoked `tsc` on a codebase with no
  TypeScript and no tsconfig.
- CI and CD now run lint + vitest before build.
- **Dependency auditing** added: `pip-audit` and `npm audit` in CI, plus
  `.github/dependabot.yml`.
  - `firebase` 10 -> 12 cleared a high-severity `undici` advisory. The app only
    uses `initializeApp` + `getAnalytics`; the vulnerable auth/firestore/storage
    subtree was unused baggage.
  - `pytest` was pinned in **production** `requirements.txt` (shipped in the
    container) and carried PYSEC-2026-1845. Moved to dev requirements at
    `>=9.0.3`; all 118 tests pass on pytest 9.
  - Remaining: `esbuild <=0.24.2` (moderate, dev-only, via vite 5). Fixing it
    means a vite 5 -> 7 major bump; deferred, tracked by Dependabot.

### Phase 3 — Documentation accuracy

The docs advertised things that do not exist:

- `WS /ws/stream` — the string `websocket` appears nowhere in the backend.
- `POST /api/render/plot` — not a route.
- "35+ canonical nodes" — the registry holds **69**.

All corrected, and `backend/tests/test_docs_contract_golden.py` now asserts that
every `/api/...` path named in README/WIKI/DEPLOYMENT is actually served, that no
doc promises a WebSocket route, and that node-count claims match the registry.

`SECURITY.md` was still GitHub's unedited template, listing supported versions
(`5.1.x`, `4.0.x`) that never existed. Rewritten with the real threat model.

### Domain migration

`signallab.site` is now the primary origin. The Firebase URLs are kept as
mirrors. Updated: backend CORS defaults, `deploy-cloud-run.sh` env block,
`deploy.yml` `LIVE_URL`, README, WIKI, DEPLOYMENT.

Also added `http://localhost:3000` to the CORS defaults — `vite.config.js` serves
on 3000 while only 5173 was allowlisted, so `npm run dev` hit a CORS wall.

### Verification

| Check | Result |
| :--- | :--- |
| Backend pytest | 118 passed, 0 warnings |
| Frontend vitest | 17 passed |
| ESLint | 0 errors, 145 warnings |
| Vite build | succeeds, 450 kB / 116 kB gzip |
| `pip-audit` (prod) | no known vulnerabilities |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Sandbox, `APP_ENV=production` | disabled, returns 403 |
| Sandbox, explicitly enabled | legitimate scripts run; all escape attempts blocked |

---

## Session 2026-08-06 (cont.) — Go-live attempt

Goal was to put the backend live. **Not achieved** — blocked on credentials that
only the repository owner can supply. What the attempt established:

### The Cloud Run service does not exist

Probing the derived service URL
(`https://rei-signallab-api-36308448808.europe-west1.run.app`, project number
taken from the Firebase config) returns a **Google-frontend 404**, not a DNS
failure. The hostname reaches Cloud Run's frontend and no service matches:
`rei-signallab-api` has never been created in `europe-west1`. This explains the
`/api/**` rewrite falling through to `index.html` on both domains.

### Why the deploy could not be run from here

| Blocker | Detail |
| :--- | :--- |
| `gcloud` not installed | Not on PATH on this machine |
| `gcloud auth login` is interactive | Browser-based; the owner must run it |
| Docker Desktop will not start | Daemon never came up over a 7-minute wait, so no local image build/push |

`scripts/deploy-cloud-run.sh` was reviewed line by line and is correct — it
creates the Artifact Registry repo if absent, builds, pushes, deploys with
2 GiB / 2 CPU / concurrency 8, smoke-tests, and rolls back on failure.

### A blocker that would have failed the deploy anyway

Running the API locally under production env and replaying the CD pipeline's own
smoke payload found `POST /api/vibration/analyze` returning **HTTP 500**:

```
type object 'VibrationEngine' has no attribute 'compute_envelope_spectrum'
```

The method's **body existed but its `def` line and `@classmethod` decorator had
been deleted** in an earlier edit — the body was orphaned as dead code after
`compute_sdof_mass_spring_damper`'s `return`, with its docstring sitting as an
unreachable expression. The flagship vibration endpoint and the graph's
`vibration.envelope_analysis` node were both broken in production.

The whole existing suite passed regardless, because it tests engines directly
and never drove the routes. Restored the signature (defaults `500 Hz` /
`5000 Hz`, matching what the node registry already documented) and added
`backend/tests/test_routes_smoke_golden.py`: 36 tests that drive **every**
endpoint over HTTP, plus a guard asserting no registered route lacks smoke
coverage. Had this deploy succeeded before the fix, the pipeline's smoke test
would have failed and auto-rolled-back.

Backend suite: 118 -> 154 tests.

---

## Open items

### Blocking production — owner action required

1. **Deploy the backend.** The Cloud Run service does not exist. Either:
   - install the gcloud SDK, `gcloud auth login`, then
     `GCP_PROJECT_ID=signallab-3305b GCP_REGION=europe-west1 ./scripts/deploy-cloud-run.sh`; or
   - configure the three repo secrets (`GCP_WORKLOAD_IDENTITY_PROVIDER`,
     `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`) and let the CD pipeline do it.

   Until this lands, every workbench in the UI calls an endpoint that returns
   the SPA's HTML.
2. **Firebase Hosting must be redeployed after the service exists.** A `run`
   rewrite cannot resolve to a service that is absent, which is consistent with
   hosting currently serving `index.html` for `/api/**`.
3. **`www.signallab.site` has no valid TLS certificate** — the presented cert
   does not cover the `www` host. Either provision it in Firebase Hosting or
   drop the hostname.

### Next phases

3. **Phase 4 — platform layer.** No persistence beyond `localStorage`
   (`App.jsx:83`). Firebase is already a dependency: Auth + Firestore would add
   accounts, saved projects, shareable graph links, analysis history.
4. **Phase 5 — scale and observability.** No router and no code splitting; all
   workbenches sit in one 450 kB bundle, with `VibrationWorkbench.jsx` alone at
   1856 lines. No error tracking, no metrics endpoint, no tracing.
5. **Lint backlog.** ~145 warnings, mostly unused imports and unused `useState`
   setters. Promote each rule to `error` as its count reaches zero.
6. **Distributed rate limiting.** The current limiter is per-instance; quota
   multiplies by instance count.
7. **`/api/lisp/process` has no execution timeout.** Lower risk than the Python
   sandbox — the interpreter only dispatches a fixed macro set — but it is
   unbounded and shares the compute bucket.
8. **Pydantic/NumPy interop warning.** Validating the large float lists in
   vibration responses emits `np.bool scalars ... interpreted as an index`
   (a future error) from inside `pydantic/type_adapter.py`. Our own values are
   plain Python types; this is a library interaction to re-check on the next
   pydantic or numpy bump.
