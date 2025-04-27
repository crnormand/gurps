import fs from 'fs-extra'
import path from 'path'

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
const outputBase = 'dist'

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function copyFolder(srcFolder: string) {
  const srcPath = path.resolve(srcFolder)
  const destPath = path.resolve(outputBase, srcFolder)
  await fs.copy(srcPath, destPath)
  console.log(`Copied folder: ${srcFolder}`)
}

async function copyFile(file: string) {
  const srcPath = path.resolve(file)
  const destPath = path.resolve(outputBase, file)
  await fs.ensureDir(path.dirname(destPath))
  await fs.copyFile(srcPath, destPath)
  console.log(`Copied file: ${file}`)
}

async function main() {
  console.log('Building static files...')

  await Promise.all([
    ...staticFolders.map(async folder => {
      if (await exists(folder)) {
        await copyFolder(folder)
      }
    }),
    ...staticRootFiles.map(async file => {
      if (await exists(file)) {
        await copyFile(file)
      }
    }),
  ])

  console.log('Static build complete.')
}

main().catch(err => {
  console.error('Error building static files:', err)
  process.exit(1)
})
