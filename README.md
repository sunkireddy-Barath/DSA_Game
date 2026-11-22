# CS Quest

Interactive CS learning platform. Built so far: platform foundation + the **DSA world** (Striver's A2Z) driven by a real C++ tracer.

```
npm install
npm run dev      # http://localhost:5173
npm test         # run from a shell whose cwd uses the correct drive-letter case (C:\, not c:\) on Windows
```

## How execution works
`src/engine/parser.ts` + `interp.ts` parse and **execute** the student's C++ (a documented subset) and record a `TraceEvent` per statement/call/return with full frame snapshots. All visuals, the inspector, the recursion tree, counters and the tutor are derived from those events, so the code is the source of truth. Unsupported constructs (pointers, structs, floating point, ...) raise an explicit "not supported by the tracer" error; nothing is faked.

## Worlds (all ten are live; each is simplified and says so in the UI)
- DSA (#/dsa): real C++ tracer, all 464 listed A2Z problems playable + 16 concept cards
- DBMS (#/dbms): normalization lab, WAL/ACID simulator, schedules, locks, B+ tree
- SQL (#/sql): real SQLite via sql.js, 44 checked challenges, 13 lessons (set ops, DDL and constraints, views and indexes, transactions and triggers), logical-flow stepper + EXPLAIN
- Interview Glossary (#/interview): ~170 precise terms across all 10 subjects with the follow-up questions interviewers ask, search and quiz mode
- OS (#/os): scheduling, paging, Banker, deadlock, disk
- OOPS (#/oops): object-model simulator (ctor/dtor order, vtable dispatch, copy/move, smart pointers)
- Networks (#/cn): subnetting, TCP handshake, routing, packet journey, CRC
- Architecture (#/coa): number systems, logic, mini CPU, cache, pipeline hazards
- System Design (#/sysdesign): graph-based load simulator with goals
- Software Engineering (#/se): 18 patterns, pattern lab, Kanban/Scrum/CI-CD
- Developer Tools (#/dev): Linux shell + Git simulator with missions

## Layout
- `src/engine` interpreter, judge (hidden tests), tests against independent JS references
- `src/data/sheet.ts` A2Z curriculum (steps -> topics -> problems)
- `src/data/problems.ts` playable problems (C++ approaches, tests, hints, complexity notes)
- `src/data/subjects.ts` the 10 subjects (only DSA is live)
- `src/components` workspace, visualizer, complexity lab, tutor

## Supported C++ subset
int/long/bool/char/string, vector (nested), unordered_map/set, stack/queue/deque/priority_queue (real heap), ListNode*/TreeNode* with new and ->, recursion, references, sort/reverse/swap/min/max/abs/gcd. Not supported (reported as such): floats, general structs/classes, other pointers, switch, lambdas, iterators beyond begin/end.

## Not built yet
Backend (FastAPI), real g++ sandbox, Supabase auth, LLM tutor, 4NF/5NF, view serializability, distributed-DB simulators. C++ pattern snippets in the SE world are reference code and were not compiled.
