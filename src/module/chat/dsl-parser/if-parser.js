/**
 * =============================================================================================
 * NOTICE: I created the EBNF grammar and some narrative text for the `/if` chat command parser
 * in file `src/module/chat/dsl-parser/if-command.md` and asked Claude to generate an AST parser.
 * This is that code. I've yet to fully review or test it, or integrate it into the codebase.
 * It might replace `src/module/chat/if-block-parser.js`.
 * =============================================================================================
 *
 * A recursive-descent parser that builds an Abstract Syntax Tree (AST) for
 * the `/if` chat command grammar (GGA / GURPS Game Aid for Foundry VTT).
 *
 * Covers both statement forms:
 *   - simple-if-statement   (/if [cond] then [/else] else)
 *   - outcome-if-statement  (/if [cond] cs:{...} s:{...} f:{...} cf:{...})
 *
 * DESIGN NOTES
 * ------------
 * The full "On-the-Fly formula" (OTF) grammar that lives *inside* an
 * otf-bracket (e.g. `[S:Acrobatics-2]`, `[2d cut]`, `[HT+2]`) is a large,
 * separate grammar that is out of scope for this parser. Every otf-bracket
 * is therefore parsed structurally (its optional quoted label is extracted,
 * and it is checked for a *nested* `/if` command), but the OTF formula body
 * itself is kept as a raw, unparsed string on the node (`.raw`). Downstream
 * code that already understands the OTF formula grammar can parse `.raw`
 * further.
 *
 * DISAMBIGUATION
 * ---------------
 * After the condition, the grammar has two statement shapes that both start
 * with more input. We disambiguate exactly the way the grammar's own rules
 * do: an *outcome* statement's first branch MUST be explicitly prefixed
 * (`cs:`, `s:`, `f:`, or `cf:`), so if the very next token is one of those
 * four prefixes, this is an outcome-if-statement; otherwise it's a
 * simple-if-statement (whose then-action is never prefixed that way).
 *
 * A `/else` keyword is optional in the simple form (the grammar allows the
 * else-action to follow the then-action directly, with no literal
 * "/else"), so we treat "/else" as an optional token to consume if present.
 *
 * Every recursive construct (an OTF bracket's `[...]` body, a block's
 * `{...}` body) is first *extracted* as an isolated substring using
 * delimiter-matching (which also skips over quoted strings so that a
 * quoted label can't confuse bracket/brace counting), and only then handed
 * to a fresh, self-contained parse that must consume the whole substring.
 * This sidesteps a lot of lookahead complexity that would otherwise be
 * needed to know where one construct ends and the next begins.
 */

'use strict'

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

class ParseError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ParseError'
  }
}

// ---------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------

/**
 * Find the index of the delimiter that matches the one at `startIndex`
 * (str[startIndex] must be `open`), honoring nesting and skipping the
 * contents of double-quoted strings (so a label like "[foo]" inside quotes
 * doesn't throw off bracket counting).
 */
function findMatchingDelimiter(str, startIndex, open, close) {
  let depth = 0
  let inQuote = false

  for (let i = startIndex; i < str.length; i++) {
    const ch = str[i]

    if (ch === '"') {
      inQuote = !inQuote
      continue
    }

    if (inQuote) continue

    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return i
    }
  }

  throw new ParseError(`unmatched '${open}' starting at position ${startIndex}`)
}

// ---------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------

class Parser {
  constructor(src) {
    this.src = src
    this.pos = 0
  }

  eof() {
    return this.pos >= this.src.length
  }

  peekChar() {
    return this.eof() ? '' : this.src[this.pos]
  }

  /** Skips zero or more literal spaces/tabs (the grammar's `white-space`
   *  rule technically requires one-or-more in most spots, but this parser
   *  is deliberately lenient about whitespace counts). */
  skipWs() {
    while (!this.eof() && (this.peekChar() === ' ' || this.peekChar() === '\t')) {
      this.pos++
    }
  }

  /** Case-insensitively consumes `word` if it appears at the current
   *  position; returns whether it matched. */
  matchKeyword(word) {
    if (this.src.slice(this.pos, this.pos + word.length).toLowerCase() === word.toLowerCase()) {
      this.pos += word.length

      return true
    }

    return false
  }

  /** Non-consuming (lookahead) test for `name:` at the current position,
   *  e.g. matchesPrefix('cs') tests for "cs:" case-insensitively. */
  matchesPrefix(name) {
    return new RegExp('^' + name + ':', 'i').test(this.src.slice(this.pos))
  }

  expectEnd() {
    this.skipWs()

    if (!this.eof()) {
      this.error(`unexpected trailing input: '${this.src.slice(this.pos, this.pos + 30)}'`)
    }
  }

  error(msg) {
    const context = this.src.slice(this.pos, this.pos + 20)

    throw new ParseError(`${msg} (at position ${this.pos}, near '${context}')`)
  }

  /** Extracts and consumes the content between a `{` at the current
   *  position and its matching `}`, returning the raw inner text. */
  consumeBraceContent() {
    if (this.peekChar() !== '{') this.error("expected '{'")
    const openIdx = this.pos
    const closeIdx = findMatchingDelimiter(this.src, openIdx, '{', '}')
    const inner = this.src.slice(openIdx + 1, closeIdx)

    this.pos = closeIdx + 1

    return inner
  }

  // -------------------------------------------------------------
  // if-statement = simple-if-statement | outcome-if-statement
  // -------------------------------------------------------------

  parseIfStatement() {
    this.skipWs()
    if (!this.matchKeyword('/if')) this.error("expected '/if'")
    this.skipWs()

    let negated = false

    if (this.peekChar() === '!') {
      negated = true
      this.pos++
      this.skipWs()
    }

    const condition = this.parseCondition()

    this.skipWs()

    if (!negated && this.matchesOutcomeLookahead()) {
      return this.parseOutcomeIfTail(condition)
    }

    return this.parseSimpleIfTail(negated, condition)
  }

  /** True if the upcoming tokens look like the start of an
   *  outcome-if-statement's branch list (cs:/s:/f:/cf:). */
  matchesOutcomeLookahead() {
    return /^(cs|cf|s|f):/i.test(this.src.slice(this.pos))
  }

  // -------------------------------------------------------------
  // condition = existence-check | otf-bracket
  // -------------------------------------------------------------

  parseCondition() {
    this.skipWs()
    if (this.peekChar() !== '[') this.error("expected condition starting with '['")
    if (this.src[this.pos + 1] === '?') return this.parseExistenceCheck()

    return this.parseOtfBracket()
  }

  parseExistenceCheck() {
    const openIdx = this.pos
    const closeIdx = findMatchingDelimiter(this.src, openIdx, '[', ']')
    const inner = this.src.slice(openIdx + 2, closeIdx) // skip the leading "[?"

    this.pos = closeIdx + 1

    // Longest-match-first, per the grammar's note on list-code.
    const CODES = ['AD', 'AT', 'SK', 'SP', 'A', 'M', 'R', 'S']

    for (const code of CODES) {
      if (inner.slice(0, code.length).toUpperCase() === code && inner[code.length] === ':') {
        const targetName = inner.slice(code.length + 1)

        if (targetName.length === 0) this.error('existence-check target-name must not be empty')

        return { kind: 'ExistenceCheck', listCode: code, targetName }
      }
    }

    this.error(`invalid list-code in existence-check: '${inner}'`)
  }

  // -------------------------------------------------------------
  // otf-bracket = "[", [ label, white-space ], otf-body, "]"
  // -------------------------------------------------------------

  parseOtfBracket() {
    if (this.peekChar() !== '[') this.error("expected '['")
    const openIdx = this.pos
    const closeIdx = findMatchingDelimiter(this.src, openIdx, '[', ']')
    const inner = this.src.slice(openIdx + 1, closeIdx)

    this.pos = closeIdx + 1

    return buildOtfBracketFromInner(inner)
  }

  // -------------------------------------------------------------
  // simple-if-statement tail: then-action [ [/else] else-action ]
  // -------------------------------------------------------------

  parseSimpleIfTail(negated, condition) {
    const thenAction = this.parseAction()

    this.skipWs()

    let elseAction = null

    if (!this.eof()) {
      this.matchKeyword('/else') // optional literal keyword
      this.skipWs()

      if (!this.eof()) {
        elseAction = this.parseAction()
        this.skipWs()
      }
    }

    return { kind: 'SimpleIfStatement', negated, condition, thenAction, elseAction }
  }

  // action = otf-bracket | block | chat-text
  parseAction() {
    this.skipWs()

    if (this.peekChar() === '[') {
      return { kind: 'Action', type: 'otf', value: this.parseOtfBracket() }
    }

    if (this.peekChar() === '{') {
      return { kind: 'Action', type: 'block', value: this.parseBlock() }
    }

    // chat-text: runs until a top-level "/else" keyword, or end of input.
    const rest = this.src.slice(this.pos)
    const elseMatch = rest.match(/\/else\b/i)
    let text

    if (elseMatch) {
      text = rest.slice(0, elseMatch.index)
      this.pos += elseMatch.index
    } else {
      text = rest
      this.pos = this.src.length
    }

    text = text.trim()
    if (text.length === 0) this.error('expected an action (an OTF bracket, a block, or chat text)')

    return { kind: 'Action', type: 'text', value: text }
  }

  // block = "{", block-body, "}"   (no chat-text allowed here)
  parseBlock() {
    const inner = this.consumeBraceContent()

    return buildBlockFromInner(inner)
  }

  // -------------------------------------------------------------
  // outcome-if-statement tail: the branch list
  // -------------------------------------------------------------

  parseOutcomeIfTail(condition) {
    const branches = this.parseOutcomeBranches()

    return { kind: 'OutcomeIfStatement', condition, branches }
  }

  parseOutcomeBranches() {
    if (this.matchesPrefix('cs')) {
      const critSuccess = this.parseLabeledClause('cs')
      let success = null
      let failure = null

      this.skipWs()

      if (!this.eof()) {
        if (this.matchesPrefix('f')) {
          // cs-middle alt 2: explicit-failure-part alone (no success).
          failure = this.parseLabeledClause('f')
        } else if (this.matchesPrefix('s')) {
          success = this.parseLabeledClause('s')
          this.skipWs()

          if (!this.eof() && (this.matchesPrefix('f') || this.peekChar() === '{')) {
            failure = this.parseFailurePart()
          }
        } else if (this.peekChar() === '{') {
          success = this.parseBareBranch()
          this.skipWs()

          if (!this.eof() && (this.matchesPrefix('f') || this.peekChar() === '{')) {
            failure = this.parseFailurePart()
          }
        }
        // Otherwise (e.g. "cf:" comes next): cs-middle is simply absent.
      }

      this.skipWs()
      let critFailure = null

      if (this.matchesPrefix('cf')) {
        critFailure = this.parseLabeledClause('cf')
      }

      return { critSuccess, success, failure, critFailure }
    }

    if (this.matchesPrefix('s')) {
      const success = this.parseLabeledClause('s')

      this.skipWs()
      let failure = null
      let critFailure = null

      if (!this.eof() && (this.matchesPrefix('f') || this.peekChar() === '{')) {
        failure = this.parseFailurePart()
        this.skipWs()
      }

      if (this.matchesPrefix('cf')) critFailure = this.parseLabeledClause('cf')

      return { critSuccess: null, success, failure, critFailure }
    }

    if (this.matchesPrefix('f')) {
      const failure = this.parseLabeledClause('f')

      this.skipWs()
      let critFailure = null

      if (this.matchesPrefix('cf')) critFailure = this.parseLabeledClause('cf')

      return { critSuccess: null, success: null, failure, critFailure }
    }

    if (this.matchesPrefix('cf')) {
      const critFailure = this.parseLabeledClause('cf')

      return { critSuccess: null, success: null, failure: null, critFailure }
    }

    this.error(
      "outcome '/if' requires at least one branch, and the first branch must be " +
        "explicitly prefixed with 'cs:', 's:', 'f:', or 'cf:'"
    )
  }

  parseFailurePart() {
    if (this.matchesPrefix('f')) return this.parseLabeledClause('f')
    if (this.peekChar() === '{') return this.parseBareBranch()
    this.error("expected a failure block: 'f:{...}' or a bare '{...}'")
  }

  parseLabeledClause(name) {
    if (!this.matchKeyword(name + ':')) this.error(`expected '${name}:'`)
    this.skipWs()
    const block = this.parseOutcomeBlock()

    return { kind: 'OutcomeBranch', label: name, explicit: true, block }
  }

  parseBareBranch() {
    const block = this.parseOutcomeBlock()

    return { kind: 'OutcomeBranch', label: null, explicit: false, block }
  }

  // outcome-block = "{", (block-body | chat-text), "}"
  parseOutcomeBlock() {
    const inner = this.consumeBraceContent()

    return buildOutcomeBlockFromInner(inner)
  }
}

// ---------------------------------------------------------------------
// Builders for the content extracted from brackets/braces.
// These are free functions (rather than Parser methods) because they
// operate on an already-isolated substring, independent of any outer
// parser's cursor position.
// ---------------------------------------------------------------------

/** Builds an OtfBracket node from the raw text between `[` and `]`. */
function buildOtfBracketFromInner(inner) {
  let rest = inner.replace(/^[ \t]*/, '')
  let label = null

  if (rest[0] === '"') {
    const closeQuoteIdx = rest.indexOf('"', 1)

    if (closeQuoteIdx === -1) throw new ParseError('unterminated label quote in OTF bracket')
    label = rest.slice(1, closeQuoteIdx)
    rest = rest.slice(closeQuoteIdx + 1).replace(/^[ \t]*/, '')
  }

  if (/^\/if\b/i.test(rest.trim())) {
    const nestedIf = parseIfStatementFromIsolatedText(rest.trim())

    return { kind: 'OtfBracket', label, nestedIf, raw: rest }
  }

  return { kind: 'OtfBracket', label, nestedIf: null, raw: rest }
}

/** Builds a (plain) Block node from the raw text between `{` and `}`.
 *  Throws if the content is neither a nested /if nor a valid sequence of
 *  OTF brackets -- plain blocks (used for then/else) do not allow bare
 *  narrative text. */
function buildBlockFromInner(inner) {
  const trimmed = inner.trim()

  if (/^\/if\b/i.test(trimmed)) {
    const nestedIf = parseIfStatementFromIsolatedText(trimmed)

    return { kind: 'Block', nestedIf, otfBrackets: null, raw: inner }
  }

  const otfBrackets = parseOtfBracketSequenceFromIsolatedText(trimmed)

  return { kind: 'Block', nestedIf: null, otfBrackets, raw: inner }
}

/** Builds an OutcomeBlock node from the raw text between `{` and `}`.
 *  Falls back to chat-text if the content is neither a nested /if nor a
 *  valid sequence of OTF brackets. */
function buildOutcomeBlockFromInner(inner) {
  const trimmed = inner.trim()

  if (/^\/if\b/i.test(trimmed)) {
    const nestedIf = parseIfStatementFromIsolatedText(trimmed)

    return { kind: 'OutcomeBlock', nestedIf, otfBrackets: null, chatText: null, raw: inner }
  }

  if (trimmed.startsWith('[')) {
    try {
      const otfBrackets = parseOtfBracketSequenceFromIsolatedText(trimmed)

      return { kind: 'OutcomeBlock', nestedIf: null, otfBrackets, chatText: null, raw: inner }
    } catch (e) {
      // Not a valid OTF-bracket sequence after all -- fall through to
      // treating it as narrative chat text.
    }
  }

  return { kind: 'OutcomeBlock', nestedIf: null, otfBrackets: null, chatText: inner, raw: inner }
}

// ---------------------------------------------------------------------
// Self-contained parses of an isolated substring (must consume it fully).
// ---------------------------------------------------------------------

function parseIfStatementFromIsolatedText(text) {
  const parser = new Parser(text)
  const result = parser.parseIfStatement()

  parser.expectEnd()

  return result
}

function parseOtfBracketSequenceFromIsolatedText(text) {
  const parser = new Parser(text)

  parser.skipWs()
  const brackets = [parser.parseOtfBracket()]


  while (true) {
    const save = parser.pos

    parser.skipWs()

    if (parser.peekChar() === '[') {
      brackets.push(parser.parseOtfBracket())
    } else {
      parser.pos = save
      break
    }
  }

  parser.expectEnd()

  return brackets
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Parses a full `/if ...` chat command into an AST.
 * Throws ParseError on malformed input.
 */
function parseIfCommand(text) {
  return parseIfStatementFromIsolatedText(text)
}

if (typeof module !== 'undefined') {
  module.exports = { parseIfCommand, ParseError }
}

// ---------------------------------------------------------------------
// Self-test / demo (only runs when this file is executed directly)
// ---------------------------------------------------------------------

if (typeof require !== 'undefined' && require.main === module) {
  const util = require('util')
  const show = ast => util.inspect(ast, { depth: null, colors: false })

  let passed = 0
  let failed = 0

  function expectValid(label, text) {
    try {
      const ast = parseIfCommand(text)

      passed++
      console.log(`PASS (valid)   ${label}: ${text}`)
    } catch (e) {
      failed++
      console.log(`FAIL (valid)   ${label}: ${text}\n   -> unexpectedly threw: ${e.message}`)
    }
  }

  function expectInvalid(label, text) {
    try {
      parseIfCommand(text)
      failed++
      console.log(`FAIL (invalid) ${label}: ${text}\n   -> unexpectedly parsed without error`)
    } catch (e) {
      passed++
      console.log(`PASS (invalid) ${label}: ${text}\n   -> correctly rejected: ${e.message}`)
    }
  }

  console.log('=== Outcome-if-statement: valid examples from the spec ===')
  const validOutcomeExamples = [
    'cs:{crit-success}',
    'cs:{crit-success} {success}',
    'cs:{crit-success} s:{success}',
    'cs:{crit-success} {success} {failure}',
    'cs:{crit-success} s:{success} f:{failure}',
    'cs:{crit-success} {success} f:{failure}',
    'cs:{crit-success} s:{success} {failure}',
    'cs:{crit-success} f:{failure}',
    'cs:{crit-success} {success} cf:{crit-failure}',
    'cs:{crit-success} s:{success} cf:{crit-failure}',
    'cs:{crit-success} {success} {failure} cf:{crit-failure}',
    'cs:{crit-success} s:{success} f:{failure} cf:{crit-failure}',
    'cs:{crit-success} {success} f:{failure} cf:{crit-failure}',
    'cs:{crit-success} s:{success} {failure} cf:{crit-failure}',
    'cs:{crit-success} f:{failure} cf:{crit-failure}',
    'cs:{crit-success} cf:{crit-failure}',
    's:{success}',
    's:{success} {failure}',
    's:{success} f:{failure}',
    's:{success} {failure} cf:{crit-failure}',
    's:{success} f:{failure} cf:{crit-failure}',
    'f:{failure}',
    'f:{failure} cf:{crit-failure}',
    'cf:{crit-failure}',
  ]

  validOutcomeExamples.forEach((branches, i) => {
    expectValid(`#${i + 1}`, `/if [?S:Acrobatics] ${branches}`)
  })

  console.log('\n=== Outcome-if-statement: invalid examples from the spec ===')
  expectInvalid('unprefixed-first-1', '/if [?S:Acrobatics] {success} f:{failure}')
  expectInvalid('wrong-order-1', '/if [?S:Acrobatics] cf:{crit-failure} {success} f:{failure}')
  expectInvalid('wrong-order-2', '/if [?S:Acrobatics] {success} cf:{crit-failure} f:{failure}')
  expectInvalid('unprefixed-first-2', '/if [?S:Acrobatics] {success} f:{failure}')

  console.log('\n=== Simple-if-statement: assorted cases ===')
  expectValid('bracket then/else, no /else keyword', '/if [?AD:Hard To Kill] [HT+2] [HT-2]')
  expectValid('bracket then/else, with /else keyword', '/if [S:Acrobatics] [Dodge +2] /else [Dodge -2]')
  expectValid('negated condition', '/if ![?AD:Hard To Kill] [HT+2] [HT-2]')
  expectValid('nested /if inside blocks', '/if [?Sk:Acrobatics] {/if [SK:Acrobatics] [Dodge+2] [Dodge -2]} {[Dodge]}')
  expectValid('chat text then-action only', '/if [?S:Acrobatics] You catch your footing.')
  expectValid('chat text then, bracket else via /else', '/if [S:Acrobatics] Nice landing! /else [Dodge -2]')
  expectValid('quoted label on OTF bracket', '/if [S:Acrobatics] ["Balance!" Dodge +2] /else [Dodge -2]')
  expectInvalid('bad list-code', '/if [?ZZ:Foo] [HT+2]')
  expectInvalid('missing then-action', '/if [?S:Acrobatics]')

  console.log(`\n${passed} passed, ${failed} failed`)

  console.log('\n=== Example AST ===')
  console.log(show(parseIfCommand('/if [?Sk:Acrobatics] {/if [SK:Acrobatics] [Dodge+2] [Dodge -2]} {[Dodge]}')))

  console.log('\n=== Example AST (outcome form) ===')
  console.log(
    show(parseIfCommand('/if [S:Acrobatics] cs:{Amazing!} s:{[Dodge+2]} f:{[Dodge-2]} cf:{You stumble badly.}'))
  )
}
