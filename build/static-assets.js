import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'

export const distDir = 'dist'

const staticFolders = ['anim', 'assets', 'icons', 'lang', 'templates', 'ui']
const staticFiles = ['changelog.md', 'LICENSE', 'README.md', 'system.json', 'template.json']
const extraSourceDirs = [{ src: 'src/lib', dest: `${distDir}/lib` }]

export const staticTargets = [
  ...staticFolders.map(folder => ({
    src: join('static', folder),
    dest: join(distDir, folder),
  })),
  ...extraSourceDirs.map(({ src, dest }) => ({
    src,
    dest,
  })),
  ...staticFiles.map(file => ({
    src: existsSync(join('static', file)) ? join('static', file) : file,
    dest: join(distDir, basename(file)),
    isFile: true,
  })),
].filter(t => existsSync(t.src))

/* ---------------------------------------- */

// Copy a whole target root to its destination
export function syncTarget(tag, { src, dest, isFile }) {
  try {
    cpSync(src, dest, isFile ? {} : { recursive: true })
    console.log(`${tag} synced ${src} -> ${dest}`)
  } catch (err) {
    console.error(`${tag} failed to sync ${src} -> ${dest}${isFile ? ' (file)' : ' (tree)'}`, err)
  }
}

/* ---------------------------------------- */

// Copy a single changed file into the dest tree
export function syncChangedFile(changedPath, tag, { src, dest }) {
  const rel = relative(src, changedPath)
  const destPath = join(dest, rel)
  try {
    mkdirSync(dirname(destPath), { recursive: true })
    cpSync(changedPath, destPath)
    console.log(`${tag} copied ${changedPath} -> ${destPath}`)
  } catch (err) {
    console.error(`${tag} failed to copy changed file ${changedPath} -> ${destPath}`, err)
  }
}
