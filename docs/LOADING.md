# Generation feedback — 0.2.5

Fixed story boards open directly without a generation worker or progress bar. The selector, Options and Credits do not depend on a world-map download.

For daily/random requests the existing screen remains until **500 ms** has elapsed without a completed level, including any initial map fetch. Setup controls are inert during the request. A progress message is not a completed level and does not terminate the worker or cancel the delayed loader.

A visible display uses real preparation milestones with presentation-only estimated movement. It has no exact percentage. Retries do not move it backwards. When a verified board is ready, an already-visible bar finishes over **400 ms**; a fast request has no manufactured completion hold. Reduced motion removes that hold. A prolonged search becomes indeterminate and remains cancellable.

`src/core/loading-feedback.js` uses provisional 4,300/4,400 ms estimates for gentle/Hard, rounded from the current development-worker p75 values. These estimates affect the bar only. They are not browser/mobile guarantees, and neither estimates nor elapsed time change the chosen puzzle. See `BENCHMARKS.md`.

The application has **no 20-second generation deadline**. Fixed candidate/expanded-state budgets bound work. Exhaustion selects a deterministic replay-verified board from `src/content/fallback-levels-v4.json`, preserving region, three flags, design checks and the five-move obstacle contribution. It does not relax quality or retry indefinitely. A broken asset, invalid certificate or worker fault remains an honest technical error.

The 48 fallback boards are separate from editable story content. Their optimum and structural checks are documented in `CHALLENGES.md`; runtime validation replays their certificates, and offline tests recompute their optima. The current fallback rate is high and the pool has only three variants per projection/family. It is a safe loading outcome, not a substitute for improving the generator's variety.

Cancellation aborts an outstanding map request, terminates a generation worker, clears loading timers and rejects stale replies. The previous active puzzle is not replaced by an abandoned request. Scene animations and developer benchmarks do not create a gameplay clock.

Node tests exercise delayed display, fast completion, the visible-only hold, reduced motion, requests beyond 20 seconds, cancellation and typed worker messages. Production browser specifications are included but remain unexecuted in this environment. See `V2_5_TESTING.md`.
