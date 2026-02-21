import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

export const outputBase = 'dist'

const staticFolders = ['anim', 'assets', 'icons', 'lang', 'templates', 'ui']
const staticFiles = ['changelog.md', 'LICENSE', 'README.md', 'system.json', 'template.json']
const sourceFolders = [{ input: 'src/lib', output: `${outputBase}/lib` }]

export const watchTargets = [
  ...staticFolders.map(folder => ({
    src: join('static', folder),
    dest: join(outputBase, folder),
  })),
  ...sourceFolders.map(({ input, output }) => ({
    src: input,
    dest: output,
  })),
  ...staticFiles.map(file => ({
    src: existsSync(join('static', file)) ? join('static', file) : file,
    dest: join(outputBase, basename(file)),
    isFile: true,
  })),
].filter(t => existsSync(t.src))
