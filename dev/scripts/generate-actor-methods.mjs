#!/usr/bin/env node
// Tiny script to regenerate dev/static/actor-methods.md by scanning class methods in
// module/actor/actor.js (GurpsActor) and module/actor/gurps-actor.ts (GurpsActorV2).
// No external parser dependency; uses a light brace scan and regex on member signatures.

import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const FILES = [
  { file: path.join(repoRoot, 'module/actor/actor.js'), className: 'GurpsActor' },
  { file: path.join(repoRoot, 'module/actor/gurps-actor.ts'), className: 'GurpsActorV2' },
]

/**
 * Extract the class body substring (without the outermost braces) for the first class with className.
 */
function extractClassBody(source, className) {
  const classRegex = new RegExp(`class\\s+${className}\\b[^{]*{`, 'm')
  const match = source.match(classRegex)

  if (!match) return null
  const start = match.index + match[0].length
  // Walk forward to find the matching closing '}' at depth 0
  let depth = 1

  for (let i = start; i < source.length; i++) {
    const ch = source[i]

    if (ch === '{') depth++
    else if (ch === '}') depth--

    if (depth === 0) {
      return source.slice(start, i)
    }
  }

  return null
}

/**
 * Scan top-level class members and extract method-like signatures with modifiers.
 * Returns array of { name, kind, modifiers, raw }
 */
function extractMethodsFromClassBody(body) {
  const methods = []
  // Walk the body and capture member signatures preceding a top-level '{'
  let depth = 0
  let tokenStart = 0

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]

    if (ch === '{') {
      if (depth === 0) {
        // Signature is from last newline/semicolon up to i
        let sigStart = tokenStart

        // backtrack to previous newline to capture clean signature
        for (let signatureEnd = i - 1; signatureEnd >= 0; signatureEnd--) {
          if (body[signatureEnd] === '\n') {
            sigStart = signatureEnd + 1
            break
          }
        }

        const signature = body.slice(sigStart, i).trim()

        // Only consider signatures that look like method/get/set declarations (contain '(' )
        if (signature.includes('(')) {
          const parsedSignature = parseSignature(signature)

          if (parsedSignature) methods.push({ ...parsedSignature, raw: signature })
        }
      }

      depth++
    } else if (ch === '}') {
      depth--
      if (depth < 0) depth = 0
      // Next token starts after this brace; move to after newline if present
      tokenStart = i + 1
    }
  }

  return dedupe(methods)
}

function parseSignature(sig) {
  // Normalize whitespace
  const normalizedSignature = sig.replace(/\s+/g, ' ').trim()
  // Match optional modifiers, accessor, and name
  // Supports: public/private/protected, override, async, static, get/set, and private names like #foo
  const re =
    /^(?:(public|private|protected)\s+)?(?:(override)\s+)?(?:(async)\s+)?(?:(static)\s+)?(?:(get|set)\s+)?(#?[A-Za-z_][A-Za-z0-9_]*)\s*\(/
  const match = normalizedSignature.match(re)

  if (!match) return null
  const [, vis, override, asyncKw, staticKw, accessor, name] = match

  return {
    name,
    kind: accessor ? accessor : 'method',
    modifiers: {
      visibility: vis || null,
      override: !!override,
      async: !!asyncKw,
      static: !!staticKw,
      private: name.startsWith('#') || vis === 'private',
      protected: vis === 'protected',
    },
  }
}

function dedupe(list) {
  const seen = new Set()

  return list.filter(method => {
    const key = `${method.kind}:${method.name}:${method.modifiers.static ? 'S' : ''}:${method.modifiers.async ? 'A' : ''}:${method.modifiers.override ? 'O' : ''}`

    if (seen.has(key)) return false
    seen.add(key)

    return true
  })
}

function formatMethod(method) {
  const tags = []

  if (method.modifiers.static) tags.push('static')
  if (method.modifiers.async) tags.push('async')
  if (method.modifiers.override) tags.push('override')
  if (method.modifiers.private) tags.push('private')
  if (method.kind === 'get' || method.kind === 'set') tags.push(method.kind)
  const tagStr = tags.length ? ` — [${tags.join(', ')}]` : ''

  return `- ${method.name}()${tagStr}`
}

async function generate() {
  const sections = []

  sections.push('# Actor Class API Surface (auto-generated)')
  sections.push('')
  sections.push(`- Generated on: ${new Date().toISOString()}`)
  sections.push('')

  for (const { file, className } of FILES) {
    const source = await fs.readFile(file, 'utf8')
    const body = extractClassBody(source, className)

    if (!body) {
      sections.push(`## ${className}`)
      sections.push('> Could not locate class body.')
      continue
    }

    const methods = extractMethodsFromClassBody(body)
    // Group by kind for readability
    const getters = methods
      .filter(method => method.kind === 'get')
      .sort((left, right) => left.name.localeCompare(right.name))
    const setters = methods
      .filter(method => method.kind === 'set')
      .sort((left, right) => left.name.localeCompare(right.name))
    const normal = methods
      .filter(method => method.kind === 'method')
      .sort((left, right) => left.name.localeCompare(right.name))

    sections.push(`## ${className} (${path.relative(repoRoot, file)})`)
    sections.push('')

    if (getters.length) {
      sections.push('### Getters')
      sections.push(...getters.map(formatMethod))
      sections.push('')
    }

    if (setters.length) {
      sections.push('### Setters')
      sections.push(...setters.map(formatMethod))
      sections.push('')
    }

    if (normal.length) {
      sections.push('### Methods')
      sections.push(...normal.map(formatMethod))
      sections.push('')
    }
  }

  const outPath = path.join(repoRoot, 'dev/static/actor-methods.md')

  await fs.writeFile(outPath, sections.join('\n'), 'utf8')
  console.log(`Wrote ${outPath}`)
}

generate().catch(err => {
  console.error('Failed to generate actor methods doc:', err)
  process.exit(1)
})
