# Prototype design decisions

## Purpose and educational model

This is an independent GeoJogos-inspired experiment, not a competing replacement or an endorsed implementation. Credits belong in their own screen rather than overwhelming the main menu.

The default teaches through guided flag/name/location association. Small, faded flag images appear on country-owned destinations, with unhighlighted country outlines and country-name labels above delivered flags. The optional geography challenge removes the destination images and names, making location recall part of the task. A clue remains available without a score penalty.

Matching pictures alone does not establish educational value. The prototype adds geographic placement and relative-location prompts, but its learning benefit still needs playtesting. The current short prompts describe spatial relationships on the supplied map. They are not a comprehensive, independently curated country-facts collection. See `CHALLENGES.md` for the separate geography and movement challenge settings.

## Journey and presentation

The 21-stop journey follows the seven regions in the design brief, in order. There are three stops per region and two fixed layouts per stop. The first relaxed South America stops introduce one, two and three flags. The North America chapter ends in a Caribbean boat board. Oceania also uses boat rules: water is traversable and islands block movement. An offshore destination has a visible leader line to its country's coastline; it is not a claim that the country itself is in the ocean.

The board stays north-up; the character is a humanized **south-up globe**. Country outlines, scenery, flags and the character use SVG. Tile entrances, waves, the character and plane transitions respect reduced-motion preferences. Plane transitions occur when the next puzzle is in another region. Keyboard and swipe movement are provided; there is no directional button pad.

Story layouts are frozen generated drafts that can be exported, edited and imported in Tiled. Freezing them does not make them human-designed. Human review of teaching order, puzzle quality and narrative pacing is still required.

## Geography and puzzle generation

`src/data/world.geojson.gz` contains a compressed world-outline fixture. Region definitions select countries and projection bounds. Russia is included in the Asian crop as well as the Eastern European crop; a source's single continent label is not sufficient to represent a transcontinental country's geometry.

Each projected cell receives a 4-by-4 coverage sample and a center-point country identity. A search among thresholds 0.36, 0.24, 0.48 and 0.12 adjusts the schematic playable coastline. Land boards use the largest connected component. Sea boards retain only water-centered cells below the chosen coverage threshold and maintain a navigable frame around islands.

Land targets must have their centers inside the intended country polygon. Boat targets must be near the intended country's coastline and have an explicit coastline anchor. Tiny or disconnected countries that cannot be represented meaningfully are not silently moved into another country's territory. Not every country in the data is currently eligible as a destination.

After choosing destinations and a layout motif, generation starts with the flags on their matching targets and makes reversible pulls. The reverse operation records a forward solution. The start must leave every target uncovered by both the character and the flags. Candidates must pass structural validation and constructive replay, and a separate push-based A* search must also find a solution within its state budget. Its solution is replayed before acceptance. Failed candidates are retried within a finite computational budget. If that budget is exhausted, a separately frozen, mechanically verified fallback matching the internal region and challenge is selected deterministically and replayed before use. Technical failures are still reported rather than returning an unverified board. See `LOADING.md`; this update does not add failure-directed local repairs.

The solver supports both push-optimal and move-optimal objectives. Generation first checks push-based design metrics, then computes two move optima to require at least five additional moves over the same board without placed obstacles. Hint continuations still use push-oriented search and are not advertised as move-optimal routes. See `CHALLENGES.md` for budgets, certification and scope. Generators and solvers run in ordinary module workers; the UI can cancel generation. Story boards need no generation worker or progress bar to open. Daily/random loading feedback appears only after 500 ms without a completed level. Elapsed time controls display only, never acceptance or fallback selection. The home screen offers mode and challenge, not a region dropdown.

## Assistance

Geography help and puzzle help remain distinct. Geography help reveals a destination without highlighting the country or selecting a move. Puzzle help supplies increasingly explicit guidance from the current position:

1. Highlight a box useful in a valid continuation.
2. Mark the next useful push positions for that box, stopping after up to three pushes, a delivery or the need to switch boxes.
3. Show the walking and pushing route to that checkpoint.
4. Show a longer route until a flag is next delivered; this may require moving other flags first.

A displayed route advances as the player follows it, so walking does not require repeated hint requests. Departing from that route invalidates stale guidance. Undo, restart and a changed board also invalidate guidance. There is no automatic movement or quota.

Help stages are available immediately on request. No hint cooldown or skip-delay button remains. Solver budgets and animation delays are not a hidden gameplay timer.

## Deadlocks: warn only on proof

There is no “Can I still finish?” button or persistent status panel. After changes to box positions, a static country-specific dead-square test and a bounded background search may check the position. Solvable positions and inconclusive checks are silent.

A warning appears only after a proof: a flag cannot reach its own target even with other flags ignored, or the relevant finite search space has been exhausted without a solution. Running out of states, reaching a worker deadline or a worker failure is **not** a proof of a deadlock. The system therefore does not promise to catch every blocked position. A warning is nonmodal, appears at the top with Undo (Z) and Restart (R), and never resets automatically.

## Unlimited undo and free restart

Every successful move records the previous immutable state. Walking and pushing can both be undone. Invalid inputs neither increment moves nor consume history. There is no artificial history limit, though real device memory is necessarily finite.

Restart restores the initial board and sets moves and pushes to zero. It is itself undoable, preserving the previous attempt and its count. Opening another puzzle starts a separate history. Completion does not disable undo. Previously viewed clues remain recorded descriptively in the current session; restarting does not impose a score or time penalty.

There is no elapsed-play state, timer display, timer collection, score, server or leaderboard in the prototype. The optional full-game ranking policy is recorded separately in `INTEGRATION.md`.

## Reproducibility and hosting

Codes use a UTC date, or a readable region name followed by a word pair, date or fixed story stop, such as `south-america-calm-bay-10`, `south-america-2026-11-14` and `south-america-tour-1`. A final `-hard` selects the more constrained pushing layout. Daily dates change at midnight UTC, independently of the interface language or local timezone. Random codes use familiar words and a two-digit number.

Geography guidance is independent of board generation and travels in the share link as `g=learn` or `g=remember`. Results describe the challenge and assistance, without awarding or subtracting points. Before a public release, changes to geography, PRNG, solver tie ordering, generation or frozen story content should increment the content version; this prototype does not promise legacy-link support.

The deliverable is the Vite `dist/` directory deployed to GitHub Pages. All UI components use `<script setup>` SFCs. Hash-fragment links avoid server route rewrites. Module workers exchange ordinary messages; the project does not use SharedArrayBuffer, WebAssembly threads, special response headers or an alternate standalone export.

## Boundaries of the prototype

All seven regions and all three game modes are implemented, but there is no claim that every country is represented, that the world fixture is current, that the story has been human-curated, or that generated layouts meet a measured human difficulty standard. Current patterns enforce delivery-order dependencies, a five-move obstacle contribution and additional repositioning filters for Hard, not expert-quality choreography. The high fallback rate limits variety; see `BENCHMARKS.md`. Review the data and playtest the defaults with geography students. See `V2_5_TESTING.md` before interpreting any checks as production readiness.

## Scenery and current artwork

See `SCENERY_AND_ART.md` for source-based scenery preparation, the explicitly unprepared bundled atlas, and the separation of artwork from puzzle mechanics. Completion uses a modal overlay, correct deliveries show country names, and proven deadlocks use a top overlay. The player faces four directions without legs or a spinning globe animation.
