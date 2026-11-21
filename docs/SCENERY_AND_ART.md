# Scenery and artwork

The repository includes a prepared RESOLVE Ecoregions 2017 atlas and prebuilt map outlines. Normal builds and gameplay do not download ecological source data. Source attribution and license terms are in `THIRD_PARTY_NOTICES.md` and `SOURCES.md`.

## Prepare data

```sh
npm run maps:outlines
npm run biomes:prepare
npm run biomes:prepare -- --source=/absolute/path/to/ecoregions.geojson
```

Use the outline command after changing map projections. The biome command downloads and caches source data, or accepts a local WGS84 GeoJSON export. The export needs `ECO_ID`, `ECO_NAME`, `BIOME_NUM` and `LICENSE` and must contain the global source rather than a regional clip. Plain and gzip JSON are accepted. `--refresh` requests a fresh snapshot.

Preparation validates required attributes and the source license, samples each board projection, records source provenance and writes the atlas atomically. A failed download does not replace existing content. Commit the derived asset, not the large source cache. Scenery on newly exposed land may stay neutral until the atlas is regenerated for that projection.

## Runtime format

Each classified cell stores `[primaryEcoregionId, classifiedLandFraction]`. A null cell has no classification. The `ecoregions` dictionary contains only primary IDs used by at least one cell, with their name and biome number. Source provenance records the complete source dataset separately from that reduced runtime dictionary.

The importer samples 16 points per tile and uses the game's country geometry as its land mask. At least half the sampled land must be classified before the renderer chooses an ecological palette. Unknown cells remain neutral rather than inventing a biome. The source is a broad ecoregion dataset, not current land cover, live snow or a species-occurrence survey; small features can disappear at this resolution.

## Rendering

`src/scenery/scene.js` selects artwork after puzzle construction with independent per-cell hashes. It cannot change floors, barriers, actors or solutions. Ground details stay off destinations and blocking obstacles. Sea boards retain water art and reefs.

`src/scenery/palettes.js` maps current atlas records to artwork. Caatinga has its own cactus rule; Rock and Ice uses snowy rock. These are stylized palette choices, not precise plant observations. Tile colors live in `src/styles/biome-tokens.css`; `palettes.js` references them without changing palette selection. Character, terrain and board-marker paint lives in `src/styles/art-tokens.css`. See `STYLING.md` for component ownership and theme editing.

Map outlines use quarter-cell pixel contours aligned with the board grid. Context paths are decorative geography, not playable floor. The globe and tile-based level transitions are the active character/transition presentation; there is no aircraft component or alternate board-preview mode.
