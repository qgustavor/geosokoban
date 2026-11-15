import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { REGIONS, CARIBBEAN } from '../src/content/regions.js'
import { rasterize, countryAt, MAP_VERSION } from '../src/geo/rasterize.js'
import { setGeography } from '../src/geo/world.js'
import { createBiomeLookup, sampleRegion } from './lib/biome-sampling.js'

const root = new URL('../', import.meta.url)
const cache = new URL('data-sources/resolve-2017.geojson.gz', root)
const sourceManifest = new URL('data-sources/resolve-2017-source.json', root)
const destination = new URL('src/content/scenery-atlas.json', root)
const endpoint = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Resolve_Ecoregions/FeatureServer/0/query'
const downloadOptions = { offset: 0.015, precision: 4, pageSize: 100 }

async function download () {
  const features = []
  for (let offset = 0; ; offset += downloadOptions.pageSize) {
    const url = new URL(endpoint)
    url.search = new URLSearchParams({
      where: '1=1', outFields: 'ECO_ID,ECO_NAME,BIOME_NUM,BIOME_NAME,REALM,LICENSE',
      returnGeometry: 'true', outSR: '4326', f: 'geojson', orderByFields: 'FID ASC',
      maxAllowableOffset: String(downloadOptions.offset), geometryPrecision: String(downloadOptions.precision),
      resultOffset: String(offset), resultRecordCount: String(downloadOptions.pageSize)
    }).toString()
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
    if (!response.ok) throw new Error(`Ecoregion download failed (${response.status})`)
    const page = await response.json()
    if (page.error) throw new Error(page.error.message ?? 'Ecoregion service error')
    if (page.type !== 'FeatureCollection' || !Array.isArray(page.features)) throw new Error('Ecoregion service did not return GeoJSON')
    features.push(...page.features)
    console.log(`Fetched ${features.length} ecoregion features.`)
    if (page.features.length < downloadOptions.pageSize) break
    if (offset > 10000) throw new Error('Unexpected ecoregion pagination; refusing an incomplete atlas')
  }
  if (new Set(features.map(feature => feature.properties.ECO_ID)).size < 800) throw new Error('Ecoregion response appears incomplete')
  return { type: 'FeatureCollection', features }
}

async function readSource (path) {
  const bytes = await readFile(path)
  return JSON.parse(bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8'))
}

async function main () {
  const sourceArgument = process.argv.find(argument => argument.startsWith('--source='))
  const refresh = process.argv.includes('--refresh')
  let collection
  let provenance
  if (sourceArgument) {
    collection = await readSource(resolve(sourceArgument.slice('--source='.length)))
    provenance = { url: 'local-export', generalizedDegrees: null, coordinateDecimals: null }
  } else if (!refresh) {
    try {
      collection = await readSource(cache)
      provenance = JSON.parse(await readFile(sourceManifest, 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      collection = null
    }
  }
  if (!collection) {
    collection = await download()
    provenance = { url: endpoint, generalizedDegrees: downloadOptions.offset, coordinateDecimals: downloadOptions.precision }
  }
  const lookup = createBiomeLookup(collection)
  if (Object.keys(lookup.records).length < 800) throw new Error('The global source must contain at least 800 distinct ecoregions')
  const licenses = [...new Set(collection.features.map(feature => String(feature.properties?.LICENSE ?? '').trim()))]
  if (licenses.some(license => !/^CC[- ]BY[- ]?4\.0$/i.test(license))) throw new Error('Expected a CC BY 4.0 RESOLVE export, including its LICENSE field')
  const sourceBytes = JSON.stringify(collection)
  const sha256 = createHash('sha256').update(sourceBytes).digest('hex')
  setGeography(JSON.parse(gunzipSync(await readFile(new URL('src/data/world.geojson.gz', root)))))
  const regions = Object.fromEntries([...REGIONS, CARIBBEAN].map(definition => {
    const map = rasterize(definition.id)
    return [definition.id, sampleRegion(definition, lookup, (x, y) => countryAt(map, x, y) !== null)]
  }))
  for (const [region, map] of Object.entries(regions)) {
    if (!map.cells.some(cell => cell !== null)) throw new Error(`No classified land samples for ${region}; refusing an empty atlas`)
  }
  const result = {
    version: 1, mapVersion: MAP_VERSION, status: 'prepared',
    source: {
      name: 'RESOLVE Ecoregions 2017', license: 'CC-BY-4.0', attribution: 'RESOLVE; Dinerstein et al. (2017)',
      ...provenance, sha256, ecoregions: Object.keys(lookup.records).length,
      samplesPerCell: 16, preparedAt: new Date().toISOString().slice(0, 10)
    },
    ecoregions: lookup.records, regions
  }
  const temporary = new URL(destination.href + '.tmp')
  await writeFile(temporary, JSON.stringify(result) + '\n')
  await mkdir(new URL('data-sources/', root), { recursive: true })
  await writeFile(cache, gzipSync(sourceBytes))
  await writeFile(sourceManifest, JSON.stringify(provenance) + '\n')
  await rename(temporary, destination)
  console.log(`Prepared ${Object.keys(regions).length} scenery grids from ${result.source.ecoregions} ecoregions.`)
  console.log(`Source SHA-256: ${sha256}`)
  console.log(`Commit ${fileURLToPath(destination)}. Players do not download the source dataset.`)
}

main().catch(error => {
  console.error(`Biome preparation failed: ${error.message}`)
  console.error('The existing atlas was not replaced. Retry, or provide --source=/path/to/resolve-export.geojson.')
  process.exitCode = 1
})
