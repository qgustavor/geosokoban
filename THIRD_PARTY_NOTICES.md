# Third-party notices

## Original code and artwork

Original project code and newly drawn globe/scenery use the root MIT license. No GeoJogos source code or original game artwork is included. The prototype name and credits identify inspiration, not affiliation, permission or endorsement.

## Vue

Vue is an MIT-licensed dependency obtained through npm. Its source and license are at https://github.com/vuejs/core . The exact requested version is recorded in `package.json`; the resolved dependency graph is recorded in `package-lock.json`. There is no vendored Vue runtime or alternate offline build in this source archive.

## Vue Router

Vue Router is an MIT-licensed dependency obtained through npm. Source and license: https://github.com/vuejs/router . The pinned version is recorded in `package.json`. Its license is copied into the published notices alongside Vue's license.

## flag-icons

SVG flag artwork comes from the MIT-licensed `flag-icons` package: https://github.com/lipis/flag-icons . `src/assets/flags.js` imports packaged 4:3 SVG files as build assets. The flag images are not original drawings by this prototype. Review the chosen flag variants before educational publication. Software/artwork licensing does not decide legal or political questions about national symbols.

## Natural Earth

The compressed world-country fixture is derived from Natural Earth public-domain data. Terms: https://www.naturalearthdata.com/about/terms-of-use/ . Provenance, hashes and transformations are recorded in `docs/map-source.json`. The upstream release of the installed fixture was not identified; do not describe it as a current or authoritative boundary dataset. Small islands and territories may be missing or simplified.

## RESOLVE Ecoregions 2017 (prepared scenery data)

Source: RESOLVE; Dinerstein et al. (2017), *An Ecoregion-Based Approach to
Protecting Half the Terrestrial Realm*, DOI 10.1093/biosci/bix014.
Producer: https://ecoregions.world/ . Catalog:
https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017 .

The source data are licensed under Creative Commons Attribution 4.0 International:
https://creativecommons.org/licenses/by/4.0/ . Prepared data derived from this source
are **not covered by the code's MIT license**. Retain this attribution, source link,
license link and the modification notice when redistributing the derived atlas.

Modifications: the default import requests polygon generalization at 0.015 degrees
and four coordinate decimals, then records dominant ecoregions from 4×4 land-masked
samples in each puzzle-grid tile. A local export may have different generalization;
its provenance and source SHA-256 are recorded in the atlas. Artwork choices and
colors are original stylization, not original RESOLVE map artwork or a species survey.

The source archive includes a prepared atlas of dominant ecoregion IDs and land
coverage, not the source polygons. Runtime records are limited to the dominant
ecoregions referenced by its cells. In-game attribution and the copied production
notices identify this derived data and its license.

## Distributed notices

`npm run build` first copies the installed Vue, Vue Router and flag-icons license files, the project license and this notice into `public/licenses/`; Vite includes them in the production site. Build tooling dependencies retain their upstream licenses. No third-party font files, audio, music or game sprites are distributed by this project.
