import cpx from 'cpx2'

const staticFolders = ['assets', 'icons', 'lang', 'lib', 'scripts', 'utils', 'ui', 'exportutils', 'templates']
const staticFiles = ['changelog.md', 'LICENSE.txt', 'README.md', 'system.json', 'template.json']
const outputBase = 'dist'

// Copy static folders to the output directory
for (const folder of staticFolders) {
  const input = `${folder}/**/*`
  const output = `${outputBase}/${folder}`
  if (process.argv.includes('--watch')) {
    cpx.watch(input, output, {})
  } else {
    cpx.copy(input, output, {})
  }
}

// Copy static files to the output directory
for (const file of staticFiles) {
  const input = `${file}`
  const output = `${outputBase}`
  if (process.argv.includes('--watch')) {
    cpx.watch(input, output, {})
  } else {
    cpx.copy(input, output, {})
  }
}
