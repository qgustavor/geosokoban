# Generation benchmark — 0.2.6

## Paired measurements on this machine

The original uploaded source and updated source ran the **same 14 seeded codes, in the same order**, sequentially in fresh Node workers. Each run contains one code per seven top-level regions and two mechanical difficulties; North America may internally select the Caribbean. There are no cache hits or warm-worker reuse in this measurement. All 28 returned solutions were replayed successfully outside the timed interval.

| Measurement | Original source (generator 4) | Updated source (generator 5) |
| --- | ---: | ---: |
| Requests completed / attempted | 14 / 14 | 14 / 14 |
| Median | 5,225.9 ms | 567.6 ms |
| p75 | 5,799.3 ms | 806.5 ms |
| p95 / maximum | 8,073.2 ms | 1,031.2 ms |
| Completed under 500 ms | 0 / 14 | 5 / 14 |
| Completed under 1,000 ms | 0 / 14 | 12 / 14 |
| Certified-template fallbacks | 8 / 14 | 12 / 14 |

The observed median is approximately **9.2× faster**. This is not purely a micro-optimization comparison: live search budgets are smaller and new templates are used more frequently. Generator version 5 also changes seed output and topology. The move-gap and design requirements are still enforced. Template variations preserve certificates, but do not guarantee a completely new solution for every code.

Raw records:

- `benchmarks/v2.5-same-machine-baseline.json`
- `benchmarks/v2.6-node-worker.json`

The separate `benchmarks/v2.5-node-worker.json` is the prior release's 28-request record on a different CPU; do not mix its median with this paired comparison.

## Method and limitations

Environment: Node v22.16.0, Linux x64, Intel Xeon Platinum 8573C, four available logical CPUs. Workers execute the actual generation-worker source through a Node parentPort adapter. Timing includes worker startup/imports, transfer of already-loaded geography and the terminal reply. Progress messages do not finish a measurement. No warmup samples are discarded.

Network download, application startup, DOM/SVG rendering, loading feedback and board transitions are excluded. These are development-machine measurements, **not browser or physical-phone latency guarantees**. Fourteen runs provide only a small fixed sample and coarse tail estimates. Codes are equally weighted across regions/difficulties, not weighted by player traffic.

A cache hit bypasses the worker entirely, and warm workers reuse geographic samples for later codes; neither improvement is included in the fresh-worker table. Cache and lifetime behavior have unit coverage, but no browser performance numbers are claimed.

Provisional loader estimates are 1,000 ms for gentle and 900 ms for Hard, rounded from the respective small-sample p75 values. They affect presentation only. The 500 ms delayed-loader threshold and 400 ms visible-only finishing period are unchanged. The default tile sequence is separate from generation and deliberately takes visible time; reduced motion disables it.

## Repeat

```sh
npm run benchmark -- --samples 1 --output docs/benchmarks/local-worker-run.json
```

One sample gives 14 requests; two gives 28. This script only needs Node and bundled assets. It records solution/optimum metadata, template use and progress timings. A developer watchdog counts failures rather than substituting successful timings.

For the production-browser benchmark, install dependencies and build first:

```sh
npm install
npx playwright install chromium
npm run build
npm run benchmark:browser -- --samples 2
```

The production-browser benchmark remains unexecuted here because dependency installation was unavailable. No browser results are inferred from the Node data.
