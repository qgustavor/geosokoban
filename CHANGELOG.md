# Changelog

## 0.2.5 — generation and game feedback

- Default to Daily; keep Options/Credits in dialogs over the existing session.
- Use centered SVG HUD icons, explicit menu buttons, immediate progressive hints, animated recovery actions, local country labels and delayed results.
- Extend geographic context beyond the grid, remove country highlights, soften continuous land/water tiles and add a diagonal reveal.
- Add move-optimal A*, a minimum five-move obstacle contribution, delivery-order patterns and stronger Hard repositioning checks.
- Replace all runtime fallbacks with 48 boards meeting both difficulty certificates; remove older fallback snapshots.
- Record 101 passing Node tests and a 28-worker benchmark. Production build/lint/browser checks remain unverified; generation latency and fallback frequency are known limitations.
- Preserve fixed story drafts, biome atlas, globe/plane artwork and dependency versions.

# Changes

## 0.2.3

- Remove the board renderer's dependency on the runtime world singleton, fixing first-visit menu previews and fresh story routes.
- Commit versioned projected country outlines for all eight existing map projections; preserve borders, selected-country highlights and island artwork without a world-map request.
- Add reproducible outline generation and a prebuild freshness check.
- Add unloaded-geography regression tests and stronger browser assertions for menu/story paths and page errors.
- Record observations from the five original-game screenshots without redistributing their artwork or reversing the agreed prototype design.


## 0.2.2

- Decode geography according to the received bytes, handling HTTP-decoded JSON without attempting gzip decompression twice.
- Mount the menu independently of map data; fetch geography only for generated puzzles, with cancellation and retry.
- Add Vue Router hash history, named puzzle/options/credits routes and compatibility redirects for old share links.
- Keep the active session outside routed views, preserving its undo history when visiting options or credits.
- Include the first map download in delayed preparation feedback. Story mode still bypasses it.
- Add HTTP transport regressions, route-helper checks and unexecuted dev/preview browser regressions. All 70 Node tests pass; build/browser limitations are recorded separately.

## 0.2.1

- Delay daily/random loading feedback for 500 ms; skip it entirely for story boards and fast generated replies.
- Add translated stage feedback, a visible-only 400 ms completion transition and reduced-motion behavior.
- Keep progress messages distinct from completion, make cancellation clear display handles, and reject stale replies.
- Remove the elapsed-time generation cutoff. Preserve fixed computational limits and use a versioned, replay-verified fallback pool on search exhaustion.
- Remove the random-region selector; keep region metadata internal to puzzle codes and story content.
- Add fresh-worker benchmarks, raw results and timing/fallback tests. Record browser/build limitations separately.

The underlying puzzle-pattern construction and difficulty checks are unchanged. The fallback pool remains generated draft content requiring human review.
