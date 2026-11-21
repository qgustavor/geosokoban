# Source data cache

`npm run biomes:prepare` downloads RESOLVE Ecoregions 2017 from the public
Esri-hosted FeatureServer, verifies the attributes and license, and writes a
compressed source snapshot here. `--refresh` explicitly replaces that snapshot.

The downloadable producer shapefile is also available at
https://storage.googleapis.com/teow2016/Ecoregions2017.zip. A WGS84 GeoJSON export
of it, retaining ECO_ID, ECO_NAME, BIOME_NUM and LICENSE, can be supplied
with `npm run biomes:prepare -- --source=/path/to/ecoregions.geojson`.

The source is CC BY 4.0, not MIT. Commit the compact derived atlas in
`src/content/scenery-atlas.json` after reviewing it. Do not make players download
the source polygons. A normal application build never contacts the data service.

The prepared runtime atlas is committed. Missing classifications use neutral scenery;
no country-wide or invented biome assignments are substituted. Source metadata and
its hash remain with the derived atlas for attribution and provenance.
