# Editing a board in Tiled

Use finite orthogonal JSON maps with 40-pixel tiles. Export a current story chapter or dated puzzle:

```sh
npm run levels:export -- south-america-tour-2
npm run levels:export -- 2026-11-19 /tmp/daily.tmj
```

Exporting a story reads its exact authored board. Exporting a date invokes generation and may report a search error. There are no saved replacement boards or old-code formats.

## Generate a fresh story draft

```sh
bun run levels:regenerate caribbean-tour-2 --seed reef-1
bun run levels:regenerate caribbean-tour-2 --seed reef-2 --force
```

Regeneration runs the existing generator for the chapter's region, retains the chapter ID, and exports the standard variant as a Tiled map. The seed defaults to the chapter ID; different seeds can produce different candidates, and a search may exhaust its budget. It does not replace authored story content. The default output is `levels/drafts/<chapter>.tmj`, outside the story watcher. An optional output filename may follow the chapter ID; `--force` permits overwriting an existing draft. Review and edit the draft, then move it into `levels/editable/` (the watcher will import it) or import it explicitly with `--story`. Copy its reference images if needed. Stop the watcher before modifying an active map if you do not want changes imported immediately.

## Layers

Keep the `floor` and `obstacles` tile layers, plus `targets`, `flags` and `player` object layers. Each required layer must occur exactly once. Place one player. Align objects to the grid without rotation. The **Name** field is the only country identifier: name each target and matching flag with its three-letter country code (for example `NZL`). The `flags` layer is red by default; `targets` keeps Tiled's default color. Leave Class empty. The importer derives the internal box ID and country from Name; no object custom properties are required. `terrain.svg` is the local editor tileset, not a separate runtime renderer.

The map properties identify `id`, `region`, projection, threshold, sea mode and puzzle metadata. Keep region dimensions and the country geometry aligned. Land targets belong inside their own country. Sea targets belong on water, within 2.8 tiles of their named country's outer coastline. Move the target normally; every import (including watch mode) recomputes its anchor at the closest point along that coastline. Targets on land or too far from the named country are rejected. An obstacle is schematic puzzle terrain, not a claim about a real mountain location.

Sea exports include a locked `geography` image layer above the terrain. It shows the projected country outlines and country codes without changing playable tiles. Toggle its visibility when editing obstacles or flags. Keep the corresponding `geography-<region>.svg` next to the map; exporting a sea board refreshes that reference image. The importer ignores the reference layer and uses the source geography instead.

The editable story maps already use this format. Existing runtime story content changes only when a board is successfully imported.

## Repair outdated sea terrain

```sh
bun run levels:repair-terrain levels/editable/caribbean-tour-2.tmj
```

Repair removes only floor cells outside the current rasterized sea floor at the map's threshold, and obstacles on those removed cells. It never adds floor or moves objects. The map must validate and solve before it is written; otherwise the input and output remain unchanged. An optional output filename must be next to the source to preserve relative assets. Stop the story watcher if you want to review repairs before importing them. Sea imports reject invalid floor cells rather than silently repairing them.

## Import

```sh
npm run levels:import -- levels/editable/south-america-tour-2.tmj --story
npm run levels:import -- /tmp/daily.tmj /tmp/daily.level.json
```

`--story` requires a chapter declared in `STORY_ITINERARY` and rejects planning/hard variants. The importer validates the board and its geographic destinations, then searches for a solution before writing runtime content. Exhausting that search budget means solvability is unknown, not that a level is proven impossible.

A `.level.json` export is an authoring output, not a new player-facing import mode. Commit only boards used by the current game and their editable sources. Use Git for discarded versions.

Always play the imported board. Solver success does not assess teaching value, readability, or whether a child understands the intended mechanic.
