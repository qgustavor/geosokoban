# Generation benchmark — 0.2.5

## Current measurements

Raw record: `benchmarks/v2.5-node-worker.json`. Generator version 4; minimum obstacle contribution five moves. There were **28 sequential fresh Node workers**, two reproducible codes per seven top-level regions and mechanical family. Each worker runs the actual generation-worker source through a Node parentPort adapter. Time includes worker startup, imports, transfer of already-loaded geography and terminal reply; progress messages do not finish a measurement. Each returned solution was replayed outside the timed interval.

| Family | Runs | Median | p75 | p95 | Maximum | Fallbacks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy/Medium layout | 14 | 3,550 ms | 4,293 ms | 5,222 ms | 5,222 ms | 9 |
| Hard layout | 14 | 3,072 ms | 4,335 ms | 7,966 ms | 7,966 ms | 10 |
| Balanced sample | 28 | 3,152 ms | 4,293 ms | 6,617 ms | 7,966 ms | 19 |

All 28 completed with valid replayed solutions; no failed requests. **None completed under 500 ms**; one finished under one second. The high fallback rate means the current strict generator does not supply enough distinct fresh puzzles reliably. It must not be described as a performance or variety problem solved.

Environment: Node v22.16.0, Linux x64, AMD EPYC 9V74, four available logical CPUs. Jobs are sequential. Percentiles use nearest rank. These are measurements of a small fixed corpus, not estimates of all players' experience or proof that Hard is faster/easier than Easy. With 14 samples per family, tail estimates are especially coarse. Regions are equally weighted rather than weighted by actual use.

The stricter design filters and two move-optimal searches make this a different workload from 0.2.1. That release's 280-worker record in `benchmarks/node-worker.json` remains historical; its 88.2%-under-500-ms figure **does not describe this generator**.

## Loading estimates

Keep the 500 ms loader delay and 400 ms visible-only completion transition. New provisional search estimates are 4,300 ms for gentle and 4,400 ms for Hard, rounded from these p75 values. They affect presentation only. Neither a loader estimate nor a wall-clock deadline determines acceptance or fallback. Story mode never uses the generator.

These measurements exclude first map download, application startup, Vue rendering, flag rendering and board animation. They are not browser measurements and not physical-phone measurements. Measure click-to-play separately on representative devices before tuning the delay or making latency promises.

## Repeat

```sh
npm run benchmark -- --samples 2 --output docs/benchmarks/my-worker-run.json
```

Two samples gives 28 requests. Twenty gives 280 and is materially more expensive with the new certification. The benchmark requires only Node; each result records optimum costs, the obstacle-free baseline, gap, fallback use and progress timings.

The included production-browser benchmark requires installed dependencies and a successful build:

```sh
npm install
npx playwright install chromium
npm run build
npm run benchmark:browser -- --samples 2
```

That script serves the actual dist app and measures native workers, not reconstructed components. It remains unexecuted here because registry DNS and browser navigation are blocked. No browser timing is inferred from Node results. A 120-second watchdog exists in developer benchmark scripts only; watchdog failures are counted, not replaced with convenient successful timings.
