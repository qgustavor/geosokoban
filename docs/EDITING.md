# Editing a board in Tiled

Use finite orthogonal JSON maps with 40-pixel tiles. Export a current story chapter or dated puzzle:

```sh
npm run levels:export -- south-america-tour-2
npm run levels:export -- 2026-11-19 /tmp/daily.tmj
```

Exporting a story reads its exact authored board. Exporting a date invokes generation and may report a search error. There are no saved replacement boards or old-code formats.

## Layers

Keep the `floor` and `obstacles` tile layers, plus `targets`, `flags` and `player` object layers. Each required layer must occur exactly once. Place one player. Align objects to the grid without rotation. Targets and flags must retain matching country IDs. `terrain.svg` is the local editor tileset, not a separate runtime renderer.

The map properties identify `id`, `region`, projection, threshold, sea mode and puzzle metadata. Keep region dimensions and the country geometry aligned. Land targets belong inside their own country. Sea targets belong on water near their country's outline; preserve their `anchorX` and `anchorY` properties. An obstacle is schematic puzzle terrain, not a claim about a real mountain location.

## Import

```sh
npm run levels:import -- levels/editable/south-america-tour-2.tmj --story
npm run levels:import -- /tmp/daily.tmj /tmp/daily.level.json
```

`--story` requires a chapter declared in `STORY_ITINERARY` and rejects planning/hard variants. The importer validates the board and its geographic destinations, then searches for a solution before writing runtime content. Exhausting that search budget means solvability is unknown, not that a level is proven impossible.

A `.level.json` export is an authoring output, not a new player-facing import mode. Commit only boards used by the current game and their editable sources. Use Git for discarded versions.

Always play the imported board. Solver success does not assess teaching value, readability, or whether a child understands the intended mechanic.
