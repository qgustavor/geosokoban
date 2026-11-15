let geography

export class MapLoadError extends Error {
  constructor (message, cause) {
    super(message, { cause })
    this.name = 'MapLoadError'
    this.code = 'MAP_LOAD_FAILED'
  }
}

export function setGeography (value) {
  if (value?.type !== 'FeatureCollection' || !Array.isArray(value.features) || !value.features.length) throw new Error('Invalid geography')
  geography = value
}

export function getGeography () {
  if (!geography) throw new Error('Geography must be loaded before generating a puzzle')
  return geography
}

/** Fetch may have already decoded Content-Encoding, regardless of the asset suffix. */
export async function readGeographyResponse (response) {
  if (!response.ok) throw new Error(`Map request failed: ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b
  let text
  if (isGzip) {
    if (typeof DecompressionStream !== 'function') throw new Error('Gzip decompression is unavailable')
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    text = await new Response(stream).text()
  } else {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  }
  const value = JSON.parse(text)
  if (value?.type !== 'FeatureCollection' || !Array.isArray(value.features) || !value.features.length) throw new Error('Invalid geography')
  return value
}

/** Only completed, validated requests are cached; failure and cancellation are retryable. */
export async function loadGeography ({ signal } = {}) {
  signal?.throwIfAborted()
  if (geography) return geography
  try {
    const response = await fetch(new URL('../data/world.geojson.gz', import.meta.url), { signal })
    const value = await readGeographyResponse(response)
    signal?.throwIfAborted()
    setGeography(value)
    return geography
  } catch (error) {
    if (signal?.aborted) throw signal.reason
    throw new MapLoadError('Unable to load geography', error)
  }
}
