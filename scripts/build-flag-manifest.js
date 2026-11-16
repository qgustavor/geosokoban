import { readFile, writeFile } from 'node:fs/promises'

const countries = JSON.parse(await readFile(new URL('../src/data/countries.json', import.meta.url), 'utf8'))

// Stable sorted imports make asset generation reproducible; xx is the unknown-country fallback.
const codes = [...new Set(['xx', ...Object.values(countries).map(country => country.iso2)])].sort()
const identifier = code => `flag${code[0].toUpperCase()}${code.slice(1)}`
const imports = codes.map(code => `import ${identifier(code)} from 'flag-icons/flags/4x3/${code}.svg?url'`).join('\n')
const entries = codes.map(code => `  ${code}: ${identifier(code)}`).join(',\n')

await writeFile(new URL('../src/assets/flags.js', import.meta.url), `${imports}\n\nexport const flagUrls = {\n${entries}\n}\n`)
