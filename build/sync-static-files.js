import { cpSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { distDir, staticTargets, syncTarget } from './static-assets.js'

// One-shot sync of all static assets into dist/
mkdirSync(distDir, { recursive: true })
staticTargets.forEach(target => syncTarget('[build:static]', target))
