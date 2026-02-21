import { cpSync } from 'node:fs'
import { watchTargets } from './static-assets.js'

for (const { src, dest, isFile } of watchTargets) {
  cpSync(src, dest, isFile ? {} : { recursive: true })
  console.log(`[copy] ${src} -> ${dest}`)
}
