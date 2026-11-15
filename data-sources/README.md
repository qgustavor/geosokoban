# Source data cache

`npm run biomes:prepare` downloads RESOLVE Ecoregions 2017 from the public
Esri-hosted FeatureServer, verifies the attributes and license, and writes a
compressed source snapshot here. `--refresh` explicitly replaces that snapshot.

The downloadable producer shapefile is also available at
https://storage.googleapis.com/teow2016/Ecoregions2017.zip. A WGS84 GeoJSON export
of it, retaining ECO_ID, ECO_NAME, BIOME_NUM, REALM and LICENSE, can be supplied
with `npm run biomes:prepare -- --source=/path/to/ecoregions.geojson`.

The source is CC BY 4.0, not MIT. Commit the compact derived atlas in
`src/content/scenery-atlas.json` after reviewing it. Do not make players download
the source polygons. A normal application build never contacts the data service.

This update includes an explicit **unprepared atlas** because the source download
was unavailable during development. No invented biome geometry or country-wide
biome assignments are substituted. Until preparation succeeds, scenery is neutral.
