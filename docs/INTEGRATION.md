# Notes for the original GeoJogos author

This prototype is an independent idea exploration, not a replacement for GeoJogos. Naming and credits should make that clear. Any public deployment is provisional and can be taken offline when the exploration is complete or at the original author's request. No public deployment was performed here.

## Do not penalize restarting

Restart must restore the puzzle's initial game state **and reset the move count to zero**. In a full-game implementation that records elapsed time, it must also reset the attempt's hidden elapsed time to zero. Do not accumulate time or moves from discarded attempts into the next attempt's result. No restart penalty, lives, cooldown, cost or limited restart count is proposed.

Undo must have no artificial history cap. It restores the previous board and corresponding move count. Blocked moves are not moves. The prototype also makes restart undoable, so a mistaken reset can be recovered. Implementations that restore an earlier attempt after undoing a reset should restore that attempt's timing state consistently; they must not combine a previous board with a new zero-time clock.

## Timer scope

**The prototype has no gameplay timer, visible or hidden.** Loading feedback, animations and developer benchmarks do not collect elapsed play or ranking time.

The only proposed timer is for the full game's ranking tie-breaker. Moves remain the primary comparison. Capture time unobtrusively and reveal it only when explaining an actual tie between otherwise comparable results. Do not show a ticking clock, countdown, speed bonus, or decreasing score during ordinary play.

A reset starts a fresh zero-time attempt. Define background-tab and interruption handling before collecting times; a proposed humane policy is to count active play rather than time spent away from the page. Undo itself should not create a time penalty. Never compare results from different puzzle versions, rule variants, or content generations as though they were the same challenge.

Help availability should not be limited for ranking purposes. If competitive results need to distinguish revealing help, record and explain the assistance category rather than reducing access to learning tools. A non-spoiling solvability check is not equivalent to a supplied next move. The prototype has no ranking and makes no server-side trust or anti-cheat claim.

## Keep the default welcoming

Offer optional challenges independently of story, daily and random modes. The prototype presets are Easy, Medium and Hard. Easy has faded flag targets and gentle layouts; Medium uses question-mark targets with those same layouts; Hard combines hidden targets with stronger delivery-order and repositioning checks. None removes hints, unlimited undo, reduced motion or free resets. The 0.2.5 generator adds a five-move optimum gap over the same board without placed obstacles and stronger box-interaction filters; fixed story drafts are unchanged. Human difficulty calibration remains necessary. See `CHALLENGES.md` for the intended progression and the current generator's limits.

Do not turn assistance availability into a difficulty penalty. Gentle boards should be approachable without demanding repeated hints, while optional challenge boards can ask for more planning. In a full-game ranking, compare only the same board version, layout and geography setting; use assistance categories only as clear descriptive metadata.

## Progressive help and quiet failure feedback

Prefer a useful box or checkpoint over a single walking move. Reveal more only when asked: box, push positions, route, then a delivery checkpoint. A hint is a legal continuation, not necessarily the globally shortest route by displayed moves. Each requested stage is available immediately. There is no reveal cooldown or skip-wait button.

Check for deadlocks silently after pushes and warn only when stuck is proven. Never show an all-clear message after every action or treat a search timeout as proof. Keep Undo and Restart buttons with keyboard shortcuts in the top warning; do not reset automatically.

## Integration and deployment

The source is organized as Vue `<script setup>` single-file components, with framework-independent rules and workers. The build is a normal Vite static site with Vue Router hash routes and fragment-based share links. The menu and fixed story levels open independently of world-data downloads; geography loads only when generated puzzles need it. It needs no server rewrite rules or cross-origin-isolation headers and has no standalone-HTML export. Flag artwork is imported from the MIT-licensed `flag-icons` package at build time, not fetched from a third-party CDN during play.

## Generation feedback

Open pre-generated story levels directly. For daily/random generation, preserve the current screen until a short, configurable delay elapses without a completed board; then show cancellable progress. The current provisional delay is 500 ms. Fast boards should not incur a completion animation. Treat benchmark percentiles as measurements of a specified device/workload, not as a promise to all players.

Do not turn a long generation duration into an ordinary error or silently weaken design criteria. Use deterministic computational search limits and a validated, versioned fallback pool; elapsed device time may change loading feedback, not the daily puzzle. No region-selection setting is proposed. Detailed behavior, limitations and initial measurements are in `LOADING.md` and `BENCHMARKS.md`.

## Scenery and presentation

Country context, biome classification and puzzle topology are separate layers. Use
prepared ecoregion data for art selection, not a per-country biome guess. Preserve
the source attribution and license when reusing the generated atlas. The 0.2.4
source includes an unprepared atlas because the import could not be downloaded in
the development environment; see `SCENERY_AND_ART.md` before publishing it.

Keep small ground details visually distinct from blocking objects. No explanation
of rasterization, simplified geometry or design obstacles belongs in the gameplay
interface. The globe faces movement direction without legs or spinning. Overlays
replace the country sidebar and win panel; touch movement uses swipes.
