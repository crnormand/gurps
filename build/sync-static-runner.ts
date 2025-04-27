import fs from 'fs-extra'
import path from 'path'

const outputBase = 'dist'

async function main() {
  const [event, filePath] = process.argv.slice(2)
  if (!event || !filePath) {
    console.error('Usage: tsx build/sync-static-runner.ts <event> <filePath>')
    process.exit(1)
  }

  const srcPath = path.resolve(filePath)
  const destPath = path.resolve(outputBase, filePath)

  if (event === 'unlink') {
    await fs.remove(destPath)
    console.log(`Deleted: ${destPath}`)
  } else {
    await fs.ensureDir(path.dirname(destPath))
    await fs.copyFile(srcPath, destPath)
    console.log(`Copied: ${srcPath} -> ${destPath}`)
  }
}

main().catch(err => {
  console.error('Fatal error in sync-static-runner.ts:', err)
  process.exit(1)
})
