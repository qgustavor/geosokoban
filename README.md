# GeoSokoban — prototype

An independent, open-source geography puzzle inspired by GeoJogos. This is an exploration for the original author to inspect and reuse, not the official game, a replacement, or an endorsed collaboration. The supplied brief is in `DESIGN_DOCUMENT.md`.

## Develop

Use Node 22.13+ on the Node 22 line, or Node 24+.

```sh
npm ci
npm run dev
npm run lint
npm run build
npm run preview
```

`npm run check` runs lint and the production build. There is no automated test suite. Use `docs/MANUAL_CHECKLIST.md` for release playthroughs. Lint and build success do not establish that the game feels right or that every generated puzzle succeeds.

The application uses Vue single-file components, Vue Router and Vite. It has no server, accounts, telemetry, remote assets during play, or component library.

## Play

The menu offers Story, Daily and Past puzzles. Daily and past puzzles have Easy, Medium and Hard settings. Easy shows destination clues; Medium hides them on the same board; Hard uses stronger puzzle constraints and hidden clues. Dates use UTC. Future dates cannot be opened.

Story uses only the 21 authored standard boards. Its explicit itinerary is in `src/content/regions.js`; the Caribbean chapter is `caribbean-tour-3`, the second stop of the third tour. There is no story difficulty setting or procedural story generation. The current story and character drafts are starting points for further authoring, not a finished educational campaign.

Keyboard or one-finger swipes move the globe. Undo is unlimited; Restart is free and undoable. Progressive hints have a ten-second cooldown after each request. Two-finger gestures pan and zoom the map. Optional Speedrun timing does not change puzzles. English, Brazilian Portuguese and Spanish are included. Music starts disabled; sound effects and music have independent settings.

Level changes use tile transitions. Story dialogue leads to the next chapter, with an aggregate result after the ending. Sharing uses the platform share sheet, clipboard, or selectable text when those APIs are unavailable.

## Generated puzzles and country coverage

A date deterministically chooses a region and seeds its generator. Regions include the Caribbean directly. There is no hand-picked country pool: every country in the map with a usable destination can be selected. Land destinations need playable floor with pushing room; sea destinations need a nearby island outline and room for a dock. Goal spacing and the solver impose additional constraints on a particular board.

This does not make every country in the world playable. The bundled map is coarse, projections cover limited bounds, and land boards use their largest connected floor area. Very small shapes, islands outside that component, and countries beyond those bounds can remain unavailable. Country metadata and flag assets are retained for map content and authored levels rather than being deleted because a country was absent from an old selection pool.

Generation uses bounded candidate and search work, verifies a solution, and checks puzzle structure. The bounds allow direct generation and certification rather than assuming a replacement pool; difficult seeds can take longer and remain cancellable. It never substitutes a saved board. Exhausted searches, map failures and worker failures show an error with the puzzle code and a copyable report. The report includes the requested link and the technical cause; send it to the prototype developer. Retrying a deterministic search with unchanged code and data will not fix search exhaustion.

Generated boards are not persisted. Workers and geographic samples are reused within the current session, and cancellation terminates active work. The full map loads only when generation needs it; story boards open from bundled content.

## Codes and storage

Supported puzzle IDs are `YYYY-MM-DD`, `YYYY-MM-DD-hard`, and the chapter IDs in the current story itinerary. A link such as `#/puzzle/2026-11-19?g=remember` opens Medium; story links need no guidance query.

Prototype changes may break seeds, links and progress. No old-format aliases, migrations, archived generators, or hard-story variants are shipped. Preferences use `geosokoban.preferences`; they store the current difficulty, not redundant derived guidance settings. Saved data is validated but not migrated.

## Edit and prepare content

```sh
npm run levels:export -- south-america-tour-2
npm run levels:import -- levels/editable/south-america-tour-2.tmj --story
npm run flags
npm run maps:outlines
npm run biomes:prepare
```

The editor validates country destinations and solves a board before importing it. All 21 standard boards have editable Tiled files. See `docs/STORY_AUTHORING.md` and `docs/EDITING.md`.

Map outlines and the compact, prepared scenery atlas are committed. Regenerate outlines after editing map projections. Scenery preparation uses source geography and records its provenance; it is not part of a normal build. See `docs/SCENERY_AND_ART.md`. The runtime atlas contains only primary classifications used by the renderer.

## Organization and deployment

`src/core` contains game rules, generation, solving and transitions. `src/geo` handles geographic loading, projection and rasterization. `src/content` holds current boards, story dialogue and prepared map data. `src/scenery` chooses decorative artwork without changing puzzle rules. `src/ui`, `src/pages`, `src/router` and `src/composables` implement the interface and session lifecycle.

Publish `dist/` with the manual GitHub Pages workflow. It installs the lockfile, lints, builds, and deploys; it does not run tests. Hash routing supports repository subpaths without server rewrites. Use `BASE_PATH=/repository-name/ npm run build` when reviewing such a deployment locally.

Keep `LICENSE`, `THIRD_PARTY_NOTICES.md`, `docs/SOURCES.md` and map provenance with the project. Git stores development history; the source tree contains current documentation and content only.
