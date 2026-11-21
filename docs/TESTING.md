# Current verification

See **[V2_5_TESTING.md](V2_5_TESTING.md)** for current results and limitations: 101 Node tests; 42 sampled daily/random requests; all 48 certified fallbacks; 300 small-board optimality comparisons; 28 fresh-worker benchmark requests. The production build, lint and browser suites remain unverified.

The records below belong to earlier releases. Their test counts, timings and interface behaviors are not current results.

---

# Current verification

**For 0.2.4, read [V2_4_TESTING.md](V2_4_TESTING.md).** The records below are historical. They do not establish current browser behavior or a completed biome import.

---

# Verification record — v0.2.3

## Board-rendering correction

**78 Node tests passed, zero failed, skipped or cancelled.** The complete current run is `RENDER_TEST_RESULTS.txt` (Node 22.16.0). This includes eight new outline tests plus the existing engine, generation, geography-transport, loading, routing-helper and worker-source tests. The existing sample of 700 gentle and 140 challenge puzzles remains part of this run.

The new regression suite starts without loaded geography, reproduces the former rasterizer exception in a fresh process, and verifies that the menu preview, all 42 story boards and frozen fallback boards have country paths without loading the world. It compares all eight projections at four thresholds against the existing rasterizer, checks reproducible atlas generation, and checks the board component's local import graph for world-loader/rasterizer dependencies. These data and source-dependency checks are **not executions of Vue's SFC renderer**.

`npm run maps:check` passed. The new JavaScript files and revised Playwright specification passed `node --check`. No package dependency changed. Dependency installation remains blocked by npm registry DNS resolution (`EAI_AGAIN`); the new attempt is recorded in `RENDER_INSTALL_FAILURE.txt`. ESLint, the Vite production build, and the updated browser suite were not run successfully here. No reconstructed browser harness is used as a substitute for those checks.

The startup Playwright suite now requires visible country-path elements, captures page errors, and blocks map requests for the menu and fresh story routes. It includes both planning settings for all eight geographic projections and menu checks in English, Portuguese and Spanish. These additions are **unexecuted specifications**, not passed tests. They would have caught the original menu-preview regression, which the v0.2.2 source-level mount check missed.

See `RENDER_FIX.md` for the cause and correction and `REFERENCE_IMAGES.md` for source-grounded notes on the original game's screenshots. Historical results below do not establish current browser behavior.

---

# Earlier verification records

## 0.2.2 startup and routing verification

**70 Node tests passed.** See `STARTUP_TEST_RESULTS.txt` and `STARTUP_AND_ROUTING.md`. New tests reproduce the double-decompression error over HTTP, validate raw/decoded transport forms, retry and cancellation, check route helper outputs and inspect startup separation. Route-helper and source-structure checks are not executions of Vue Router.

The new Playwright startup/routing suite and both dev/preview configurations are included, but **the Vite build, ESLint and browser navigation remain unverified**. Installation again failed with registry DNS error `EAI_AGAIN`. A targeted Chromium asset regression was blocked before navigating to loopback HTTP with `ERR_BLOCKED_BY_ADMINISTRATOR`. Logs: `STARTUP_INSTALL_FAILURE.txt` and `STARTUP_BROWSER_ASSET_CHECK.json`.

Earlier results below are historical and do not establish that the revised routed interface has passed a production-browser test.


This update adds delayed generation feedback, typed worker messages, cancellation handling, a versioned fallback snapshot, removal of the random-region dropdown and repeatable benchmarks. Earlier UI results below belong to v0.2.0, not to the updated interface.

## Current executed checks

`node --test tests/*.test.js`: **55 tests passed**. The 0.2.1 TAP record is `LOADING_TEST_RESULTS.txt`. This includes the existing core, editor and worker tests plus 17 loading/fallback/measurement tests. Tests cover the 499/500 ms boundary, no completion wait on fast requests, the 400 ms visible-only finish, reduced motion, a request lasting beyond 20 seconds, monotonic feedback, cancellation before display and during completion, progress messages leaving workers alive, stale replies, worker failures, deterministic matching fallbacks, certificate replay, and unchanged generated results with progress observers.

The story bypass and removed region dropdown have source-level checks here; end-to-end behavior is specified in `tests/e2e/loading.spec.js` but has not been executed against the production app. The current native-worker browser integration is therefore not marked passed.

The benchmark ran **280 fresh Node workers**, all returning replay-verified boards. The complete method and per-difficulty/per-region results are in `BENCHMARKS.md`; the raw file is `benchmarks/node-worker.json`. Node worker tests do not establish browser performance. Forced exhaustion tests validate fallback selection even though no sampled benchmark request needed one.

## Current unverified checks

The npm registry could not be resolved in this environment. Dependency installation, ESLint, the official Vite production build, actual packaged flags and the updated Vue interface remain unverified. Local Chromium navigation additionally failed with `ERR_BLOCKED_BY_ADMINISTRATOR`. No reconstructed UI run, native-browser generation result, production browser benchmark or live deployment is claimed for v0.2.1.

Five additional Playwright specifications cover fast replies, delayed feedback and finish timing, story-mode bypass, cancellation after 20 seconds and removal of the region dropdown. They use controlled workers to exercise UI timing; existing live-worker checks must also be run. The standalone browser benchmark script instead instruments the real production workers. Both sets remain to be executed on a networked development machine.

After installation, run `npm run check`, `npx playwright install chromium`, `npm run test:e2e` and `npm run benchmark:browser`. Check physical lower-powered devices separately. These benchmarks and automated checks are not human difficulty or educational-effectiveness evaluations.

---

# Earlier v0.2.0 verification record

Recorded 14 November 2026. These results distinguish tested core logic, reconstructed UI checks and the production build that remains unverified.

## Core and worker-source tests: passed

Command: `node --test tests/*.test.js`, Node 22.16.0.

**38 tests passed, zero failed, skipped or cancelled.** The complete TAP output is in `TEST_RESULTS.txt`.

Coverage includes immutable movement, blocked moves, row boundaries, country-specific destinations, initially uncovered targets, completion, restart resetting the move count, undoing restart, and restoration through **50,000 undo snapshots**. Seed tests cover versioned codes, UTC dates, malformed inputs, deterministic generation and separate planning variants. Localization tests check the three dictionaries and country names. Source checks require actual `<script setup>` components and reject a standalone distribution or gameplay timer.

The suite checks all **42 frozen story layouts**: 21 stops, each with a gentle and more constrained version. It independently solves the boards and replays the certificates, verifies geographic placement and validates challenge passage crossings. This is not 42 separate story chapters. All 42 layouts also pass Tiled JSON round-trip tests. The editor command-line tool was additionally exercised by exporting and importing the more constrained Oceania stop `G2-OC-S3-P`, including an independent solver check on import.

A deterministic sample of **840 generated boards** passed: 700 gentle boards and 140 puzzle-challenge boards across the seven regions. Challenge tests require a flag to cross a barrier and enforce a push-distance lower bound. Gentle layouts limit accepted solution pushes. Finite samples do not establish that every possible code can be generated within the budget, nor that the puzzles are enjoyable or appropriately difficult.

Hint tests cover the selected box, useful pushes, route segments, delivery checkpoints and guidance advancing as moves are followed. Deadlock tests distinguish a solved continuation, proven impossibility and a search budget exhausted without an answer. The exact solver-worker and generation-worker source modules were exercised with a Node worker adapter, including malformed messages. This validates worker logic, not browser/Vite worker integration.

## Reconstructed interface smoke checks: passed with limitations

A private Chromium harness exercised the component scripts and templates against a Vue runtime. **89 assertions passed**, with no captured runtime console errors. The result list is in `BROWSER_CHECKS.json`.

Checks included default faded targets, keyboard movement, move/reset/undo-reset/undo counts of 1/0/1/0, progressive hints and their optional pause bypass, route advancement, explicit geography reveals, opening all 42 story boards, completing a chapter, region flight transitions, all four challenge presets, preservation of challenge on the next stop, options without losing the move count, reduced motion, disabling hint delays, and 390-pixel mobile widths in English, Brazilian Portuguese and Spanish.

**This was not the Vite build.** The environment could not install the official compiler or packages, so the harness reconstructed component bindings, used a separately available Vue runtime and substituted labelled SVG flag assets. It did not verify actual flag images, Vue's SFC compiler, scoped-CSS rewriting, asset URLs, browser module workers, HTTP routing or deployed pages. The reconstruction code and mock assets are not part of the delivered project and are not an alternative distribution. No standalone HTML preview is shipped.

## Not successfully run here

Package installation failed with `EAI_AGAIN` while reaching the npm registry. The short failure log is in `INSTALL_FAILURE.txt`. Consequently, the following remain unverified:

- Dependency resolution, the official Vite production build, ESLint and real package flag rendering.
- The ten Playwright specifications under `tests/e2e/` against the actual build, in desktop and mobile projects. Their coverage includes live module workers and repository-subpath navigation.
- GitHub Actions and a live GitHub Pages deployment, native clipboard/share APIs and cross-browser behavior.
- Editing in the Tiled desktop application, screen-reader usability and human difficulty/learning outcomes.

No dependency lockfile is fabricated. Generate and review `package-lock.json` on a networked machine and commit it. Both workflows use `npm ci` once it exists; the unlocked bootstrap path is explicitly warned about.

## Release verification

Use a supported Node version, run `npm install`, inspect and commit the lockfile, then run `npm run check`. Install Playwright Chromium with `npx playwright install --with-deps chromium` and run `npm run test:e2e` against the production preview. Test a repository subpath with `BASE_PATH=/your-repository/ npm run build` and the same variable for the end-to-end command. The included Pages workflow derives its base path from GitHub's configuration.

On the actual hosted site, verify that all flag assets load, random and daily generation complete in module workers, and a hint after moving uses the current state rather than the initial certificate. Check cancellation, a proven deadlock, an unknown result and worker failure. An unknown result must never become a deadlock warning.

Check zero-count restart, repeated undo including restart, and undo after completion. Check the default, geography-only, puzzle-only and combined variants independently. Verify that sharing preserves the code, planning suffix and geography setting. Compare daily codes around 00:00 UTC and across locales. There is no elapsed-play timer to test in this prototype.

Review all three languages with fluent speakers. Try keyboard, touch, visible focus, reduced motion, text alternatives, narrow displays and clipboard-denied fallback. Review map provenance, geographic prompts and offshore docks. Observe students playing the gentle defaults before making any claim about educational effectiveness or challenge balance. Solver proof is not human playtesting.
