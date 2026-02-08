import { execSync } from 'node:child_process'
import fs from 'node:fs'

import { PurgeCSS } from 'purgecss'

async function ensureBuiltCss() {
  const out = 'dist/gurps.css'

  if (!fs.existsSync(out)) {
    console.log('dist/gurps.css missing; building styles...')
    execSync('npm run build:styles', { stdio: 'inherit' })
  }

  return out
}

async function run() {
  const contentGlobs = [
    'templates/**/*.hbs',
    'module/**/*.js',
    'module/**/*.ts',
    'lib/**/*.js',
    'scripts/**/*.js',
    'dist/templates/**/*.hbs',
  ]

  const compiledCss = await ensureBuiltCss()
  const cssGlobs = [compiledCss]

  const purgeCSSResult = await new PurgeCSS().purge({
    content: contentGlobs,
    css: cssGlobs,
    safelist: {
      standard: [
        // Common Foundry/FontAwesome/dynamic classes that should not be purged
        'active',
        'hidden',
        'open',
        'disabled',
        'is-active',
        'is-open',
        'window-content',
        'tab',
        'tabs',
        'flexrow',
        'flexcol',
        'item',
        'control-icon',
        'token-effect',
        'effect-control',
        'indent1',
        'indent2',
        'indent3',
        'indent4',
        'indent5',
        'indent6',
        'indent7',
        'indent8',
        'indent9',
      ],
      greedy: [/^fa-/, /^icon-/, /^ui-/, /^dialog-/, /^gm-/, /^selected$/],
    },
    rejected: true,
  })

  const report = purgeCSSResult.map(entry => ({ file: entry.file, rejected: entry.rejected || [] }))

  // Print a concise report grouped by CSS file
  for (const { file, rejected } of report) {
    if (!rejected.length) continue
    console.log(`\nCSS File: ${file}`)

    for (const sel of rejected) {
      console.log(`  - ${sel}`)
    }
  }

  const total = report.reduce((acc, r) => acc + r.rejected.length, 0)

  console.log(`\nTotal unused selectors detected: ${total}`)
}

run().catch(err => {
  console.error('Unused CSS analysis failed:', err)
  process.exit(1)
})
