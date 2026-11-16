# 0.2.6 verification

## Executed successfully

- `npm test`: 134 tests, zero failures. Full output is in `V2_6_NODE_TEST_RESULTS.txt`.
- Independent move-optimal and push-optimal recertification of all 48 new fallback templates, plus solution-preserving seeded variation checks.
- Cache clone isolation, LRU eviction, invalid/corrupt/stale storage, quota failures and disabled storage; warm-worker reuse, cancellation and stale reply handling.
- Hint deadline checks at 9,999 ms and 10,000 ms, repeated-request handling, throttled timers, fractional clock ticks, disposal and localization coverage.
- Board sweep timing and completion-sequence cancellation; letter stagger/grapheme handling and sufficient hold for the last letter.
- Pixel-map center sampling, holes, disconnected/touching islands, negative coordinates, clipping and integer quarter-cell alignment for every atlas path.
- `npm run maps:check` and `npm run biomes:check` pass. The existing biome atlas remains unprepared/neutral; this update does not manufacture biome data.
- All JavaScript files and Vue script-setup sections pass JavaScript syntax checking. This is not Vue template compilation. See `V2_6_SYNTAX_CHECK.txt`.
- Isolated Chromium checks use the actual `LevelClear.vue` CSS and `clearLetterWords()` data at 320×568, 375×667, 844×390 and 1280×800 in all three languages. Twelve settled-banner layouts fit without document overflow; reduced-motion styles disable letter animation. These are isolated CSS checks, not a running Vue application. Results: `V2_6_CSS_CHECKS.json`.
- Paired 14-code fresh-worker benchmarks against the original source and this source. Codes/order match; every solution replays successfully. See `BENCHMARKS.md` and its raw JSON records.

## Not successfully verified in this environment

The npm registry/CDN hosts could not be resolved. The attempted dependency install ended with npm's “Exit handler never called” error, leaving empty dependency directories. No dependency versions were substituted or retrieved from an unofficial source.

`npm run lint` cannot find ESLint. `npm run build` passes the map and biome checks, then fails while copying Vue's license because the dependency is missing; Vite never runs. `npm run test:e2e` cannot load the missing Node Playwright test runner; it resolves to an unrelated system CLI and reports “unknown command test”. The complete application has **not** been built, linted or run in a browser here. Isolated CSS inspection does not substitute for those checks.

Logs: `V2_6_INSTALL_LOG.txt`, `V2_6_LINT_LOG.txt`, `V2_6_BUILD_LOG.txt`, `V2_6_E2E_LOG.txt`.

The included browser specifications cover same/cross-region transitions, reduced motion, rapid navigation, warm workers, cache reuse across reload, the pixel underlay, letter animation, and hint cooldowns including hide/restart bypass attempts. They remain unexecuted specifications, not passing test results.

## Run in a dependency-enabled checkout

```sh
npm install
npm run check
npx playwright install chromium
npm run test:e2e
npm run dev
```

The shipped package lock keeps the original dependency pins. Only the package's own version changes to 0.2.6. There are no new runtime or development dependencies. The archive excludes `.git`, `node_modules`, generated build output and local browser caches.

## Remaining review work

Verify transition lifecycle/focus behavior in the real Vue application and on touch devices. Playtest the new layouts for meaningful differences, not just obstacle count. The certified pool remains finite, and the faster bounded search used a template in 12/14 measured requests. Prepared biome artwork and production deployment retain the original project's separate prerequisites. Story drafts have not been regenerated.
