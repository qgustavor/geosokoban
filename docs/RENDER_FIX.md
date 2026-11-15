> For current interface, generation and test status, see `V2_5_TESTING.md`, `CHALLENGES.md` and the README. Earlier implementation details below are historical where superseded.

> Historical implementation record. Current interface and scenery changes are documented in `SCENERY_AND_ART.md`; current test status is in `V2_4_TESTING.md`.

# Board-rendering regression — v0.2.3

## Report and cause

The supplied Firefox console screenshot shows a render exception in `GameBoard.vue`, followed by component-update and router warnings. The visible page contains the header and footer but not the menu body. The exception is `Geography must be loaded before generating a puzzle`.

The v0.2.2 startup change moved `loadGeography()` out of application startup. However, the menu still mounts `HomeView`'s story-board preview. `GameBoard` computed its country paths by calling `rasterize(level.region, level.threshold)`. That function requires the world singleton. A first visit therefore failed before any generated-puzzle request could load it. A fresh story deep link had the same dependency. Loading a random puzzle first could conceal the problem by populating the singleton.

The routing warnings in this stack are downstream of the render exception; changing route paths or preloading the map in a navigation guard would not correct the separation of rendering and generation. The gzip decoder remains unchanged.

## Correction

`GameBoard` now gets paths from `outlinesForLevel(level)` in `src/geo/outlines.js`. This is a synchronous lookup into the committed `src/content/map-outlines.json` presentation asset. It never imports the world loader or rasterizer and does not perform network requests.

The atlas contains only the projected country identifiers and SVG paths, grouped by the eight existing projections: the seven top-level regions and the Caribbean. Its paths use the same 40-unit tile coordinates as the board. Metadata records the map version and each projection's dimensions; incompatible versions or dimensions receive no country overlay rather than incorrect borders. Existing boards retain their outlines, country selection and boat-island scenery.

The atlas is produced from the bundled world and the existing rasterizer, not traced from the reference screenshots. Land thresholds change playable cells, not the projection of country boundaries. Tests compare the paths at all four thresholds. No puzzle floors, targets, boxes, obstacles, solutions, codes or generator versions have changed.

The main menu, Options, Credits and story boards need no runtime world-map download. Daily and random generation still request and decode world geography on demand. The 500 ms loading policy is unchanged. The presentation atlas is bundled with the application, so this is not a claim that the initial application payload contains no geographic artwork.

## Maintaining the atlas

After changing geography or the region projection definitions:

```sh
npm run maps:outlines
npm run maps:check
```

Commit the generated JSON with its source changes. The prebuild hook and a Node regression test check for a stale or missing atlas. These commands read local files; they do not download geography. Ordinary developers do not need to regenerate it after extracting this release.

## Verification boundary

See `RENDER_TEST_RESULTS.txt` and the current entry in `TESTING.md` for executed checks. The new tests reproduce the old failure in a fresh Node process and read all story/fallback paths without initializing geography. They check projection equality and the board renderer's local dependency graph. These are not Vue SFC rendering tests.

The Playwright startup suite now asserts that the menu preview and story country paths are actually visible, blocks all world-map requests and captures page errors. It includes fresh story loads across all eight projections in both puzzle settings and menus in all three languages. Those browser tests are included but were not executed here because project dependencies could not be installed. Run both production preview and development-server checks locally:

```sh
npm run check
npx playwright install chromium
npm run test:e2e -- tests/e2e/startup-routing.spec.js
```

For the development-server pass, set `E2E_SERVER=dev` before the final command (`$env:E2E_SERVER='dev'` in PowerShell). The project CI configuration already includes both preview and development-server startup checks.

## Updating an existing checkout

Apply the v2.2-to-v2.3 patch or extract the full archive into a clean directory. No dependency was added or changed. Restart Vite after replacing the files. Keep your existing lockfile; the archive does not manufacture one. An existing lockfile can be refreshed by your normal install command to reflect the package version change.
