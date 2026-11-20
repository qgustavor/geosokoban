# Editing story levels in Tiled

The included `.tmj` maps are finite, orthogonal JSON maps with 40-pixel tiles. Tiled's JSON format is documented at https://doc.mapeditor.org/en/stable/reference/json-map-format/ . This project's exporter/importer supports a deliberately small subset of that format, not arbitrary Tiled projects.

`levels/editable/` contains 42 maps: 21 relaxed story boards and 21 `-hard` authoring variants. `terrain.svg` supplies the two editor tiles. The source of truth used by the game is `src/content/story-levels.json`; an edited `.tmj` does not change gameplay until it is imported.

## Layers

`floor` is the set of usable terrain cells before obstacles. `obstacles` blocks selected floor cells. `targets`, `flags` and `player` are object layers. Objects are rectangles aligned by their top-left corner to the 40-pixel grid, with no rotation. There must be exactly one player.

Each flag has a stable `boxId` and a `country`; each target has a matching `country`. There is one flag per destination country. Initial flags and the player may not cover any target. For boat boards, targets also store `anchorX` and `anchorY` in grid coordinates, identifying the intended coastline.

Keep the `id`, region, dimensions, map version and threshold properties. Country boundaries are part of the source geography, not something the tile editor may redraw. Mountain tiles are schematic obstacles. The `-hard` suffix distinguishes more constrained authoring variants. Story play always uses the standard board; daily and random puzzles may use `-hard` in share codes.

## Commands

```sh
npm run levels:export -- south-america-tour-2 levels/editable/south-america-tour-2.tmj
npm run levels:import -- levels/editable/south-america-tour-2.tmj edited-level.json
npm run levels:import -- levels/editable/south-america-tour-2.tmj --story
```

Export accepts random/daily codes too, making them starting points for design exploration. `--story` only replaces an existing story ID; it does not silently add or renumber chapters. Without that option, import writes a certified level JSON file for inspection.

Import checks dimensions, layer data, alignment, actor overlap, country identities, visible starting goals and goal geography. It searches for a solution with a finite budget and saves the found route. An exhausted budget means unknown solvability, not a deadlock proof. Simplify the board or investigate it separately rather than suppressing the check.

## Content review

Read the imported board in the running game in all three languages. Check country outlines and dock leader lines. Check whether the intended puzzle idea is actually required or can be bypassed. Replay the saved solution, then try alternate solutions and deliberate mistakes. All assistance and undo must continue to work.

Story text lives in the three dictionaries in `src/data/messages.json`. Add any new geography fact together with an authoritative source in `docs/SOURCES.md`; do not treat a plausible-sounding generated fact as verified. Keep country location statements consistent with the schematic map and review politically sensitive boundaries before public release.

The included maps have passed programmatic round trips; they have not been opened and edited in the Tiled desktop application in this environment. Human curation is still part of the intended workflow.
