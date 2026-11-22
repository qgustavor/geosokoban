# Manual release review

Run `npm ci` and `npm run check`, review and commit any automatic lint fixes, then open `npm run preview`. The check covers JavaScript, Vue templates, standalone CSS and Vue `<style>` blocks before building. Repeat the important flows under the repository's deployment subpath. Record observations in the release review or issue, not as committed snapshots of past runs.

## Story and navigation

Start a fresh story. Play the opening board using keyboard and touch. Confirm destinations, movement, undo, restart, dialogue, tile transitions, and focus after closing menus. Check all 21 chapters, including `caribbean-tour-3`. The Caribbean should be named in the briefing, board header and menu itinerary. There must be no story difficulty selector, plane transition, or hard-story variant.

Tour 1 must show destination flags. Tours 2 and 3 must start with `?` destinations, including direct links, reloads and browser navigation. Try a Daily/Archive preference of Hard and confirm that Story ignores it without changing the saved preference. Help/reveal and correctly delivered destinations must still work under Medium presentation.

Read the returning-to-South-America scenes in tours 2 and 3: the distant round silhouette must not reveal Compass or the magnet. At the final Oceania after-scene, check the centered animated needle, the Remove magnet action, the relieved pose, and the final friendship. Use Back across removal, then advance again; skip and Escape must also reach the final results. Reload before and during the ending and confirm it remains available. Check both saved and operating-system reduced motion, background/foreground, and all three languages. Facts should name countries actually present on the board just completed.


Leave a solved chapter before its after-scene finishes, reload, and resume. Finish the final chapter and review aggregate results and sharing. Restart a completed journey. Check direct chapter links, browser back/forward, standalone Options/Credits, invalid routes, and clearing progress.

## Daily and past puzzles

Try dates for several regions at each difficulty. Easy and Medium must share a board, with different destination clues. Hard must use hidden clues and a small additional routing structure, with the same countries, destinations and actor starts. Compare the actual route with the standard variant: extra distance alone must not be the difference. Reload a date and compare its layout. Try the current UTC day, past days, invalid dates and a future link.

A failed search must display an error, not a substitute level. Copy its report and check that the code, difficulty link and cause are present. Deny clipboard access and select the report manually. After a previous successful level, a failed replacement must not leave that previous board playable beneath the error.

Cancel generation, navigate away during map loading, and retry a failed map request. Confirm that a late worker response cannot replace the newly selected level. A repeatable search-exhaustion error needs a generator fix; repeatedly pressing Retry is not a remedy.

## Interaction and presentation

Use desktop and narrow mobile viewports. Try one-finger swipes, two-finger pan/zoom, the overview toggle, keyboard shortcuts and focus navigation. Verify that opening a menu or dialogue blocks movement, and that touch movement does not also inspect a flag. Keyboard focus on gameplay should mark Little Globe with a small ring, never frame the entire viewport. Tab to HUD/menu controls and confirm their normal outlines remain, the player ring disappears, and controls still work. Check returning from another browser tab and closing a menu, on both land and sea boards.

Exercise all hint stages, reveal a hidden destination, make and undo a delivery, restart and undo that restart. Check completion timing and result sharing. A search-budget limit must not be presented as proof of a deadlock.

Review every screen in English, Portuguese and Spanish. Try reduced motion and the system reduced-motion setting. Verify audio toggles, volumes, muting, backgrounding and returning to the tab. Enable Speedrun for a new run, reload it, and confirm that it remains optional.

## Geography and content

Inspect country names, flags, goal positions, island dock anchors, map outlines and scenery at representative stops. A solver cannot establish educational accuracy. Review story progression, difficulty, writing and accessibility through actual play with the intended audience.

A completed checklist is a record of what was observed, not a guarantee about every seed, browser or device.

## Presentation changes

Compare the menu, mode/difficulty selections, archive date control, pause/options/credits dialogs, story dialogue, hints and result overlays at desktop and narrow mobile widths. Check keyboard-visible focus and all three locales for clipping. Review at least one land board and one sea board, including SVG markers and character artwork. Confirm saved reduced motion and operating-system reduced motion independently. Palette changes must not alter flags, country geometry or puzzle behavior. See `STYLING.md` for the stylesheet owners.
