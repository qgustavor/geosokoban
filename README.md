# GeoSokoban — prototype

An independent, open-source geography puzzle inspired by GeoJogos. This experiment is not the official GeoSokoban, a replacement for it, or an endorsed collaboration. Its purpose is to explore ideas the original author can inspect and reuse.

## Source update 0.2.6

Generated puzzles now use bent partitions, switchbacks, courtyards, staggered rooms and obstacle islands rather than only a straight wall with a goal-sized gap. A new pool of 48 independently certified templates supplies bounded-search fallbacks; safe seeded additions vary their scenery-independent obstacle layouts. Existing story drafts are preserved.

Generation reuses warm workers, geographic samples and solver buffers. A versioned, bounded memory/local-storage cache restores previously generated boards without another search. On the same 14-code development corpus, fresh-worker median time changed from **5.23 s to 0.57 s**. The new run used certified templates for 12/14 requests: the gain includes a smaller search budget, not just lower-level optimization. These are Node measurements, not browser or phone timings.

Level changes dismantle the outgoing board and assemble the next one tile by tile. The clear banner uses bold outlined letters with staggered scale, upward hop and landing squash. The first hint is immediate; subsequent requests require at least **10 seconds**, with a translated countdown. Map context and country borders use **4 × 4 logical pixels per gameplay cell**, aligned to the same grid origin and prebuilt into compact orthogonal SVG paths.

**Verification:** 134 Node tests pass, including independent template certification, caching, hint cooldowns and pixel-map alignment. Isolated Chromium checks cover the banner's CSS in three languages and four viewport sizes. Dependency installation failed in this environment; the official lint, Vite build and Playwright application suite remain unverified. See `docs/V2_6_TESTING.md`, `docs/V2_6_CHANGES.md` and `docs/BENCHMARKS.md`.

## Develop

Use Node 22.13+ on the Node 22 line, or Node 24+.

```sh
npm install
npm run dev
```

This is a normal **Vue + Vite** application. Every interface component is a `.vue` single-file component using **`<script setup>`**. There is no standalone HTML export, alternate application, handwritten SFC compiler, runtime-template build, backend, or CDN dependency during play.

```sh
npm test                       # Rules, geography, generation, optima, hints and workers
npm run lint                   # Neostandard and Vue rules
npm run build                  # Production assets in dist/
npm run preview                # Local HTTP preview of dist/
npm run test:e2e                # Playwright dev/production tests
npm run benchmark -- --samples 2
npm run benchmark:browser -- --samples 2
```

The patch adds no dependencies. Existing installations can retain node_modules and their lockfile. This source environment could not resolve the npm registry; no lockfile has been fabricated. For a new checkout, install, review and commit the generated lockfile before switching to `npm ci`.

## Prepare scenery

The distributed biome atlas is **unprepared** because the source service could not be reached here. Until preparation succeeds, land scenery uses neutral boulders and pebbles, not invented biome boundaries.

```sh
npm run biomes:prepare
npm run biomes:verify
```

These Node scripts need no installed npm libraries. Run once with source-data access, then commit `src/content/scenery-atlas.json`. A local RESOLVE GeoJSON export is supported; see `docs/SCENERY_AND_ART.md`. Players never download the source polygons. The publication workflow rejects an unprepared atlas. **The 0.2.5 → 0.2.6 patch does not modify an atlas you have already prepared.**

## Modes and difficulties

The selector offers Daily / Random / Story, with no region setting. Daily region selection is date-based; random selection uses the shareable seed. The story itinerary covers South America, North America/Caribbean, Eastern Europe, Western Europe, Africa, Asia and Oceania. Its 21 stops each have two fixed layout variants: 42 boards, not 42 chapters. They remain generated drafts for human editing.

| Difficulty | Targets | Daily/random layout |
| --- | --- | --- |
| Easy | Small faded flags | Delivery-order puzzles |
| Medium | Question marks | Same layouts as Easy |
| Hard | Question marks | Delivery order and stronger repositioning filters |

All retain unlimited undo, zero-count restart, geography clues and progressive hints. Restart is undoable. Deadlock checks remain silent unless impossibility is proven. Keyboard and swipe input are available; Undo, Restart, Hint and Menu form the discreet HUD. There is **no elapsed gameplay timer, score, account, telemetry, ranking or server**. Native sharing has a visible in-app fallback.

Portuguese, English and Spanish are included. Options contains language and reduced motion. Hint requests have a non-skippable ten-second cooldown; opening or hiding the hint panel does not reset it. The globe's facing animation and plane artwork are preserved; level changes use tile transitions.

## Loading and generation

The selector and fixed story boards open without loading world geography. Daily/random preparation requests it on demand and accepts both raw gzip and HTTP-decoded JSON. A loader appears only after 500 ms without a completed board, including map download. Fast completion has no display hold; a visible bar finishes over 400 ms. Story mode does not use generation feedback.

Deterministic candidate/state budgets select a validated fallback when exhausted, not an error caused by elapsed time. Slower devices do not receive easier boards. Previously generated codes are read from the versioned cache before requesting geography or a worker. Successful workers stay warm; cancellation terminates active work. Fresh searches use smaller deterministic work budgets and the new varied certified pool. See `docs/LOADING.md` and `docs/BENCHMARKS.md`.

Generator algorithm version 5 and fallback version 5 are included. Existing `G2` code syntax remains a prototype identifier, **not a promise that old seeds produce old layouts across releases**. No legacy generator is shipped. Compare scores only within the same source/content version. Raising the minimum move gap requires rebuilding and verifying the fallback pool as well as updating the generator.

## Routes and hosting

Vue Router uses hash history. A puzzle link looks like `#/puzzle/G2-SA-S1-P?g=remember`. The selector is `#/`; standalone `#/options` and `#/credits` routes also exist for direct entry. In-game and selector buttons use dialogs, not navigation. Active session state is owned above routed components; full page reload restores the puzzle start, not saved move history.

Publish `dist/` using the manual GitHub Pages workflow. No server rewrite rules, custom headers, cross-origin isolation or standalone export are needed. Module workers exchange normal messages. The workflow and live deployment remain unverified here.

```sh
BASE_PATH=/geosokoban-test/ npm run build
BASE_PATH=/geosokoban-test/ npm run test:e2e
```

## Project organization

`src/core` contains framework-independent rules, generator, solver and certificates; `src/geo` handles loading and projection; `src/scenery` chooses deterministic artwork without changing topology; `src/ui` contains SFCs; `src/composables` owns sessions/assistance; `src/pages` and `src/router` handle navigation. Prepared content is in `src/content`. Scripts prepare outlines, biomes, flags, fallbacks and editor files. Tests and documentation distinguish actual results from unexecuted browser specifications.

## Edit content

All 42 fixed layouts have Tiled maps in `levels/editable`.

```sh
npm run levels:export -- G2-SA-S2 levels/editable/G2-SA-S2.tmj
npm run levels:import -- levels/editable/G2-SA-S2.tmj --story
npm run fallbacks:prepare
```

The story importer validates and solves a board before replacing it; see `docs/EDITING.md`. Fallback preparation is a separate, potentially expensive offline process, never part of browser startup. Story editing does not silently change daily fallbacks.

The world fixture contains 177 Natural Earth features, not an exhaustive current atlas. Its exact upstream release was not recorded; hashes and transformations are in `docs/map-source.json`. Review boundaries, territories, flags, missing small islands and curriculum suitability before deployment. Do not infer real mountain ranges from schematic puzzle barriers. See `docs/DESIGN.md`, `docs/SCENERY_AND_ART.md` and `docs/SOURCES.md`.

Original code and artwork are MIT-licensed. Third-party data/assets retain their own attribution and terms. The full game's optional hidden ranking tie-breaker, including resetting elapsed time with moves on restart, is documented in `docs/INTEGRATION.md`.
