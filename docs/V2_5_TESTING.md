# Verification — source update 0.2.5

## Executed

`node --test tests/*.test.js`: **101 passed**, no failures. Full output: `V2_5_NODE_TEST_RESULTS.txt`.

Coverage includes all 42 existing story boards, a 42-request default generated corpus (three seeds × seven top-level regions × two layout families, plus deterministic repeats), and all 48 replacement fallback boards. Fallback tests recompute both exact move optima, check the five-move difference and independently check push/design certificates. There is no claim that the old 840-generated-board corpus was rerun on this release.

The move-optimal search was compared against independent unit-step breadth-first search on **300 small boards**, including unsolvable states. These finite tests supplement the algorithm's admissibility reasoning; they are not an exhaustive proof for all possible inputs. Other checks cover move-gap rejection and uncertified budget results, immutable relaxed baselines, completion timing/cancellation, viewport margins, coastline extraction, state transitions, geography, 50,000 undo snapshots, reset, worker replies, decoding, hints, dictionaries and editor round trips.

A separate 28-request fresh-worker benchmark completed after the first full suite, with solution replay and no request failures. Median 3.15 s, p95 6.62 s, 19 fallbacks. See `BENCHMARKS.md` and `benchmarks/v2.5-node-worker.json`. The final rerun updates only presentation estimates and the atlas-test pool import, not the generator being benchmarked.

All JavaScript files pass Node syntax checking. All 22 complete SFC templates were checked with the locally available Vue 3.5.13 runtime compiler; `<script setup>` bodies were checked for JavaScript syntax. Report: `V2_5_TEMPLATE_CHECK.json`. This is not the pinned package version, official compiler-sfc pipeline, lint or import-resolution verification.

Prepared map outlines reproduce with `npm run maps:check`. The biome checker correctly reports the bundled atlas as unprepared. The biome data importer was not rerun successfully and no biome field survey or human playtest is claimed.

## Limited component inspection

An inspection-only, in-memory Chromium harness reconstructed component bindings, used Vue 3.5.13 and substituted fixture flag SVGs. It rendered the actual PlayView/GameBoard templates on desktop and a 390 px viewport, exercised the story-solution delivery label → clear banner → results sequence, checked the result menu action/no result Undo, and reported no captured runtime errors or horizontal mobile overflow.

This harness does **not** test the official SFC compiler, true scoped-style transformation, actual npm flags, Vue Router/controller integration, Vite URLs, native generation workers or the deployed application. It is not shipped as an alternate application. Component inspection is not a production-browser pass; screenshots from it would need the same qualification.

## Not verified

Package installation remains blocked by registry DNS (`EAI_AGAIN`). Local Chromium HTTP navigation was blocked (`ERR_BLOCKED_BY_ADMINISTRATOR`). Consequently the official Vite build, ESLint, dev/production Playwright suites, real flag asset rendering, native browser worker integration and GitHub Pages publication remain unverified. The relevant specifications were updated, not recorded as passed.

On an installed checkout run `npm run check`, then `npm run test:e2e` after installing Playwright browsers. Test the deployed repository subpath, clipboard-denied and share-cancel paths, all three languages, touch/keyboard input, reduced motion and real lower-powered devices. Check modal Options without a URL change or lost undo history and the delayed victory sequence. Test generated daily/random boards rather than judging the changed generator from unchanged story drafts.

## Content and release scope

Story layouts, their Tiled maps, flag dependencies, the globe and plane artwork, the compressed map and the biome atlas are unchanged. The patch leaves a locally prepared scenery atlas and dependency lockfile untouched. The generator and frozen fallback pool changed; old seed layouts are not preserved. Human puzzle quality, recall improvement and difficulty calibration remain unmeasured.
