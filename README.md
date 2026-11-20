# GeoSokoban — prototype

An independent, open-source geography puzzle inspired by GeoJogos. This experiment is not the official GeoSokoban, a replacement for it, or an endorsed collaboration. Its purpose is to explore ideas the original author can inspect and reuse.

## Source update 0.2.6

Generated puzzles now use bent partitions, switchbacks, courtyards, staggered rooms and obstacle islands rather than only a straight wall with a goal-sized gap. A new pool of 48 independently certified templates supplies bounded-search fallbacks; safe seeded additions vary their scenery-independent obstacle layouts. Existing story drafts are preserved.

Generation reuses warm workers, geographic samples and solver buffers. A versioned, bounded memory/local-storage cache restores previously generated boards without another search. On the same 14-code development corpus, fresh-worker median time changed from **5.23 s to 0.57 s**. The new run used certified templates for 12/14 requests: the gain includes a smaller search budget, not just lower-level optimization. These are Node measurements, not browser or phone timings.

Level changes dismantle the outgoing board and assemble the next one tile by tile. The clear banner uses bold outlined letters with staggered scale, upward hop and landing squash. The first hint is immediate; subsequent requests require at least **10 seconds**, with a translated countdown. Map context and country borders use **4 × 4 logical pixels per gameplay cell**, aligned to the same grid origin and prebuilt into compact orthogonal SVG paths.

**Verification:** The test suite has been replaced with 24 behavior-focused Node tests and five Playwright journeys (desktop and mobile). Node tests pass; lint, the production build and browser execution remain unverified because dependency installation failed with npm registry DNS errors. See `docs/TESTING.md` for scope and commands. Earlier versioned verification reports are historical, not results for this suite.

## Develop

Use Node 22.13+ on the Node 22 line, or Node 24+.

```sh
npm ci
npm run dev
```

This is a normal **Vue + Vite** application. Every interface component is a `.vue` single-file component using **`<script setup>`**. There is no standalone HTML export, alternate application, handwritten SFC compiler, runtime-template build, backend, or CDN dependency during play.

```sh
npm test                       # Focused gameplay, content, persistence and worker checks
npm run lint                   # Neostandard and Vue rules
npm run build                  # Production assets in dist/
npm run preview                # Local HTTP preview of dist/
npm run test:e2e                # Playwright dev/production tests
npm run benchmark -- --samples 2
npm run benchmark:browser -- --samples 2
```

The cleanup adds no dependencies and leaves the committed lockfile unchanged. Use `npm ci` for a clean installation. Dependency installation could not complete in this environment because the npm registry did not resolve.

## Prepare scenery

The distributed biome atlas is **prepared** and validated during CI. Regenerate it only when intentionally updating scenery data:

```sh
npm run biomes:prepare
npm run biomes:verify
```

These Node scripts need no installed npm libraries. Preparation needs source-data access; reproduction needs the cached source. Commit a reviewed `src/content/scenery-atlas.json` after changing it. A local RESOLVE GeoJSON export is supported; see `docs/SCENERY_AND_ART.md`. Players never download the source polygons. The publication workflow rejects an unprepared atlas and never regenerates it automatically.

## Modes and difficulties

The selector offers Story / Daily / Past puzzles, with no seed or region controls. It remembers the last chosen mode and difficulty. Past puzzles has day arrows and a styled native date field, bounded by today's UTC date. Forced future puzzle routes return directly to the menu. Daily and archived puzzles use the date and difficulty, never the viewport, to choose their board.

Story follows the 21 fixed standard boards across South America, North America/Caribbean, Eastern Europe, Western Europe, Africa, Asia and Oceania. There is no story difficulty picker, no procedural story generation and no per-level share dialog: dialogue leads to the next stop, with one aggregate result after the ending. Existing layouts and dialogue are unchanged; the unused hard story variants remain in the editing assets. Playing story does not overwrite the player's preferred daily/archive difficulty.

| Difficulty | Targets | Daily/archive layout |
| --- | --- | --- |
| Easy | Small faded flags | Delivery-order puzzles |
| Medium | Question marks | Same layouts as Easy |
| Hard | Question marks | Delivery order and stronger repositioning filters |

All retain unlimited undo, zero-count restart, geography clues and progressive hints. Restart is undoable. Deadlock checks remain silent unless impossibility is proven. Keyboard and swipe input are available; Undo, Restart, Hint and Menu form the discreet HUD. An optional **Speedrun** setting times new runs and adds elapsed time to shared results. Story keeps one clock from the first board to the final solve, including dialogue, pauses and time away; its saved clock and aggregate results survive reloads. Restart and undo do not reset an active run's clock. There is no account, telemetry, ranking or server. Native sharing has a visible in-app fallback.

Portuguese, English and Spanish are included. Options contains language, reduced motion, audio and the optional Speedrun setting. Hint requests have a non-skippable ten-second cooldown; opening or hiding the hint panel does not reset it. The globe's facing animation and plane artwork are preserved; level changes use tile transitions.

Single-finger swipes move the character. Two-finger pinches and drags operate the board camera, not the page or HUD. Large maps start closer on narrow screens, with a Full map / Closer view button; the next movement brings the player into view. Menu browser zoom remains available. See `docs/MODES_TOUCH_TESTING.md` for timing rules, verification and remaining checks.

## Loading and generation

The selector and fixed story boards open without loading world geography. Daily/archive preparation requests it on demand and accepts both raw gzip and HTTP-decoded JSON. A loader appears only after 500 ms without a completed board, including map download. Fast completion has no display hold; a visible bar finishes over 400 ms. Story mode does not use generation feedback.

Deterministic candidate/state budgets select a validated fallback when exhausted, not an error caused by elapsed time. Slower devices do not receive easier boards. Previously generated codes are read from the versioned cache before requesting geography or a worker. Successful workers stay warm; cancellation terminates active work. Fresh searches use smaller deterministic work budgets and the new varied certified pool. See `docs/LOADING.md` and `docs/BENCHMARKS.md`.

Generator algorithm version 5 and fallback version 5 are included. Puzzle codes use readable region names, dates or word pairs, with `-hard` for planning puzzles. This prototype has no compatibility layer for previous code or preference formats; obsolete codes are rejected rather than translated. Compare scores only within the same source/content version. Raising the minimum move gap requires rebuilding and verifying the fallback pool as well as updating the generator.

## Routes and hosting

Vue Router uses hash history. A puzzle link looks like `#/puzzle/2026-11-19-hard?g=remember`; story uses names such as `#/puzzle/south-america-tour-1`. The selector is `#/`; standalone `#/options` and `#/credits` routes also exist for direct entry. In-game and selector buttons use dialogs, not navigation. Active session state is owned above routed components; full page reload restores the puzzle start, not saved move history.

The **CI and Pages** workflow validates branch pushes, pull requests, and manual runs. After validation succeeds, pushes and manual runs on the repository's default branch publish the same `dist/` that the browser tests exercised. Other branches and pull requests never publish. See `docs/DEPLOYMENT.md` for the one-time Pages setup and required-check recommendation. No server rewrite rules, custom headers, cross-origin isolation or standalone export are needed. Module workers exchange normal messages. A GitHub-hosted workflow run and live deployment remain unverified here.

```sh
BASE_PATH=/geosokoban-test/ npm run build
BASE_PATH=/geosokoban-test/ npm run test:e2e
```

## Project organization

`src/core` contains framework-independent rules, generator, solver and certificates; `src/geo` handles loading and projection; `src/scenery` chooses deterministic artwork without changing topology; `src/ui` contains SFCs; `src/composables` owns sessions/assistance; `src/pages` and `src/router` handle navigation. Prepared content is in `src/content`. Scripts prepare outlines, biomes, flags, fallbacks and editor files. Tests and documentation distinguish actual results from unexecuted browser specifications.

## Edit content

All 42 fixed layouts have Tiled maps in `levels/editable`.

```sh
npm run levels:export -- south-america-tour-2 levels/editable/south-america-tour-2.tmj
npm run levels:import -- levels/editable/south-america-tour-2.tmj --story
npm run fallbacks:prepare
```

The story importer validates and solves a board before replacing it; see `docs/EDITING.md`. Fallback preparation is a separate, potentially expensive offline process, never part of browser startup. Story editing does not silently change daily fallbacks.

The world fixture contains 177 Natural Earth features, not an exhaustive current atlas. Its exact upstream release was not recorded; hashes and transformations are in `docs/map-source.json`. Review boundaries, territories, flags, missing small islands and curriculum suitability before deployment. Do not infer real mountain ranges from schematic puzzle barriers. See `docs/DESIGN.md`, `docs/SCENERY_AND_ART.md` and `docs/SOURCES.md`.

Original code and artwork are MIT-licensed. Third-party data/assets retain their own attribution and terms. The full game's optional hidden ranking tie-breaker, including resetting elapsed time with moves on restart, is documented in `docs/INTEGRATION.md`.
