// Bounds are [west, south, east, north]. Each world tour visits these regions in this order.
export const REGIONS = [
  {
    id: 'SA',
    slug: 'south-america',
    name: 'southAmerica',
    bounds: [-82, -57, -33, 14],
    width: 18,
    height: 24,
    continent: 'South America',
    story: ['PER', 'BOL', 'COL'],
    pool: ['BRA', 'PER', 'BOL', 'COL', 'ARG', 'VEN', 'PRY']
  },
  {
    id: 'NA',
    slug: 'north-america',
    name: 'northAmerica',
    bounds: [-145, 7, -50, 74],
    width: 25,
    height: 23,
    continent: 'North America',
    story: ['USA', 'CAN', 'MEX'],
    pool: ['USA', 'CAN', 'MEX']
  },
  {
    id: 'EE',
    slug: 'east-europe',
    name: 'eastEurope',
    bounds: [12, 35, 48, 61],
    width: 22,
    height: 22,
    countries: ['POL', 'CZE', 'SVK', 'HUN', 'ROU', 'BGR', 'UKR', 'BLR', 'MDA', 'RUS', 'EST', 'LVA', 'LTU'],
    story: ['POL', 'ROU', 'UKR'],
    pool: ['POL', 'ROU', 'UKR', 'BLR', 'HUN', 'BGR']
  },
  {
    id: 'WE',
    slug: 'west-europe',
    name: 'westEurope',
    bounds: [-12, 35, 18, 58],
    width: 23,
    height: 23,
    countries: ['PRT', 'ESP', 'FRA', 'DEU', 'BEL', 'NLD', 'LUX', 'CHE', 'AUT', 'ITA', 'GBR', 'IRL', 'DNK'],
    story: ['FRA', 'DEU', 'ESP'],
    pool: ['FRA', 'DEU', 'ESP', 'PRT', 'CHE', 'AUT', 'ITA', 'BEL', 'NLD']
  },
  {
    id: 'AF',
    slug: 'africa',
    name: 'africa',
    bounds: [-19, -36, 52, 38],
    width: 23,
    height: 24,
    continent: 'Africa',
    story: ['EGY', 'NGA', 'ZAF'],
    pool: ['EGY', 'NGA', 'ZAF', 'DZA', 'MLI', 'NER', 'TCD', 'SDN', 'ETH', 'KEN', 'TZA', 'COD', 'AGO', 'NAM', 'BWA', 'ZMB']
  },
  {
    id: 'AS',
    slug: 'asia',
    name: 'asia',
    bounds: [25, -12, 148, 63],
    width: 29,
    height: 23,
    continent: 'Asia',
    extraCountries: ['RUS'],
    story: ['IND', 'CHN', 'MNG'],
    pool: ['IND', 'CHN', 'MNG', 'KAZ', 'PAK', 'IRN', 'SAU', 'MMR', 'THA', 'TUR', 'AFG', 'IRQ']
  },
  {
    id: 'OC',
    slug: 'oceania',
    name: 'oceania',
    bounds: [109, -49, 185, 1],
    width: 27,
    height: 21,
    continent: 'Oceania',
    sea: true,
    story: ['AUS', 'NZL', 'PNG'],
    pool: ['AUS', 'NZL', 'PNG', 'FJI', 'SLB', 'VUT']
  }
]

export const CARIBBEAN = {
  id: 'CAR',
  name: 'caribbean',
  bounds: [-90, 9, -59, 28],
  width: 26,
  height: 19,
  continent: 'North America',
  sea: true,
  story: ['CUB', 'HTI', 'DOM'],
  pool: ['CUB', 'HTI', 'DOM', 'JAM', 'BHS', 'TTO']
}

export const regionById = id => REGIONS.find(region => region.id === id) ?? (id === 'CAR' ? CARIBBEAN : null)
export const STORY_TOURS = 3
export const STORY_COUNT = REGIONS.length * STORY_TOURS

export function storyStop (index) {
  if (!Number.isInteger(index) || index < 1 || index > STORY_COUNT) return null

  // Visit the whole world before advancing to the next tour's puzzle variant.
  const offset = index - 1
  const region = REGIONS[offset % REGIONS.length]
  const tour = Math.floor(offset / REGIONS.length) + 1

  return { index, region, tour, stop: offset % REGIONS.length + 1 }
}

export function storyCode (index) {
  const chapter = storyStop(index)
  if (!chapter) throw new RangeError('Invalid story chapter')

  return `${chapter.region.slug}-tour-${chapter.tour}`
}

export function storyIndex (code) {
  if (typeof code !== 'string') return 0

  // Frozen boards still have their original asset keys. Both forms identify the
  // same chapter; their order is now tour-first instead of continent-first.
  const legacy = /^G2-([A-Z]{2})-S([1-3])(?:-P)?$/.exec(code)
  const readable = /^(.+)-tour-([1-3])(?:-hard)?$/.exec(code)
  const match = legacy ?? readable
  if (!match) return 0

  const region = REGIONS.findIndex(item => legacy ? item.id === match[1] : item.slug === match[1])

  return region >= 0 ? (Number(match[2]) - 1) * REGIONS.length + region + 1 : 0
}
