import cpx from 'cpx2'
import { existsSync } from 'node:fs'

const staticFolders = ['assets', 'icons', 'lang', 'templates', 'ui']
const staticFiles = ['changelog.md', 'LICENSE.txt', 'README.md', 'system.json', 'template.json']
const outputBase = 'dist'

// Copy static folders to the output directory
for (const folder of staticFolders) {
  const input = `static/${folder}/**/*`
  const output = `${outputBase}/${folder}`
  if (process.argv.includes('--watch')) {
    cpx.watch(input, output, {})
  } else {
    cpx.copy(input, output, {})
  }
}

// Copy static files to the output directory
for (const file of staticFiles) {
  // Prefer `static/` (packaged assets), fall back to repo root.
  const input = existsSync(`static/${file}`) ? `static/${file}` : file
  const output = `${outputBase}`
  if (process.argv.includes('--watch')) {
    cpx.watch(input, output, {})
  } else {
    cpx.copy(input, output, {})
  }
}
