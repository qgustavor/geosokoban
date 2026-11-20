# Mode, touch-camera and preference update

## Behavior

Story uses the existing fixed standard boards and dialogue. Difficulty controls and per-level result dialogs are absent. Completing a puzzle leads through its after-dialogue and on to the next stop. The ending opens one campaign summary with cumulative recorded moves. Story board geometry and story dialogue assets have not changed.

Daily and Past puzzles use UTC calendar dates. Difficulty is preserved in shared links and results, but seed/code controls are not exposed. The archive has previous/next arrows and a styled native date input; today is the maximum date. Invalid/future puzzle routes go straight to the menu without an explanatory dialog. This is a client-side convenience, not an anti-cheating boundary.

The saved menu mode and difficulty are separate from active puzzle settings. Changing a radio choice saves it without requiring Play. Story and shared links cannot overwrite the preferred difficulty. Invalid or unavailable local storage falls back to Daily/Easy without preventing play. Storage writes are best-effort.

Speedrun is optional, disabled by default, and available only in Options. A new run captures this setting; changing it does not modify an ongoing run. The clock starts when the board is ready, before the opening dialogue. Story keeps one start timestamp, including intermediate loading/clear animations, dialogue, pauses and time away, until the final puzzle is solved. The final epilogue does not add time. Restart/undo retain the original start. Story run totals and timing are saved across reloads. A newly loaded daily/archive puzzle starts a new attempt, just as it resets the board. Entering story midway does not manufacture a full-campaign speedrun time, and partial recorded journeys are labeled accordingly.

One finger moves, two fingers pan/pinch the board. After a pinch, the remaining finger cannot move until all fingers lift. Cancellation, lost capture, blur, visibility changes and resize release stale input. Trackpad Ctrl+wheel pinches zoom the board; ordinary wheel/two-finger scroll pans it. Browser pinch is suppressed during play and restored on leaving play. No global viewport maximum-scale restriction is introduced.

The camera, not puzzle generation, adapts to the viewport. Current large phone maps start at approximately 32 CSS pixels per tile. Full map / Closer view toggles the camera; movement brings the player back into view after exploring. Puzzle sizes, continent boundaries and seeds remain device-independent. Portrait 3:4 (width:height) is a possible future layout guideline, not a forced crop or a change to authored geography.

New visible strings are provided in English, Brazilian Portuguese and Spanish. No dependencies or lockfile changes are required.

## Executed checks

202 selected Node tests passed with zero failures:

```sh
node --test --test-skip-pattern='all 48 frozen fallbacks|every new template independently|seeded fallback structures' tests/*.test.js
```

The three excluded tests independently recertify the existing fallback pools/variants with expensive searches. They were not rerun for this update; those pools and generation algorithms are unchanged. This is not a claim that the complete `npm test` suite was executed.

JavaScript syntax checking passed for modified/new JavaScript and extracted Vue script-setup sections. This does not compile Vue templates.

An isolated Chromium harness using the actual GameBoard handlers and camera/input modules passed seven checks with native touch events: pinch without character/HUD/page movement; two-finger pan; no movement from a remaining finger; a fresh swipe after pinching; recovery after cancellation; recovery after blur; and Ctrl+wheel zoom. This harness is not the full Vue application and does not verify Safari behavior.

## Application checks still required

Dependency installation failed because the environment could not resolve npm registry hosts. Full ESLint, Vite/Vue compilation and application-level Playwright execution remain unverified. No substitute package versions were installed. The repository's existing unprepared biome-data prerequisite is unchanged.

Updated browser specifications include archive bounds, future-route rejection before map loading, fixed story difficulty, automatic story advancement and ending, timed sharing, mobile camera gestures, and saved mode/difficulty across reloads, story visits and shared links.

In a dependency-enabled checkout, run:

```sh
npm install
npm run check
npx playwright install chromium
npm run test:e2e
```

Also playtest on a real phone, especially iOS Safari: pinch, drag, release fingers in either order, return to one-finger movement, rotate the screen, background the app, and return to the menu. Confirm flags, labels and controls remain readable in all three languages.
