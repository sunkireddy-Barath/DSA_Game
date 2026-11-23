# CS Quest

Interactive computer-science learning platform: a C++ tracer with step-by-step visualisation for all 464 problems of Striver's A2Z sheet,
real SQLite, nine more learning worlds, an interview-prep section, accounts with cloud progress, an AI tutor and a real C++17/20 sandbox.

```
frontend   Vite + React 18 + TypeScript (static files, deployable to Vercel)
backend    FastAPI (accounts, progress, AI tutor, Docker-sandboxed g++)   -> backend/
```

## Run it locally

```bash
npm install
npm run dev                       # frontend on http://localhost:5173 (proxies /api to the backend)

# backend (second terminal) - Python 3.11+
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt     # .venv/bin/pip on Linux/macOS
.venv/Scripts/python -m uvicorn app.main:create_app --factory --reload --port 8000
docker pull gcc:13-bookworm       # needed for the C++ sandbox
```

Everything except accounts, the C++ sandbox and the AI tutor works without the backend. Optional environment variables are listed in
[`backend/.env.example`](backend/.env.example); the full production guide is [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and the current
status is in [`docs/READINESS_REPORT.md`](docs/READINESS_REPORT.md).

## Tests

| Command | What it runs |
|---|---|
| `npm test` | 1,312 unit tests (incl. all six game engines): interpreter vs independent JS references for every solution, all engines, SQL on real SQLite, client code, and a render test that draws the diagrams and inspector at sampled steps of every solution |
| `npm run test:backend` | 100+ backend tests, including real Docker-sandbox runs (network, filesystem, fork bomb, memory bomb, timeouts) |
| `npm run test:e2e` | 61 real-browser tests (Microsoft Edge via Playwright) against the production build, the real API and the real sandbox |
| `npm run verify:native -- --ubsan` | compiles **every** solution with real g++ (+ UBSan) in the sandbox and compares with the reference answers |

## What is implemented

- **DSA world** - 464/464 A2Z problems with optimized C++ solutions, complexity notes, hints, hidden tests, a solve-it game, an interview playbook
  per topic, and a line-by-line tracer (statement/call/return events, frames, heap, recursion tree). Solutions are also checked on real g++.
- **Diagrams that explain themselves** - every step has a plain-English narration (what the line is about to do, taken from the recorded next step), labelled pointers
  (`low`/`mid`/`high`, `slow`/`fast`, ...), a shaded active search range, and a legend plus "how to read this" note on every diagram in every world.
- **Games** (`#/games`) - six short learning games, each driven by a tested engine (answers are computed, never hard-coded): Binary Search Hunter, Bracket Balancer
  (be the stack), Page Fault Predictor (FIFO/LRU), Subnet Sniper, Big-O Match (answers confirmed by step counts measured on the real interpreter) and Term Match (memory
  cards from the glossary). Three levels each, 1-3 stars, XP only for beating your best rating (no farming), progress synced to your account.
- **Design** - light and dark themes (follows the system, with a toggle), self-hosted fonts and editor, responsive layout with a phone menu, keyboard focus rings.
- **Real C++ execution** - function-style (LeetCode) code, no `main()` needed, C++17 or C++20, compiled by g++ 13 in an isolated container.
  The "g++ Run" tab runs your input or all tests natively and tells you whether the result matches the in-browser tracer.
- **SQL world** - real SQLite (WebAssembly) in the browser: 44 checked challenges, 13 lessons, logical-flow stepper, EXPLAIN.
- **Nine more worlds** - DBMS, OS, OOPS, Networks, Computer Architecture, System Design, Software Engineering, Git/Linux (tested engines, simplified models).
- **Interview prep** - 121-question game with model answers, a rule-based mock interviewer, and a 170-term glossary.
- **Accounts + cloud progress** - e-mail/password (scrypt), server-side sessions in httpOnly cookies, progress merged across devices.
- **AI tutor** - Anthropic API called from the backend with the problem, your code, the last run and the current trace step as context.

## Known limitations (honest list)

- The in-browser tracer executes a **C++ subset** (see below). Code outside it still runs on the g++ tab but has no step-by-step trace.
  Line-by-line visualisation comes from the tracer; the real g++ run does not produce a per-line trace.
- Six linked-list problems use input forms (cycles, shared tails, random/bottom pointers) that only the tracer can construct, so they are
  not verifiable on g++ (`tools/native/README.md`).
- The AI tutor needs an `ANTHROPIC_API_KEY` on the server. It has been tested end to end against a local stand-in for the API, not against the live service.
- The mock interviewer is keyword-based, not an LLM, and says so.
- Rate limiting is per process (run the API with one worker, or move the limiter to a shared store).
- Explanations, glossary entries and model answers were written by hand; code, solutions and SQL results are verified by tests, the prose is not.

## Supported C++ subset (tracer)
int/long/bool/char/double/string, vector (nested), array, pair, map/set/unordered, stack/queue/deque/priority_queue (real heap),
ListNode*/TreeNode* with new and ->, recursion, references, lambdas, switch, structured bindings, range-for, sort/reverse/swap/min/max/abs
and common STL algorithms.

## Layout
- `src/engine` interpreter, judge; `src/data` sheet, problems, concept cards; `src/components` workspace, worlds, account, g++ and tutor panels
- `src/pages` lazy-loaded pages; `src/api.ts` / `src/auth.ts` backend client, sign-in and progress sync
- `backend/app` FastAPI app; `backend/tools` native verification; `e2e` browser tests; `tools/native` native verification output
