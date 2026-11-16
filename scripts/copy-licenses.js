import { copyFile, mkdir } from 'node:fs/promises'

const destination = new URL('../public/licenses/', import.meta.url)
await mkdir(destination, { recursive: true })

// Ship attribution with the static site, where node_modules is not available at runtime.
for (const name of ['vue', 'vue-router', 'flag-icons']) {
  await copyFile(new URL(`../node_modules/${name}/LICENSE`, import.meta.url), new URL(`${name}.txt`, destination))
}

await copyFile(new URL('../LICENSE', import.meta.url), new URL('geosokoban.txt', destination))
await copyFile(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), new URL('NOTICES.md', destination))
