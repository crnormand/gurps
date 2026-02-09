import cpx from 'cpx2'
import { existsSync } from 'node:fs'

const staticFolders = ['anim', 'assets', 'icons', 'lang', 'templates', 'ui']
const staticFiles = ['changelog.md', 'LICENSE', 'README.md', 'system.json', 'template.json']
const outputBase = 'dist'

// Copy vendor-style libraries verbatim (do not run through tsc).
// These are loaded by Foundry as classic scripts / pre-bundled modules.
const sourceFolders = [{ input: 'src/lib/**/*', output: `${outputBase}/lib` }]

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

// Copy source folders (not under static/)
for (const { input, output } of sourceFolders) {
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
