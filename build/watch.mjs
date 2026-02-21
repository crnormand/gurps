import chokidar from 'chokidar'
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { spawn } from 'node:child_process'

import { watchTargets } from './static-assets.js'

/* ---------------------------------------- */

// Copy a whole target root to its destination
function copyTarget({ src, dest, isFile }) {
  try {
    cpSync(src, dest, isFile ? {} : { recursive: true })
    console.log(`[watch:static] synced ${src} -> ${dest}`)
  } catch (err) {
    console.error(`[watch:static] failed to sync ${src} -> ${dest}${isFile ? ' (file)' : ' (tree)'}`, err)
  }
}
// Copy a single changed file into the dest tree
function copyChangedFile(changedPath, { src, dest }) {
  const rel = relative(src, changedPath)
  const destPath = join(dest, rel)
  try {
    mkdirSync(dirname(destPath), { recursive: true })
    cpSync(changedPath, destPath)
    console.log(`[watch:static] copied ${changedPath} -> ${destPath}`)
  } catch (err) {
    console.error(`[watch:static] failed to copy changed file ${changedPath} -> ${destPath}`, err)
  }
}

/* ---------------------------------------- */

console.log('[watch:static] initial copy...')
watchTargets.forEach(copyTarget)
console.log('[watch:static] initial copy done')

/* ---------------------------------------- */

const watcher = chokidar.watch(
  watchTargets.map(t => t.src),
  {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  }
)

// Route a changed path to the appropriate copy helper
function handleChange(changedPath) {
  changedPath.normalize() // Ensure consistent path format across platforms
  const target = watchTargets.find(t => changedPath.startsWith(t.src))
  if (!target) return
  target.isFile ? copyTarget(target) : copyChangedFile(changedPath, target)
}

watcher
  .on('add', handleChange)
  .on('addDir', handleChange)
  .on('change', handleChange)
  .on('unlink', p => console.log(`[watch:static] source removed: ${p} (dist untouched)`))
  .on('error', err => console.error('[watch:static] error', err))
  .on('ready', () =>
    console.log(
      '[watch:static] watching',
      watchTargets.map(t => t.src)
    )
  )

/* ---------------------------------------- */

const processes = []

// Spawn a child process and register it for clean shutdown
const run = (command, args) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  processes.push(child)
  child.on('exit', code => {
    if (code && code !== 0) process.exit(code)
  })
  return child
}

run('npm', ['run', 'watch:code'])
run('npm', ['run', 'watch:styles'])

// Kill all child processes on shutdown
const shutdown = () => {
  watcher.close()
  for (const p of processes) p.kill('SIGTERM')
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
