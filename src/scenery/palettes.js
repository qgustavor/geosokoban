// Palettes are art direction, not a species-occurrence or present-day land-cover survey.
export const PALETTES = {
  neutral: { ground: '#dce4bc', edge: '#8fa576', obstacles: ['boulder'], details: ['pebbles'] },
  rainforest: { ground: '#c4dca6', edge: '#7f9c70', obstacles: ['broadleaf', 'boulder'], details: ['fern', 'leaves', 'flowers'] },
  dryForest: { ground: '#dce0ac', edge: '#a2ac7c', obstacles: ['dryTree', 'boulder'], details: ['dryGrass', 'leaves'] },
  caatinga: { ground: '#e5ddb2', edge: '#adab7c', obstacles: ['mandacaru', 'dryTree', 'boulder'], details: ['dryGrass', 'pebbles', 'flowers'] },
  conifer: { ground: '#cbd9ae', edge: '#8a9e7e', obstacles: ['pine', 'boulder'], details: ['grass', 'leaves', 'flowers'] },
  woodland: { ground: '#d8e1b1', edge: '#8da274', obstacles: ['broadleaf', 'boulder'], details: ['grass', 'flowers', 'leaves'] },
  taiga: { ground: '#c9d9c0', edge: '#859c8a', obstacles: ['pine', 'boulder'], details: ['lichen', 'grass'] },
  savanna: { ground: '#e3ddb1', edge: '#b3ae7c', obstacles: ['acacia', 'boulder'], details: ['dryGrass', 'flowers', 'pebbles'] },
  grassland: { ground: '#dce0ac', edge: '#a0ac79', obstacles: ['boulder'], details: ['grass', 'flowers'] },
  wetland: { ground: '#c4d8b0', edge: '#829d81', obstacles: ['broadleaf', 'boulder'], details: ['reeds', 'grass'] },
  montane: { ground: '#d8dbbd', edge: '#9aab97', obstacles: ['ridge', 'boulder'], details: ['lichen', 'grass', 'flowers'] },
  tundra: { ground: '#d9e1cd', edge: '#99afa3', obstacles: ['boulder'], details: ['lichen', 'pebbles'] },
  mediterranean: { ground: '#e0dfb8', edge: '#aaa978', obstacles: ['olive', 'boulder'], details: ['dryGrass', 'flowers', 'pebbles'] },
  arid: { ground: '#ead8ac', edge: '#b9a779', obstacles: ['sandstone', 'boulder'], details: ['dryGrass', 'pebbles'] },
  mangrove: { ground: '#c2d5ab', edge: '#789584', obstacles: ['mangrove', 'boulder'], details: ['reeds', 'leaves'] },
  ice: { ground: '#e2eee7', edge: '#aac8c5', obstacles: ['snowRock'], details: ['pebbles'] },
  sea: { ground: '#73aeb530', edge: '#73aeb530', obstacles: ['reef'], details: [] }
}

export function paletteForEcoregion (record) {
  if (!record) return 'neutral'
  const name = String(record.name ?? record.ECO_NAME ?? '').trim().toLowerCase().replace(/\s*&\s*/g, ' and ')
  if (name === 'caatinga') return 'caatinga'
  if (name === 'rock and ice') return 'ice'
  const biome = Number(record.biome ?? record.BIOME_NUM)
  return ({ 1: 'rainforest', 2: 'dryForest', 3: 'conifer', 4: 'woodland', 5: 'conifer', 6: 'taiga', 7: 'savanna', 8: 'grassland', 9: 'wetland', 10: 'montane', 11: 'tundra', 12: 'mediterranean', 13: 'arid', 14: 'mangrove' })[biome] ?? 'neutral'
}
