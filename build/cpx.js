import { cpSync } from 'node:fs'
import { watchTargets } from './static-assets.js'

for (const { src, dest, isFile } of watchTargets) {
  try {
    cpSync(src, dest, isFile ? {} : { recursive: true })
    console.log(`[copy] ${src} -> ${dest}`)
  } catch (err) {
    console.error(`[copy] error copying ${src} -> ${dest}`, err)
    throw err
  }
}
