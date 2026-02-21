import { cpSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'

const staticFolders = ['anim', 'assets', 'icons', 'lang', 'templates', 'ui']
const staticFiles = ['changelog.md', 'LICENSE', 'README.md', 'system.json', 'template.json']
const outputBase = 'dist'
const sourceFolders = [{ input: 'src/lib', output: `${outputBase}/lib` }]

for (const folder of staticFolders) {
  const input = join('static', folder)
  const output = join(outputBase, folder)
  if (existsSync(input)) {
    cpSync(input, output, { recursive: true })
    console.log(`[copy] ${input} -> ${output}`)
  }
}

for (const { input, output } of sourceFolders) {
  if (existsSync(input)) {
    cpSync(input, output, { recursive: true })
    console.log(`[copy] ${input} -> ${output}`)
  }
}

for (const file of staticFiles) {
  const src = existsSync(join('static', file)) ? join('static', file) : file
  const dest = join(outputBase, basename(file))
  if (existsSync(src)) {
    cpSync(src, dest)
    console.log(`[copy] ${src} -> ${dest}`)
  }
}
