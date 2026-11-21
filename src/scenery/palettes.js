// Palettes are art direction, not a species-occurrence or present-day land-cover survey.
// Ground and edge paint live in src/styles/biome-tokens.css.
// Array order determines the art selected by each cell's hash; keep it stable across redraws.
export const PALETTES = {
  neutral: {
    ground: 'var(--biome-neutral-ground)',
    edge: 'var(--biome-neutral-edge)',
    obstacles: ['boulder'],
    details: ['pebbles']
  },
  rainforest: {
    ground: 'var(--biome-rainforest-ground)',
    edge: 'var(--biome-rainforest-edge)',
    obstacles: ['broadleaf', 'boulder'],
    details: ['fern', 'leaves', 'flowers']
  },
  dryForest: {
    ground: 'var(--biome-dry-forest-ground)',
    edge: 'var(--biome-dry-forest-edge)',
    obstacles: ['dryTree', 'boulder'],
    details: ['dryGrass', 'leaves']
  },
  caatinga: {
    ground: 'var(--biome-caatinga-ground)',
    edge: 'var(--biome-caatinga-edge)',
    obstacles: ['mandacaru', 'dryTree', 'boulder'],
    details: ['dryGrass', 'pebbles', 'flowers']
  },
  conifer: {
    ground: 'var(--biome-conifer-ground)',
    edge: 'var(--biome-conifer-edge)',
    obstacles: ['pine', 'boulder'],
    details: ['grass', 'leaves', 'flowers']
  },
  woodland: {
    ground: 'var(--biome-woodland-ground)',
    edge: 'var(--biome-woodland-edge)',
    obstacles: ['broadleaf', 'boulder'],
    details: ['grass', 'flowers', 'leaves']
  },
  taiga: {
    ground: 'var(--biome-taiga-ground)',
    edge: 'var(--biome-taiga-edge)',
    obstacles: ['pine', 'boulder'],
    details: ['lichen', 'grass']
  },
  savanna: {
    ground: 'var(--biome-savanna-ground)',
    edge: 'var(--biome-savanna-edge)',
    obstacles: ['acacia', 'boulder'],
    details: ['dryGrass', 'flowers', 'pebbles']
  },
  grassland: {
    ground: 'var(--biome-grassland-ground)',
    edge: 'var(--biome-grassland-edge)',
    obstacles: ['boulder'],
    details: ['grass', 'flowers']
  },
  wetland: {
    ground: 'var(--biome-wetland-ground)',
    edge: 'var(--biome-wetland-edge)',
    obstacles: ['broadleaf', 'boulder'],
    details: ['reeds', 'grass']
  },
  montane: {
    ground: 'var(--biome-montane-ground)',
    edge: 'var(--biome-montane-edge)',
    obstacles: ['ridge', 'boulder'],
    details: ['lichen', 'grass', 'flowers']
  },
  tundra: {
    ground: 'var(--biome-tundra-ground)',
    edge: 'var(--biome-tundra-edge)',
    obstacles: ['boulder'],
    details: ['lichen', 'pebbles']
  },
  mediterranean: {
    ground: 'var(--biome-mediterranean-ground)',
    edge: 'var(--biome-mediterranean-edge)',
    obstacles: ['olive', 'boulder'],
    details: ['dryGrass', 'flowers', 'pebbles']
  },
  arid: {
    ground: 'var(--biome-arid-ground)',
    edge: 'var(--biome-arid-edge)',
    obstacles: ['sandstone', 'boulder'],
    details: ['dryGrass', 'pebbles']
  },
  mangrove: {
    ground: 'var(--biome-mangrove-ground)',
    edge: 'var(--biome-mangrove-edge)',
    obstacles: ['mangrove', 'boulder'],
    details: ['reeds', 'leaves']
  },
  ice: {
    ground: 'var(--biome-ice-ground)',
    edge: 'var(--biome-ice-edge)',
    obstacles: ['snowRock'],
    details: ['pebbles']
  },
  sea: {
    ground: 'var(--biome-sea-ground)',
    edge: 'var(--biome-sea-edge)',
    obstacles: ['reef'],
    details: []
  }
}

// Broad biome numbers are a fallback, not a substitute for the named ecoregion overrides below.
const BIOME_PALETTES = {
  1: 'rainforest',
  2: 'dryForest',
  3: 'conifer',
  4: 'woodland',
  5: 'conifer',
  6: 'taiga',
  7: 'savanna',
  8: 'grassland',
  9: 'wetland',
  10: 'montane',
  11: 'tundra',
  12: 'mediterranean',
  13: 'arid',
  14: 'mangrove'
}

export function paletteForEcoregion (record) {
  if (!record) return 'neutral'

  const name = String(record.name ?? '').trim().toLowerCase().replace(/\s*&\s*/g, ' and ')

  // Cacti and snowy rock belong to these named rules, not to all arid or mountain biomes.
  if (name === 'caatinga') return 'caatinga'
  if (name === 'rock and ice') return 'ice'

  const biome = Number(record.biome)

  return BIOME_PALETTES[biome] ?? 'neutral'
}
