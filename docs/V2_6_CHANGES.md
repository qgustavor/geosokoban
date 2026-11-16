# 0.2.6 implementation notes

This update covers generation latency, repetitive barriers, level transitions, the clear banner, hint cooldowns and the pixel-aligned map underlay. Dependency versions, the biome atlas, flags and fixed story content are preserved.

## Generation and caching

`src/core/level-cache.js` implements a clone-on-read/write LRU with 24 entries and best-effort local-storage persistence capped at 750,000 characters. Its version includes map/generator/fallback versions. A cache hit validates the board, replays its solution and verifies certificate metadata; corrupt or incompatible storage is treated as a miss. Denied storage and quota failures do not prevent play. Cached content is the initial level, not the user's current state or undo history.

`src/core/generation-client.js` keeps successful workers warm and transfers geography once per worker/source identity. Cancelled requests terminate the busy worker; stale replies cannot replace the current board. `src/geo/rasterize.js` shares projection and 4 × 4 coverage samples across threshold retries and invalidates them if the geography fixture changes. Goal candidate caches, reusable walking-search buffers and solver bookkeeping reduce repeated allocation/search work.

Live search now has deterministic limits of 18/24 candidates and 18,000/28,000 expanded states for gentle/Hard. These are work budgets, not device-dependent timeouts. The five-extra-move certificate and push/design acceptance checks remain in force. The paired benchmark's median changes from 5.23 s to 0.57 s, but the smaller search budget increases certified-template use from 8/14 to 12/14. See `BENCHMARKS.md` for scope and raw records; this is not a browser latency guarantee.

## Puzzle variety

`src/core/layout-patterns.js` creates stepped/bent partitions plus switchbacks, courtyards, staggered rooms or obstacle islands. Stamps respect grid boundaries, keep goal support cells usable and test connectivity. There are no new movement rules, literal switches or timed floors.

The new `src/content/fallback-levels-v5.json` contains 48 boards: three for each of eight internal projections and two mechanical difficulties. Every projection/difficulty has at least two layout families; all four families occur across the pool. Tests independently recompute both move optima and the push-optimal solution quality for every template.

`src/core/layout-variation.js` adds seeded structures outside both optimal solution footprints. Added walls cannot improve an optimum; retaining a complete optimal route prevents that optimum from worsening. The obstacle-free baseline stays unchanged. Structural checks are recomputed. This preserves certificates without another expensive optimal search. The pool is finite, and extra walls do not guarantee a different essential solution sequence for every seed.

The 42 story layouts are unchanged. Their existing introductory puzzles are not silently replaced. Generator and fallback versions are 5: existing seed syntax still works, but regenerated daily/random codes may produce different layouts than in 0.2.5.

## Tile transition

`PlayView.vue` uses a keyed Vue transition in `out-in` mode for all level-code changes, including changes within the same region. The old board is dismantled in a reverse diagonal sweep before the next board assembles with a diagonal rise, scale and settle. Terrain, details, destinations and pieces share tile timing. Temporary underfaces give moving floor tiles visible thickness; map context fades out/in separately.

The wrapper duration includes the last tile's delay: 580 ms to leave and 920 ms to enter. `src/core/board-transition.js` centralizes these constants. Controls and movement handlers are guarded while the board changes; focus returns afterward. Cancellation/unmount and rapid navigation clear the guard. Explicit and operating-system reduced-motion preferences suppress the sequence. The older plane artwork remains available but is not layered over tile transitions.

## Level-clear lettering

`src/ui/LevelClear.vue` replaces the plain label with large uppercase outlined lettering and a stacked shadow. Each letter scales up, hops upward, lands with a small squash, rebounds and settles. `src/core/clear-animation.js` assigns stagger delays, preserves grapheme clusters and caps total sweep time for longer translations. Words may wrap; letters are not split across lines.

The country-delivery label remains for 1,100 ms, followed by a 2,000 ms clear banner before results. The longer banner includes a readable hold after the final letter lands. Screen readers receive one complete localized phrase, not individual letter announcements. Reduced motion uses static lettering with the same reading time. Undo/restart cancel the completion timers.

## Hint cooldown

`src/core/hint-cooldown.js` gates accepted requests using an elapsed-time deadline of 10,000 ms. The first hint is immediate; every accepted request starts a fresh cooldown. Rejected requests do not extend it. The gate checks the actual clock independently of UI updates, so throttled timers or repeated inputs cannot reveal another hint early.

`HintPanel.vue` disables the request button and displays a localized seconds-remaining label. English, Brazilian Portuguese and Spanish are covered. Countdown ticks are outside the live announcement region. Hiding the panel, moving, undoing, restarting or changing levels in the same application session does not reset the deadline. No hint is auto-revealed when the countdown ends and there is no skip-wait button. A full application reload creates a new assistance session; cooldown persistence across reloads is not implemented.

## Pixel mosaic underlay

The map uses **four logical pixels along each cell edge: 4 × 4 = 16 pixels per gameplay cell**. One gameplay cell is 40 SVG units, so a map pixel is 10 × 10 SVG units. Every coast/border vertex shares the gameplay origin and falls on a multiple of ten, including negative coordinates in surrounding context.

`src/geo/mosaic.js` samples projected polygons at pixel centers, preserving holes with even-odd filling, then traces only exposed edges into compact horizontal/vertical SVG contours. It joins collinear edges instead of rendering thousands of individual DOM rectangles. Context is bounded to the existing map margin. Features below the sampling resolution can disappear; this is a presentation approximation, not replacement geography.

`scripts/build-map-outlines.js` prepares the mosaic in advance. Runtime rendering loads the committed atlas without the world loader, canvas resampling or generation work. Coastlines and country borders both use crisp-edge rendering; no smooth vector coastline remains behind the tiles. Logical alignment survives responsive scaling, although a logical map pixel is not necessarily an integer number of physical device pixels at every viewport size.

The atlas shrinks from 2,408,981 bytes to 561,877 bytes. The renderer remains SVG-based; this does not pixelate flags, the globe or interface text. Floor membership, collision geometry, goals, country assignment and certificates are unchanged by the visual conversion.

To regenerate/check the asset:

```sh
npm run maps:outlines
npm run maps:check
```

## Main configuration points

| Change | Source |
| --- | --- |
| Cache capacity/version | `src/core/level-cache.js`, `generation-version.js` |
| Live search work budgets | `src/core/generate.js` |
| Layout families/stamps | `src/core/layout-patterns.js` |
| Certified pool preparation | `scripts/build-fallbacks.js` |
| Board sweep and tile durations | `src/core/board-transition.js` |
| Letter stagger and banner hold | `src/core/clear-animation.js`, `completion.js` |
| Letter hop/scale/outline styling | `src/ui/LevelClear.vue` |
| Hint deadline | `src/core/hint-cooldown.js` |
| Map resolution | `src/geo/mosaic.js` (rebuild the atlas after changes) |

## Verification and limits

See `V2_6_TESTING.md` for executed checks and installation/build failures. Application-level Playwright specifications are included but have not been run successfully here. The changes are not claimed to be human-playtested or validated on physical phones.
