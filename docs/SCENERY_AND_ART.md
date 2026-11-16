> For current interface, generation and test status, see `V2_5_TESTING.md`, `CHALLENGES.md` and the README. Earlier implementation details below are historical where superseded.

# Scenery and artwork — source update 0.2.4

## Status before running

The source implementation is present; the downloaded geographic atlas is **not**.
`src/content/scenery-atlas.json` is marked `unprepared`, with no ecoregions or
regional cells. Dataset downloads failed in this environment. No coordinates were
invented, and no country was assigned a blanket biome to hide that failure.

Without preparation the game runs with neutral ground, boulders and small pebbles.
The new plane, directional globe, ocean layout, country-context backdrop and overlays
work independently of the biome import. The geographically varied vegetation requires
the following preparation step. The network import has not completed end-to-end here.

## Prepare the actual data

From the project root, with Node 22.13+ (Node 22) or Node 24+:

```sh
npm run biomes:prepare
npm run biomes:verify
```

No npm library is required for these scripts. The first command requests paginated
GeoJSON from the public Esri-hosted RESOLVE FeatureServer, records a SHA-256 source
snapshot, and writes the atlas atomically. Failed imports do not replace the atlas.
The second command requires a prepared atlas and reproduces it from the cached
source snapshot, comparing every sampled grid.

To use a local WGS84 GeoJSON export instead:

```sh
npm run biomes:prepare -- --source=/absolute/path/to/resolve-2017.geojson
npm run biomes:verify
```

The export must retain ECO_ID, ECO_NAME, BIOME_NUM, REALM and LICENSE, and contain
the global dataset, not a regional clip. Plain JSON and gzip JSON are accepted.
An Esri JSON response is not GeoJSON. The producer shapefile can be exported to
WGS84 GeoJSON with GIS software. Field requirements and source license are checked;
imports with fewer than 800 distinct ecoregions or empty regional intersections fail.
The exact source polygons and metadata are cached in `data-sources/`, which is ignored
by Git. `--refresh` explicitly requests a new source snapshot.

Review and commit `src/content/scenery-atlas.json`. Normal `dev` and `build` never
contact the ecoregion service; players receive only bundled presentation data.
The GitHub Pages workflow requires a prepared atlas before publication. Development
builds can use neutral scenery, with a warning in the build console, never in the
player interface.

## Data and ecological limitations

RESOLVE Ecoregions 2017 is the source for ecological regions and broad biome numbers.
It is not current land cover, live snow conditions, elevation or a plant occurrence
survey. Dataset references and CC BY 4.0 attribution are in THIRD_PARTY_NOTICES.md.
No IBGE or WorldCover data have been mixed into this classifier.

For each of the eight existing board projections, preprocessing samples 16 points
per cell. The game's country geometry masks sea. Each classified cell stores its
primary and secondary ecoregions, classified land fraction and dominant share.
The renderer currently uses the primary ecoregion; it does not yet blend secondary
palettes. Cells with less than half their sampled land classified remain neutral.
The country's name or flag is not a biome input.

The importer requests generalized polygons at 0.015 degrees and four decimal
places. Those are asset-preparation settings, not a claim of ecological precision.
Small features may vanish; uncertain areas remain neutral. The underlying Natural
Earth fixture also omits small islands and is not an exhaustive modern atlas.

## Scenery rules

`src/scenery/scene.js` chooses artwork after puzzle construction. It never changes
floor membership, obstacles, flag positions, country destinations or solutions.
Its per-cell hash is independent of the generator's random sequence. Redrawing a
flower cannot change a daily puzzle. Ground details never occupy targets or obstacle
cells and stay in a tile corner, beneath flags and the player.

`src/scenery/palettes.js` maps biome categories to restrained art palettes. The
Caatinga ecoregion has a specific mandacaru-inspired rule. Cacti are not applied to
every desert; arid areas otherwise use rock and dry ground details. Snowy rock is
reserved for the source's Rock and Ice / Rock & Ice classification, not every
mountain biome. Boat floors stay water and use reefs for existing obstacles; trees
and cacti are not placed on navigable water. Decorative vegetation on the surrounding
nonplayable islands remains a possible later extension, not an implemented feature.

Blocking art: boulders, broadleaf trees, pines, dry trees, mandacaru, acacia-like trees,
olive-like trees, mangroves, ridges, snowy rock, sandstone and reefs. Ground details:
grass, flowers, fern-like shoots, leaves, dry grass, lichen, reeds and pebbles.
Names identify stylized artwork; they are not a species-observation database.

## Context, character and aircraft

**0.2.6 rendering note:** context and country borders now use prebuilt quarter-cell pixel contours (4 × 4 logical pixels per game cell), not the earlier smooth polygons. Their shared origin is unchanged. The active level transition now dismantles/builds tiles; the plane component remains available artwork, not an additional simultaneous transition. See `V2_6_CHANGES.md`.

Prepared context paths include all country polygons intersecting each board's viewport,
not only the selected curriculum region. The background is clipped by the viewport;
it never creates floor. Western Europe's background therefore includes neighboring
land. Selected-country borders still come from the puzzle's own region geometry.
The context atlas is committed, so fixed levels need no geographic download.

The globe has four static directional views: front/full face, back/no face, and two
side views. Movement changes facing; it does not animate a full spin. South-up land
styling stays fixed, with no added legs. Idle breathing is a small squash anchored
at the base, rather than a bobbing translation. Undo and restart restore orientation
along with their gameplay state. The plane is a separate rounded SVG asset with
fuselage, wings, tail and cockpit; short banked transitions use it in both directions.
All animation respects reduced motion. The transition has a completion safeguard
so disabled animation cannot strand the game between regions.

The inspection PNG in this directory was rendered from the actual four artwork
component templates through an isolated diagnostic renderer and CairoSVG. It is an
art inspection, not a screenshot of a production Vite build. No runtime compiler or
standalone application is distributed as a second game.

## Interface changes carried into this update

Level selection replaces the hero/homepage. Three difficulty labels correspond to
Easy (visible/simple), Medium (hidden/simple), Hard (hidden/constrained). The full-ocean
playfield has no country sidebar, caption, tagline, footer or directional pad.
Keyboard and swipe gestures move the globe. A tap still selects a flag or target;
dragging does not also fire a target tap. Pinching cancels movement rather than
issuing two-player-pointer commands.

The HUD keeps moves and four controls: undo, restart, hint, menu. Assistance opens
only when requested. A correct delivery shows the country name; deadlock warnings
stay at the top and only appear on proof. Completion is a modal dialog, not a side
panel. Missing or rejected native sharing opens an in-app copy/select dialog;
cancelling a native share sheet does not open the fallback. Options and Credits remain
reachable from the menu, without discarding the active undo stack.

## Historical scope of the scenery-only pass

This pass does not change generator patterns, solution-length filters, story layouts,
daily seed decisions, solver rules, rankings, accounts or backend integration.
The user's finding that harder puzzles are only marginally harder remains unresolved.
A renamed preset and varied trees do not establish better puzzle design. There is
no new measured difficulty calibration or human-authored narrative pass.
