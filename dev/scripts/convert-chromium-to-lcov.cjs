const fs = require('fs')
const path = require('path')

const { TraceMap, originalPositionFor } = require('@jridgewell/trace-mapping')

const coveragePath = './coverage/chromium-coverage.json'
const outputPath = './coverage/lcov.info'
const distDir = './dist'

function convertEntryToLCOV(entry) {
  const urlPath = new URL(entry.url).pathname

  if (!urlPath.includes('/systems/gurps/')) return null

  const trimmedPath = urlPath.replace(/^\/?systems\/gurps\//, '')
  const normalizedPath = trimmedPath.replace(/\//g, path.sep)
  const jsPath = path.resolve(distDir, normalizedPath)

  if (!fs.existsSync(jsPath)) {
    console.warn(`⚠️ Missing file: ${jsPath}`)

    return null
  }

  const lines = entry.text.split('\n')
  const lineHits = new Array(lines.length).fill(0)

  const mapPath = jsPath + '.map'

  if (!fs.existsSync(mapPath)) {
    console.warn(`⚠️ Missing source map for ${jsPath}`)

    return null
  }

  const rawMap = fs.readFileSync(mapPath, 'utf8')
  const traceMap = new TraceMap(JSON.parse(rawMap))
  const tsHits = new Map()

  for (const range of entry.ranges) {
    let offset = 0

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1

      if (offset + lineLength > range.start && offset < range.end) {
        const pos = originalPositionFor(traceMap, { line: i + 1, column: 0 })

        if (pos.source && pos.line) {
          const key = `${pos.source}:${pos.line}`

          tsHits.set(key, (tsHits.get(key) || 0) + 1)
        }
      }

      offset += lineLength
    }
  }

  let sourcePath = jsPath.replace(`${path.sep}dist${path.sep}`, `${path.sep}`)

  // Check to see if sourcePath exists on the filesystem. If not, replace .js with .ts.
  if (!fs.existsSync(sourcePath)) {
    const tsCandidate = sourcePath.replace(/\.js$/, '.ts')

    if (tsCandidate !== sourcePath && fs.existsSync(tsCandidate)) {
      console.warn(`ℹ️ Replacing missing JS source with TypeScript: ${tsCandidate}`)
      sourcePath = tsCandidate
    }
  }

  const lcov = [`SF:${sourcePath}`]

  for (const [key, count] of tsHits.entries()) {
    const [, line] = key.split(':')

    lcov.push(`DA:${line},${count}`)
  }

  lcov.push('end_of_record')

  return lcov.join('\n')
}

function convertCoverageToLCOV() {
  const raw = fs.readFileSync(coveragePath, 'utf8')
  const coverage = JSON.parse(raw)
  const lcovChunks = []

  for (const entry of coverage) {
    const lcov = convertEntryToLCOV(entry)

    if (lcov) lcovChunks.push(lcov)
  }

  fs.writeFileSync(outputPath, lcovChunks.join('\n'))
  console.log(`✅ LCOV report written to ${outputPath}`)
}

convertCoverageToLCOV()
