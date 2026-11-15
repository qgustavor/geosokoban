# Sources and acknowledgments

## Original project and design brief

GeoJogos: https://geojogos.app.br/

This prototype is independent and not endorsed by the original project. The description of the original GeoSokoban's issues comes from the supplied design brief; this project does not claim to have audited the current deployed game. No original game's source or artwork was copied.

The supplied inspirations include Baba Is You, N-step Steve, Handshakes, Snakebird, Patrick's Parabox, Stephen's Sausage Roll, A Monster's Expedition, Theta, Paralldox on Worldlines, SquishCraft, Can of Wormholes and Game Maker's Toolkit. These acknowledgments are not claims that the prototype reproduces those games' mechanics or proprietary deadlock algorithms.

The welcoming-default/optional-challenge direction was requested in the discussion. No particular GMTK video's transcript was supplied or quoted; the implemented choices are documented as project decisions, not as an exact summary of an unidentified video.

## Sokoban design and search

Mic, “How to build a good Sokoban level?”: https://www.games4brains.de/sokoban-leveldesign.php

This describes goal-area methods, alternating loops, trapdoors/sliding doors, parking and the need for human testing. The prototype's first one-opening and two-opening barriers are inspired by those strategies; they do not guarantee every sophisticated pattern discussed in the article.

Other references provided in the brief, retained for further design work rather than presented as fully implemented methods:

- https://sokoban.dk/articles/1596-2/
- https://healeycodes.com/building-and-solving-sokoban
- https://sokoban-jd.blogspot.com/2015/02/how-to-build-sokoban-level.html

## Geography and artwork

Natural Earth terms: https://www.naturalearthdata.com/about/terms-of-use/

The world fixture contains 177 source features. `map-source.json` identifies its actual local provenance; it is not a pinned fresh upstream release. Relative-location prompts in `src/content/relations.json` are project-authored descriptions checked against the supplied map, not quotations from an external encyclopedia. Review them and the maps as educational content; they should not be mistaken for an independently researched trivia collection.

flag-icons source and license: https://github.com/lipis/flag-icons

Country records use ISO-style identifiers to choose package assets. Those identifiers and the curriculum region groups are implementation/content conventions, not claims about sovereignty or a complete list of recognized states. Review the fixture's special cases and omitted small territories before publication.

## Primary tooling references

Vue single-file components: https://vuejs.org/guide/scaling-up/sfc.html

Vue's recommended Composition API SFC syntax: https://vuejs.org/api/sfc-script-setup.html

Vue lint enforcement: https://eslint.vuejs.org/rules/component-api-style.html

Neostandard: https://github.com/neostandard/neostandard

Vite static deployment and GitHub Pages: https://vite.dev/guide/static-deploy.html

Vite worker bundling: https://vite.dev/guide/features.html#web-workers

Tiled JSON format: https://doc.mapeditor.org/en/stable/reference/json-map-format/

Dependencies and GitHub Actions references are pinned in the project files, but installation, production compilation and deployment still require verification in a network-enabled environment. See `TESTING.md` rather than inferring build success from these references.

## Biome preparation added in 0.2.4

RESOLVE Ecoregions 2017 producer and CC BY 4.0 terms: https://ecoregions.world/

Catalog, schema and methodological limits: https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017

Public GeoJSON service used by the importer: https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Resolve_Ecoregions/FeatureServer/0

The producer/catalog were inspected, but the actual polygon import could not complete
in the development environment. The included atlas is explicitly unprepared.
Unit-test polygons are synthetic fixtures, not source geography.

Embrapa reference for the Caatinga/mandacaru art choice: https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1153737 . The stylized asset does not claim species-level occurrence at each tile.

## Additional presentation references supplied during playtesting

Order of the Sinking Star: subtle grid over a continuous environment. Official game page: https://store.steampowered.com/app/499170/Order_of_the_Sinking_Star/

Tiling Forest: the user's reference for a diagonal, jumping tile reveal. No artwork or animation assets were copied from either game; the SVG/CSS implementation is project-authored.

Vue transition documentation: https://vuejs.org/guide/built-ins/transition.html

CSS text balancing: https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap
