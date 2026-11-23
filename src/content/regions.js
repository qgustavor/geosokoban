// Bounds are [west, south, east, north]. Map definitions also drive daily region selection.
export const REGIONS = [
  {
    id: 'SA',
    slug: 'south-america',
    name: 'southAmerica',
    bounds: [-82, -57, -33, 14],
    width: 18,
    height: 24,
    continent: 'South America'
  },
  {
    id: 'NA',
    slug: 'north-america',
    name: 'northAmerica',
    bounds: [-145, 7, -50, 74],
    width: 25,
    height: 23,
    continent: 'North America'
  },
  {
    id: 'EE',
    slug: 'east-europe',
    name: 'eastEurope',
    bounds: [12, 35, 48, 61],
    width: 22,
    height: 22,
    continent: 'Europe'
  },
  {
    id: 'WE',
    slug: 'west-europe',
    name: 'westEurope',
    bounds: [-12, 35, 18, 58],
    width: 23,
    height: 23,
    continent: 'Europe'
  },
  {
    id: 'AF',
    slug: 'africa',
    name: 'africa',
    bounds: [-19, -36, 52, 38],
    width: 23,
    height: 24,
    continent: 'Africa'
  },
  {
    id: 'AS',
    slug: 'asia',
    name: 'asia',
    bounds: [25, -12, 148, 63],
    width: 29,
    height: 23,
    continent: 'Asia',
    extraCountries: ['RUS']
  },
  {
    id: 'OC',
    slug: 'oceania',
    name: 'oceania',
    bounds: [109, -49, 185, 1],
    width: 27,
    height: 21,
    continent: 'Oceania',
    sea: true
  },
  {
    id: 'CAR',
    slug: 'caribbean',
    name: 'caribbean',
    bounds: [-90, 9, -59, 28],
    width: 26,
    height: 19,
    continent: 'North America',
    sea: true
  }
]

export const regionById = id => REGIONS.find(region => region.id === id) ?? null

// The itinerary names the map actually used by each authored chapter.
export const STORY_ITINERARY = [
  ['SA', 'NA', 'CAR', 'EE', 'WE', 'AF', 'AS', 'OC'],
  ['SA', 'NA', 'CAR', 'EE', 'WE', 'AF', 'AS', 'OC'],
  ['SA', 'NA', 'CAR', 'EE', 'WE', 'AF', 'AS', 'OC']
]
export const STORY_TOURS = STORY_ITINERARY.length
const chapters = STORY_ITINERARY.flatMap((stops, tour) => stops.map((id, stop) => ({
  region: regionById(id), tour: tour + 1, stop: stop + 1
})))
export const STORY_COUNT = chapters.length

export function storyStop (index) {
  if (!Number.isInteger(index) || index < 1 || index > STORY_COUNT) return null

  return { index, ...chapters[index - 1] }
}

export function storyCode (index) {
  const chapter = storyStop(index)
  if (!chapter) throw new RangeError('Invalid story chapter')

  return `${chapter.region.slug}-tour-${chapter.tour}`
}

export function storyIndex (code) {
  return chapters.findIndex(chapter => `${chapter.region.slug}-tour-${chapter.tour}` === code) + 1
}

/** Story teaches flag matching first, then asks players to remember destinations. */
export function storyGuidance (code) {
  const chapter = storyStop(storyIndex(code))

  return chapter ? (chapter.tour === 1 ? 'learn' : 'remember') : null
}
