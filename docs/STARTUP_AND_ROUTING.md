> For current interface, generation and test status, see `V2_5_TESTING.md`, `CHALLENGES.md` and the README. Earlier implementation details below are historical where superseded.

> Historical implementation record. Current interface and scenery changes are documented in `SCENERY_AND_ART.md`; current test status is in `V2_4_TESTING.md`.

> **v0.2.3 correction:** the v0.2.2 startup separation below was incomplete. `GameBoard` still called the rasterizer while rendering the menu preview and fresh story boards. This is fixed by the independent precomputed outline atlas; see `RENDER_FIX.md`. The v0.2.2 Node results below did not establish successful Vue rendering.

# Startup, geography transport and URL routing

## The reported failure

The 0.2.1 source contained two independent defects:

1. `loadGeography()` always passed the fetched body through `DecompressionStream('gzip')`. Vite uses sirv for static files; sirv can serve a `.gz` asset with `Content-Encoding: gzip`. Fetch decodes that HTTP content encoding before exposing the body. The loader then tried to decompress JSON as gzip, producing an incorrect-header error.
2. `main.js` awaited geography before mounting Vue. Consequently, an unnecessary map request could prevent the main menu from appearing.

The shipped compressed file is intact: it decompresses to a nonempty GeoJSON FeatureCollection with 177 features. This is a transport-handling bug, not evidence that the geography fixture was damaged or that dependency installation failed. The fixture and generator have not changed in 0.2.2.

The Node HTTP regression serves the real file with `Content-Encoding: gzip`, reproduces the failure using the former decompression expression, then successfully reads the same response with the new decoder. This is a real HTTP/Fetch test, not a direct invocation of zlib alone. It is not a claim that the Vite application has been run successfully in a browser here.

Upstream references:

- Vite static middleware: https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/middlewares/static.ts
- sirv header construction: https://github.com/lukeed/sirv/blob/master/packages/sirv/index.mjs
- Fetch content decoding: https://fetch.spec.whatwg.org/#concept-http-network-fetch

## Geography transport

`src/geo/world.js` reads the bytes actually exposed by Fetch. If they begin with the gzip signature, it decompresses them once. Otherwise, it parses them as UTF-8 JSON. It validates that the result is a nonempty FeatureCollection before caching it.

This handles raw compressed files, transport-decoded JSON and plain JSON. The filename and response header alone do not determine which representation JavaScript receives. Invalid responses, HTML error pages, malformed JSON and corrupt gzip are errors rather than successful maps. The code does not request special hosting headers or patch the development server.

`loadGeography({ signal })` is cancellable. Only completed, validated data is cached. Failures and cancellations do not leave a permanently rejected promise in the cache; retrying issues a fresh request. Concurrent callers are not deduplicated; the application keeps at most one active puzzle-preparation request.

## Startup and preparation

`main.js` mounts Vue with the router without awaiting geography. The menu, Options, Credits and fixed story boards do not fetch the world asset. Menu decoration uses an existing story board, not the generator.

A daily or random request starts the preparation feedback clock, loads geography on demand, and then creates the generation worker. The 500 ms delay now covers **the entire preparation request, including the first map fetch**, not only worker execution. The existing Node-worker benchmark excludes that network transfer and must not be presented as an end-to-end cold-start measurement.

A fast request still has no progress bar or artificial completion hold. Story mode has neither a map fetch nor generation feedback. Longer generated requests retain cancellable progress, the existing completion animation and reduced-motion behavior.

Map errors are shown only after a generated puzzle has been requested. They offer Try again and Home in English, Portuguese and Spanish. A failure does not replace the existing session or blank the application. Details remain in developer-console diagnostics rather than player-facing text. Cancel and navigation abort pending map requests or terminate workers; request revisions prevent stale completions from replacing the current session.

A direct generated-puzzle route necessarily starts preparation rather than opening the menu first. A plain visit to the application root opens the menu.

## Vue Router

The application uses the official `vue-router` package, `createWebHashHistory()`, named routes and `RouterView`. There is no application-maintained `hashchange` listener, view-name state machine or manual History API update for share links.

| Fragment | Screen |
| --- | --- |
| `#/` | Main menu |
| `#/puzzle/G2-SA-S1?g=learn` | Story board |
| `#/puzzle/G2-SA-D20261114?g=learn` | A particular daily puzzle |
| `#/puzzle/G2-SA-0123456789-P?g=remember` | Shared seed with both challenges |
| `#/options` | Options |
| `#/credits` | Credits |

The seed code still determines region, daily date or story stop and mechanical challenge. The query `g=learn` or `g=remember` determines geography guidance. No region selector is added. Refreshing a puzzle link reconstructs its starting position; it does not restore move-by-move session state after a full page reload.

`router.resolve(puzzleLocation(...))` constructs share URLs. Existing links such as `#p=G2-SA-S1&g=learn` redirect to the equivalent named route. Invalid puzzle codes are not fed into generation; unknown routes show a translated not-found page.

The root game controller owns the active session, including its unlimited undo history, independently of route components. Going to Options or Credits and returning to the same puzzle is designed to reuse that session rather than start it again. Returning to a different puzzle reconstructs that puzzle; this is not a cache of every board ever visited.

`src/pages/*.vue` are small routed adapters to the existing UI components. All use `<script setup>`. `src/composables/useGameController.js` owns the game interaction state; `src/ui/App.vue` contains the application shell and `RouterView`.

## GitHub Pages

The router's default hash-history base preserves the current pathname, including a repository deployment directory. Vite's existing `BASE_PATH` configuration still controls built asset URLs. Neither router changes nor gzip handling require server rewrites, custom headers, a redirect file or a second HTML entry point.

Vue Router documents that fragments are not sent to the server, unlike history-mode paths that need an SPA fallback for direct access: https://router.vuejs.org/guide/essentials/history-mode

## Verification for 0.2.2

`npm test`: **70 tests passed**, including eight new geography/HTTP tests and seven route-helper/structural tests. The complete TAP record is `STARTUP_TEST_RESULTS.txt`. Existing engine, solver, generated-level, editor, undo, loading-feedback and fallback checks also passed.

The new route-helper tests verify canonical locations and old-link conversion. The structural tests inspect source organization. **They do not execute Vue Router or substitute for browser tests.**

`tests/e2e/startup-routing.spec.js` adds production-browser checks for menu/story independence from map requests, both gzip transport forms, the actual served asset, retry, deep links, reload, navigation/undo preservation and old-link redirects. These tests have not been executed successfully in this environment. CI is configured to run the new regressions against both Vite preview and Vite development, under a repository-style base path.

Package installation failed with `EAI_AGAIN` resolving the npm registry (`STARTUP_INSTALL_FAILURE.txt`). The Vite build and ESLint remain unverified. An attempted targeted Chromium asset test was blocked before navigation with `ERR_BLOCKED_BY_ADMINISTRATOR` (`STARTUP_BROWSER_ASSET_CHECK.json`). That is an environment failure, not a passing browser check or evidence of an application failure. No surrogate UI harness is being presented as a production-build test.

On a machine with dependencies available:

```sh
npm install
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

For a repository-path regression on a POSIX shell:

```sh
BASE_PATH=/geosokoban-test/ npm run build
BASE_PATH=/geosokoban-test/ npm run test:e2e
BASE_PATH=/geosokoban-test/ E2E_SERVER=dev npm run test:e2e -- tests/e2e/startup-routing.spec.js
```

The updated manifest adds Vue Router. An existing local lockfile should be updated through `npm install`, reviewed and committed; no fabricated lockfile is included.
