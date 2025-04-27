import chokidar from 'chokidar'
import { spawn } from 'child_process'
import path from 'path'

// Setup
export const staticFolders: string[] = [
  'assets',
  'icons',
  'lang',
  'lib',
  'scripts',
  'utils',
  'ui',
  'exportutils',
  'styles',
  'templates',
]
export const staticRootFiles: string[] = ['changelog.md', 'LICENSE.txt', 'README.md', 'system.json', 'template.json']
const watchPaths = [...staticFolders, ...staticRootFiles]

function runSync(event: string, filePath: string) {
  const child = spawn('tsx', [path.join('build', 'sync-static-runner.ts'), event, filePath.replace(/\\/g, '/')], {
    stdio: 'inherit',
  })

  child.on('error', err => {
    console.error('Error in sync-static-runner.ts:', err)
  })
}

async function main() {
  console.log('Watching static files...')
  console.log('Paths:', watchPaths)

  const watcher = chokidar.watch(watchPaths, { ignoreInitial: true })

  watcher.on('add', filePath => runSync('add', filePath))
  watcher.on('change', filePath => runSync('change', filePath))
  watcher.on('unlink', filePath => runSync('unlink', filePath))
}

main().catch(err => {
  console.error('Fatal error in watch-static.ts:', err)
  process.exit(1)
})
