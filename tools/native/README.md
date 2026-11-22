# Native (real g++) verification

Every solution in the problem bank is compiled with **g++ 13** inside the hardened Docker sandbox and run on every test input.
The outputs are compared with the independent JavaScript reference answers using the same rules as the in-app judge.

```
npm run verify:native -- --ubsan      # compile with -fsanitize=undefined: aborts on signed overflow, bad shifts, ...
```

Generated files (`cases.json`, `results.json`, `report.txt`, `*.log`) are git-ignored. Inputs that only the in-browser tracer can build
(cyclic / shared-tail / random-pointer lists) are reported as `SKIPPED`, never as passes.
