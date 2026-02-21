import chokidar from 'chokidar'
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { spawn } from 'node:child_process'

// Static asset definitions
const outputBase = 'dist'

const staticFolders = ['anim', 'assets', 'icons', 'lang', 'templates', 'ui']
const staticFiles = ['changelog.md', 'LICENSE', 'README.md', 'system.json', 'template.json']
const sourceFolders = [{ input: 'src/lib', output: `${outputBase}/lib` }]

// Map from watch-glob root -> { srcRoot, destRoot } so we know where to copy on change
const watchTargets = []

for (const folder of staticFolders) {
  const src = join('static', folder)
  const dest = join(outputBase, folder)
  watchTargets.push({ src, dest })
}

for (const { input, output } of sourceFolders) {
  watchTargets.push({ src: input, dest: output })
}

for (const file of staticFiles) {
  const src = existsSync(join('static', file)) ? join('static', file) : file
  const dest = outputBase
  watchTargets.push({ src, dest, isFile: true })
}

/* ---------------------------------------- */

// Helper: copy a single changed file into the dest tree
function copyFile(srcRoot, destRoot, changedPath) {
  const rel = relative(srcRoot, changedPath)
  const destPath = join(destRoot, rel)
  mkdirSync(dirname(destPath), { recursive: true })
  cpSync(changedPath, destPath)
  console.log(`[watch:static] copied ${changedPath} -> ${destPath}`)
}

function copyRoot(src, dest) {
  if (!existsSync(src)) return
  cpSync(src, dest, { recursive: true })
  console.log(`[watch:static] synced ${src} -> ${dest}`)
}

// Initial full copy
console.log('[watch:static] initial copy...')
for (const { src, dest, isFile } of watchTargets) {
  if (!existsSync(src)) continue
  if (isFile) {
    cpSync(src, join(dest, src.split('/').at(-1)))
  } else {
    cpSync(src, dest, { recursive: true })
  }
}
console.log('[watch:static] initial copy done')

// Chokidar watcher
const watchPaths = watchTargets.map(t => t.src).filter(existsSync)

const watcher = chokidar.watch(watchPaths, {
  persistent: true,
  ignoreInitial: true, // we already did the initial copy above
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
})

function handleChange(changedPath) {
  // Find which target owns this changed path
  for (const { src, dest, isFile } of watchTargets) {
    if (isFile) {
      if (changedPath === src || changedPath.endsWith(src)) {
        cpSync(src, join(dest, src.split('/').at(-1)))
        console.log(`[watch:static] copied ${src} -> ${dest}`)
      }
    } else if (changedPath.startsWith(src)) {
      copyFile(src, dest, changedPath)
      return
    }
  }
}

watcher
  .on('add', handleChange)
  .on('change', handleChange)
  .on('unlink', changedPath => {
    // Intentionally NOT deleting from dest — deletions in source during dev
    // shouldn't nuke your dist. Remove this comment and add fs.rmSync here
    // if you do want mirrored deletes.
    console.log(`[watch:static] source removed: ${changedPath} (dist untouched)`)
  })
  .on('error', err => console.error('[watch:static] error', err))
  .on('ready', () => console.log('[watch:static] watching', watchPaths))

// TypeScript + Sass watchers (spawned as before)
const processes = []

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

const shutdown = () => {
  watcher.close()
  for (const p of processes) p.kill('SIGTERM')
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
