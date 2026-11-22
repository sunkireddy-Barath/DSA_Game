# Deployment readiness report

**Verdict: not yet production-ready.** The code and tests described below pass, but nothing has been deployed or exercised on a real host,
and the AI tutor has never talked to the live Anthropic API. Run the post-deploy checklist in `docs/DEPLOYMENT.md` against the real
deployment before relying on it. Everything here was verified on a single Windows machine (Edge, Python 3.12, Docker inside WSL2).

## 1. Completed features (implemented, tested, no mocks in the product)

| # | Requirement | Status |
|---|---|---|
| 1 | FastAPI backend | Done: `backend/app` - auth, progress, tutor, sandbox run, health. OpenAPI docs in dev. |
| 2 | Authentication + persistent progress | Done, **but not Supabase**: own e-mail/password accounts (scrypt), opaque server-side sessions in `HttpOnly` cookies, SQLite. Progress is merged (union/max) across devices, auto-synced, reset deletes it server-side. |
| 3 | LLM tutor with context | Done: the backend calls the Anthropic Messages API with the problem, the learner's code, the last run/judge result and the current trace step (line, variables, call stack). API key only in the server environment. **Tested against a local stand-in for the API, not the live service.** |
| 4 | Secure C++17/20 execution, function style | Done: Docker sandbox (`gcc:13`), no `main()` needed (signature parsed from the code, JSON harness for ints, doubles, strings, vectors, pairs, trees, lists). Single-input run and "run all tests" (one compile). |
| 5 | Real SQL execution in the SQL playground | Already real: SQLite compiled to WebAssembly runs in the browser (44 challenges, lessons, stepper, EXPLAIN). I did **not** add a server-side SQL endpoint: it would add attack surface and no capability. |
| 6 | DSA execution synced with the line-by-line visualisation | Partly: the in-browser tracer produces the line-by-line trace and drives the visualisation; the g++ tab runs the same code on real g++ and shows a parity banner (same / different result). Real g++ does **not** produce a per-line trace. |
| 7 | Code splitting / lazy loading | Done: first screen ~200 KB (React, shell, dashboard); each world, the problem bank (588 KB), SQLite and the editor load on demand. Monaco is self-hosted (no CDN). |
| 8 | `.gitignore` | Cleaned: secrets/`.env`, venv, SQLite files, generated verification output, test output. |
| 9 | Real-browser tests of SQL, DSA, Interview | Done: 40 Playwright tests in Microsoft Edge against the production build and security headers. |
| 10 | Buttons, interactions, API calls, error handling | Covered for the flows listed in section 4. |

## 2. Incomplete / not done

- **Supabase** was not used (no project/keys available); the built-in auth replaces it.
- **Live Anthropic call** never made (no key). Default model id `claude-sonnet-5-5` is unverified against the live API.
- **Vercel deployment and the `/api` rewrite** were not performed or tested (no Vercel/host account). Cookie pass-through via the rewrite is expected but untested.
- **No e-mail flows**: no e-mail verification, no password reset, no account deletion endpoint, no MFA.
- **Per-line trace from real g++**: not available (see item 6).
- **6 linked-list problems** (loop detection x3, Y-intersection, flatten, random-pointer clone) use input forms only the tracer can build, so they are not verified on g++.
- **Interaction tests cover** the home, DSA, SQL, Interview and account/g++/tutor flows. The other eight worlds (DBMS, OS, OOPS, Networks, Architecture, System Design, SE, Git/Linux) were only load-tested in the browser; their engines have unit tests but their UI controls were not clicked through.
- **Browsers/devices**: only desktop Microsoft Edge (Chromium). Firefox, Safari, mobile, accessibility and performance (Lighthouse) audits were not run.
- **Load/penetration testing** was not done.

## 3. Known issues / risks

- **Docker socket = root-equivalent.** The API host must be a dedicated VM; consider rootless Docker or gVisor (see deployment guide).
- **Rate limits are in-process memory**: run one worker; limits reset on restart. Behind a proxy `TRUST_PROXY=1` is required or all users share one limit.
- **Dev-tooling advisories** (`npm audit`, 7 findings): vite 5 / esbuild dev server and vitest 2 / tinypool. Fixing them needs major upgrades (vite 7+, vitest 5). They affect only local development, not the shipped app (production dependencies: 0 vulnerabilities).
- **CSP allows inline styles** (`style-src 'unsafe-inline'`, needed by React inline styles and Monaco); scripts are `'self'` only (+ `wasm-unsafe-eval` for SQLite WebAssembly).
- **Editor chunk is large** (3.3 MB, ~860 KB gzipped) but loads only on editor pages and is cached as immutable.
- **Progress merge is grow-only**: lowering a value on one device cannot propagate except through "Reset progress".
- **Mock interviewer** is keyword matching, not an LLM; explanations/glossary prose is hand-written and not machine-verified.
- Nothing is committed by this work; review `git status` first.

## 4. What the browser tests cover (49 tests, all passing)

Shell/routing/lazy loading and CSP (6) - Interview Q&A, mock interviewer, glossary (4) - SQL: load under CSP, run, stages, EXPLAIN, errors with hints,
DML + reset, challenge pass/fail/XP/hints, lessons (6) - DSA: stepping, play/pause, approaches, predict mode, inspector, solve mode with hints/peek/XP/persistence,
compile errors with the line highlighted, recursion/tree views, playground, 18-step sample (9) - accounts: register, validation, duplicate, login errors,
sign-out, cloud restore after wiping local data, no leakage between accounts, server-side reset, expired session, backend down (7) -
native g++: locked when signed out, run + parity + all tests + compile errors, C++20 vs C++17, infinite loop/crash containment, server refusals (5) -
AI tutor: context actually sent upstream, history, upstream failure handling, locked state (3).

## 5. Security checks

| Check | Result |
|---|---|
| Password storage | scrypt (n=2^14, r=8, p=1), per-user salt; plaintext never stored (test) |
| Sessions | random 256-bit token, only its SHA-256 stored, `HttpOnly`, `SameSite=Lax`, `Secure` in prod, server-side revocation on logout, expiry (tests) |
| CSRF | state-changing requests need `X-Requested-With`; CORS only for configured origins (tests) |
| Brute force / enumeration | 5 failed logins per e-mail -> 429; identical error and one hash check for unknown e-mails; sign-up rate limit (tests) |
| Input validation | Pydantic limits on every field; body size cap 1 MB; progress/drafts size caps; unknown fields dropped (tests) |
| SQL injection | parameterised queries only |
| Sandbox | verified by real containers: no network, read-only FS, non-root uid 65534, no capabilities, fork bomb and memory bomb contained, time limit, output truncation, no state between runs |
| Code injection via signature | only whitelisted parsed types reach the generated harness (test) |
| Secrets | none in the repo; key only from the environment; never in responses or in the LLM payload (tests); `.env*` ignored |
| LLM prompt injection | student-supplied text is delimited and declared as data in the system prompt; the tutor has no tools, only returns text |
| Security headers | API: nosniff, DENY, no-referrer, no-store; site: CSP, HSTS, X-Frame-Options, Permissions-Policy (`vercel.json`, tested in the browser) |
| Dependencies | `pip-audit`: 0 known vulnerabilities; `npm audit --omit=dev`: 0; dev tooling: see issues |
| Not done | external penetration test, load test, dependency pinning review of transitive Python packages |

## 6. Test results (final run)

| Suite | Result |
|---|---|
| `tsc --noEmit` | clean |
| `npm test` (vitest) | **1,288 passed**, 4 skipped (opt-in verification modes) |
| `npm run test:backend` (pytest, incl. real Docker sandbox) | **103 passed** |
| `npm run test:e2e` (Playwright, Edge, production build) | **49 passed** |
| `npm run verify:native -- --ubsan` (every solution on real g++ 13 + UBSan) | **2,530 / 2,530 checkable runs match the reference**; 10 runs skipped (6 problems, tracer-only inputs); 0 compile errors |
| `npm run build` | succeeds |

### Defects found by this verification and fixed

- Real g++ exposed a genuine bug in *Buy and Sell Stocks With Transaction Fee* (int overflow from `INT_MIN`) and undefined behaviour in
  *Introduction to Bit Manipulation* and *Data Types* (negative left shift / signed overflow). The tracer had accepted all three.
- Three tree problems had test data nested one level too deep, so some of their tests were meaningless (found by running them natively).
- Editor line highlight was missing on the first step (effect ran before Monaco mounted).
- Glossary subject buttons were ambiguous ("Computer" twice).
- Sign-out left the form on the "Create account" tab; an expired session gave no message.
- Reset progress could not work for signed-in users (merge is grow-only): added a server-side delete.
- The editor depended on a public CDN (12-18 s loads, one outright stall): now self-hosted.
- **Crash found by stepping through a linked-list trace in the browser**: the Inspector read `.$map` of a `nullptr` variable, so any linked-list problem crashed when the trace reached a null pointer. Fixed, and a unit test now renders the diagrams and inspector at sampled steps of every solution.
- The editor showed `>=` as a single `≥` glyph (font ligatures), which misrepresents C++ source: ligatures are off.
- Monaco's sticky-scroll overlay covered the first lines of code on phones: disabled.

### Design and diagram work (this round)

- Visual redesign (tokens, light/dark themes, glass navigation, hero dashboard, accented world cards, polished workspace, phone menu).
- Every diagram now carries a legend and a "how to read this" note (arrays, maps, grids, recursion tree, lists, trees, stacks, queues, heaps, graphs, and the OS, DBMS, networking, architecture, OOP, system-design, SE and Git/Linux visuals) plus a per-step narration for DSA traces.
- 9 new browser tests cover the explanations, the theme toggle, the phone menu, no horizontal overflow and focus visibility.
- **Not verified**: visual design was reviewed from screenshots in Edge (desktop and 390 px phone, both themes) but not in Firefox/Safari, and not with a screen reader or a formal contrast audit.
