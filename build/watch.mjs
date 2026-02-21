import chokidar from 'chokidar'
import { spawn } from 'node:child_process'

import { staticTargets, syncChangedFile, syncTarget } from './static-assets.js'

/* ---------------------------------------- */

/* ---------------------------------------- */

console.log('[watch:static] initial copy...')
staticTargets.forEach(target => syncTarget('[watch:static]', target))
console.log('[watch:static] initial copy done')

/* ---------------------------------------- */

const watcher = chokidar.watch(
  staticTargets.map(t => t.src),
  {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  }
)

// Route a changed path to the appropriate copy helper
function handleChange(changedPath) {
  changedPath = changedPath.normalize() // Ensure consistent path format across platforms
  const target = staticTargets.find(t => changedPath.startsWith(t.src))
  if (!target) return
  target.isFile ? syncTarget('[watch:static]', target) : syncChangedFile(changedPath, '[watch:static]', target)
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
      staticTargets.map(t => t.src)
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
