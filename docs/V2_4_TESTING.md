# Verification — source update 0.2.4

## Executed successfully

Node 22.16.0, `node --test tests/*.test.js`: **92 passed, zero failed, skipped or
cancelled**, about 58.4 seconds. Full TAP record: `V2_4_NODE_TEST_RESULTS.txt`.

The suite includes all existing engine, solver, seed, story, editor, transport,
worker-source and loading tests, plus scenery, presentation-helper and outline
checks. It replays all 42 fixed story boards, checks 700 gentle and 140 existing
constrained generated boards, and restores 50,000 undo snapshots. Passing the
existing challenge filters is not evidence of improved human puzzle difficulty.

New checks cover polygon holes and multipolygons, antimeridian handling, inverse
projections for all eight board grids, land-masked sampling, regional palette rules,
neutral fallback for unknown/stale data, deterministic scenery, initially clear
goals, unchanged obstacle sets and unchanged solutions. Source polygons in these
tests are explicitly synthetic geometry fixtures, not a stand-in dataset.

Swipe helper tests cover the threshold, pointer identity, cancellation and bounded
long drags. Sharing helper tests cover native success, unsupported/rejected native
sharing, and abort-without-fallback. Route helper and source checks cover the three
difficulties, question marks, overlays and directional character design. These are
not browser gesture or accessibility tests.

`npm run maps:check` passed: the committed country-context atlas matches the bundled
geography and original projections. All JavaScript source, scripts and browser-test
files passed `node --check`. Literal UI translation keys exist in all three dictionaries.

Twenty-one SFC template bodies compiled with an isolated archived Vue 3.5.13 runtime
compiler, and their extracted script bodies passed syntax checks. Four artwork
component templates were rendered through a diagnostic custom renderer and inspected
as an SVG rasterization. This is **not the official SFC/Vite build**, does not verify
scoped-style compilation, and is not a browser execution of the app. No reconstructed
application, handwritten compiler or alternate HTML game is included in the archive.

`node scripts/check-biomes.js` correctly reports the unprepared atlas. Its
`--require-data` form correctly exits unsuccessfully. The production Pages workflow
uses that strict check so a neutral-only atlas is not accidentally published as a
completed biome implementation.

## Not completed / not verified

The real global biome source could not be downloaded: see
`V2_4_BIOME_IMPORT_FAILURE.txt`. The importer, actual geographic coverage, sampling
runtime and final atlas size have **not** been verified against the full source.
The bundled atlas is unprepared. It must not be described as a completed biome map.

Npm registry access was unavailable. An offline installation also failed because
required dependencies were not cached (`V2_4_INSTALL_FAILURE.txt`). No lockfile was
fabricated. ESLint, the official production Vite build, packaged flags, native module
worker integration, actual pointer/touch behavior, clipboard/share sheets and the
routed browser UI remain unverified in this environment.

A local Chromium artwork inspection attempt did not produce a usable capture. The
included art inspection uses CairoSVG, not that browser attempt. No browser test is
reported as passed. Updated Playwright specifications cover current selectors,
startup without map downloads, story routes, delayed generation, swipes, modals,
three difficulty choices and visible share fallback; they have not run here.

The generator's puzzle patterns, difficulty filters, 42 fixed boards and backend
scope are unchanged. No human difficulty calibration or completed narrative pass
was performed. All prior benchmark results remain historical; this update does not
supply new browser performance numbers.

## Verify on a networked development machine

```sh
npm install
npm run biomes:prepare
npm run biomes:verify
npm run check
npx playwright install chromium
npm run test:e2e
```

`biomes:prepare` also accepts a complete local RESOLVE GeoJSON export; see
`SCENERY_AND_ART.md`. Review/commit the resulting atlas and the dependency lockfile.
The source cache can stay outside Git. A normal app build does not download it.

Test a real touch device as well as the desktop browser. Verify accidental taps,
multitouch cancellation, focus in dialogs, reduced motion, keyboard-only interaction,
all three languages and sharing with native APIs disabled. Start with the map request
blocked: the selector and fresh story boards must still work. Before public release,
review several Caatinga, forest, dry, montane and water locations against the source,
and playtest Hard for actual interactions rather than solver length alone.
