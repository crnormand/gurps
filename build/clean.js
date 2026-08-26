import { rmSync } from 'node:fs'

rmSync('dist', { recursive: true, force: true })
rmSync('.tsbuildinfo', { recursive: true, force: true })
