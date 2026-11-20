# Testing

The previous test tree has been removed. The replacement is deliberately small: **24 Node tests** plus **five browser journeys**, run in the existing desktop and mobile Playwright projects.

## Run

```sh
npm test
npm ci
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm test` uses only Node's built-in test runner and the bundled data; it does not need an npm install. The browser suite uses the real Vue application and generation workers, not a reconstructed interface. Its default server is the production preview, so build first. `E2E_SERVER=dev npm run test:e2e` instead starts the development server. For a repository subpath, use the same `BASE_PATH` when building and testing.

## Continuous integration

The **CI and Pages** workflow runs the existing suite, lint, prepared-scenery
validation, the production build, and the desktop/mobile browser journeys on
branch pushes, pull requests, and manual runs. Only successful default-branch
pushes and manual runs can publish. The deployment job consumes the exact tested
build rather than rebuilding it. See [Deployment](DEPLOYMENT.md) for setup.

CI installs Chromium and its system dependencies, limits Playwright to one
worker, rejects `test.only`, and produces GitHub annotations and an HTML report.
Reports and failure traces are uploaded when present and retained for seven days.
These are diagnostics, not snapshots or tests of compiled text. No additional
gameplay tests or benchmark gates are introduced by the workflow patch.

To reproduce the non-publishing CI path locally on a supported Linux host:

```sh
npm ci
npm test
npm run lint
node scripts/check-biomes.js --require-data
BASE_PATH=/ci-preview/ npm run build
npx playwright install --with-deps chromium
CI=true E2E_SERVER=preview BASE_PATH=/ci-preview/ npm run test:e2e
```

## What is covered

- `gameplay.test.js`: legal and blocked movement, country-specific completion, undoable restart, small-board solving, unknown versus impossible results, progressive hints and their cooldown.
- `puzzle-codes.test.js`: current codes, difficulty routing, UTC dates and the future-date guard. Retired formats are rejected, not translated.
- `content-integrity.test.js`: replayable story boards and editor round trips, playable fallback certificates, deterministic fallback selection and propagation of technical errors. These checks do not freeze specific layouts or demand particular motifs.
- `persistence.test.js`: current preferences, unusable storage, story resumption and timing, and isolation/validation of cached boards.
- `generation.test.js`: cancellation ownership and repeatable, playable results from the actual worker module through the existing Node worker adapter.
- `story.test.js`: hidden/revealed/delivered destinations, localized lessons matching active countries, the finale and reversible stage directions, broad campaign route budgets and increasing third-tour pushing work.
- `e2e/journeys.spec.js`: story movement/undo/restart, chapter progression, archived hard puzzles through the real worker, hidden-target help and routing/reload behavior, and the final reveal with magnet removal and checkpoint recovery.

Tests execute behavior. None read application source or compiled bundles to match regexes, require implementation structure, snapshot CSS or freeze generator output. A few small fixtures make rules explicit; bundled JSON/geography supplies integration data. Browser locators address rendered controls and counters, not component source.

## Verification of the story patch

On Node 22.16.0, all 24 Node tests passed with no skips, cancellations or failures.
All 21 playable campaign certificates were replayed, and the matching editable
maps were checked for valid country/dock placement, editor round trips, and
solvability. Map and biome checks passed. The board data intentionally changes
in this story patch; the earlier legacy-removal patch changed identifiers only.

Dependency installation is unavailable in this environment because npm registry
resolution fails (`EAI_AGAIN`). ESLint, the full production build, and the ten
desktop/mobile browser executions remain **unverified**. JavaScript syntax and
Node checks do not substitute for those tools or visual/touch playtesting.

Earlier test reports and benchmark records elsewhere in `docs/` describe previous
code and suites, not evidence that the current browser journeys or build passed.

## Keeping the suite useful

Prefer one small regression for a real player-visible failure over exhaustive implementation checks. Keep large seed sweeps and performance measurements in explicit offline benchmark/content-preparation workflows rather than making them a gate for every idea. Changes to artwork, wording, component organization or puzzle layout should not fail tests unless they break behavior. Manual playtesting remains necessary for difficulty, touch feel, audio and visual quality.
