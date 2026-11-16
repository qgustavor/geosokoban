// Bounds are [west, south, east, north]. Order also defines the three-stop story progression.
export const REGIONS = [
  {
    id: 'SA',
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
export const STORY_COUNT = REGIONS.length * 3
export const storyCode = index => {
  // Public chapter numbers are one-based; region and stop selection use a zero-based offset.
  const chapterOffset = index - 1
  const region = REGIONS[Math.floor(chapterOffset / 3)]
  const stop = chapterOffset % 3 + 1

  return `G2-${region.id}-S${stop}`
}

export const storyIndex = code => {
  const match = /^G2-([A-Z]{2})-S([1-3])(?:-P)?$/.exec(code)
  const region = match ? REGIONS.findIndex(region => region.id === match[1]) : -1

  // A planning suffix changes the puzzle variant, not its story progress slot.
  return region >= 0 ? region * 3 + Number(match[2]) : 0
}
