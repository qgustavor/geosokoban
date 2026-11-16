# Generation feedback — 0.2.6

Fixed story boards open directly without a generation worker or progress bar. The selector, Options and Credits do not depend on a world-map download.

For daily/random requests the existing screen remains until **500 ms** has elapsed without a completed level, including any initial map fetch. Setup controls are inert during the request. A progress message is not a completed level and does not terminate the worker or cancel the delayed loader.

A visible display uses real preparation milestones with presentation-only estimated movement. It has no exact percentage. Retries do not move it backwards. When a verified board is ready, an already-visible bar finishes over **400 ms**; a fast request has no manufactured completion hold. Reduced motion removes that hold. A prolonged search becomes indeterminate and remains cancellable.

`src/core/loading-feedback.js` uses provisional 1,000/900 ms estimates for gentle/Hard, rounded from the current development-worker p75 values. These estimates affect the bar only. They are not browser/mobile guarantees, and neither estimates nor elapsed time change the chosen puzzle. See `BENCHMARKS.md`.

The application has **no 20-second generation deadline**. Fixed candidate/expanded-state budgets bound work. Exhaustion selects a deterministic replay-verified board from `src/content/fallback-levels-v5.json`, preserving region, three flags, design checks and the five-move obstacle contribution. It does not relax quality or retry indefinitely. A broken asset, invalid certificate or worker fault remains an honest technical error.

The 48 new fallback boards span four multi-structure layout families and are separate from editable story content. Their optimum and structural checks are documented in `CHALLENGES.md`; runtime validation replays their certificates, and offline tests recompute their optima. The fallback rate is high (12/14 in the paired sample). Three templates per projection/difficulty receive seeded, certificate-preserving extra structures. This is finite content, not a promise of a novel solution to every code.

Cancellation aborts an outstanding map request, terminates a generation worker, clears loading timers and rejects stale replies. The previous active puzzle is not replaced by an abandoned request. Scene animations and developer benchmarks do not create a gameplay clock.

Node tests exercise delayed display, fast completion, the visible-only hold, reduced motion, requests beyond 20 seconds, cancellation and typed worker messages. Production browser specifications are included but remain unexecuted in this environment. See `V2_6_TESTING.md`.

## Cache and worker lifetime

Story and validated cache hits bypass the geography request, generation worker and loader. The generated-board cache has a 24-entry memory LRU and a best-effort 750,000-character local-storage cap. Its namespace includes map, generator and fallback versions. Reads/writes are cloned and cached solutions are validated/replayed. Invalid JSON, stale versions, quota errors and unavailable storage degrade to misses or memory-only caching.

A successful generation worker stays alive for later codes. Geography is transferred once per worker/source identity; geographic sampling is reused across threshold retries. Cancellation or faults discard the worker and reject stale replies. A new request never queues behind abandoned generation. Cache entries store initial boards, not move history.
