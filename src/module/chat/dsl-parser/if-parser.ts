/**
 * if-parser.ts
 *
 * A recursive-descent parser that builds an Abstract Syntax Tree (AST) for
 * the `/if` chat command grammar (GGA / GURPS Game Aid for Foundry VTT).
 *
 * AST SHAPE
 * ---------
 * There are exactly three node concepts:
 *   - Node        = IfStatement | Block   (the parent type)
 *   - IfStatement = SimpleIfStatement | OutcomeIfStatement
 *   - Block       = { kind: 'Block', text: string }   (opaque text; no
 *                    subtypes -- it never carries a nested if-statement
 *                    itself; see below)
 *
 * A `SimpleIfStatement`'s `thenAction`/`elseAction`, and an
 * `OutcomeIfStatement`'s `cs`/`s`/`f`/`cf`, are all typed `Node` (for the
 * optional outcome fields, `Node | null`): each one is either a `Block`
 * of opaque text, or another `IfStatement` directly. There is no
 * intermediate wrapper -- a nested `/if` found inside `[...]`, `{...}`,
 * or written bare is just parsed straight into an `IfStatement` node, and
 * anything else (whatever it looks like -- an OTF formula, a chat
 * command, plain narrative) becomes a `Block` holding the raw text
 * verbatim. The parser never tries to interpret that text further.
 *
 * GRAMMAR SIMPLIFICATION: no more bare outcome branches
 * ------------------------------------------------------
 * A previous version of this grammar allowed an outcome-if's success/
 * failure branches to be written "bare" (`{success}` with no `s:`
 * label), inferring their role positionally (first bare block after
 * `cs:` is success, a second is failure, etc). That machinery existed
 * only to support an AST that distinguished "explicit" from "bare"
 * branches. Since this AST no longer makes that distinction -- a branch
 * is just present or absent under its `cs`/`s`/`f`/`cf` field -- bare
 * branches have been dropped from the grammar entirely. Every branch
 * must now carry its explicit label, and labels that are present must
 * appear in the fixed order cs, s, f, cf.
 *
 * DISAMBIGUATION (simple vs. outcome)
 * ------------------------------------
 * After the condition, an outcome-if-statement must have at least one
 * of `cs:`/`s:`/`f:`/`cf:` immediately following. If the very next
 * token is one of those four prefixes, this is an outcome-if-statement;
 * otherwise it's a simple-if-statement (whose then-action is never
 * prefixed that way).
 *
 * `/else` is a "dangling else": in `/if [A] /if [B] [X] /else [Y]`, the
 * `/else [Y]` binds to the *nearest* enclosing `/if` (the inner
 * `/if [B]`), because a nested if-statement greedily consumes its own
 * optional `/else` before returning control to whatever is parsing the
 * outer statement. This is the same resolution most C-like languages use
 * for dangling else.
 */

import { findMatchingDelimiter, ParseError } from './parser-helpers.ts'

export namespace IfParser {
  // ---------------------------------------------------------------------
  // AST node types
  // ---------------------------------------------------------------------

  export type Node = IfStatement | Block

  export interface Block {
    kind: 'Block'
    /** Opaque text, taken verbatim from the source (brackets/braces
     *  stripped if it was bracketed/braced). Never interpreted further. */
    text: string
  }

  export type IfStatement = SimpleIfStatement | OutcomeIfStatement

  export interface SimpleIfStatement {
    kind: 'SimpleIfStatement'
    negated: boolean
    /** Opaque bracket content; a condition is never itself a nested if. */
    condition: string
    thenAction: Node
    elseAction: Node | null
  }

  export interface OutcomeIfStatement {
    kind: 'OutcomeIfStatement'
    condition: string
    cs: Node | null
    s: Node | null
    f: Node | null
    cf: Node | null
  }

  // ---------------------------------------------------------------------
  // Parser
  // ---------------------------------------------------------------------

  class Parser {
    private src: string
    private pos: number

    constructor(src: string) {
      this.src = src
      this.pos = 0
    }

    private eof(): boolean {
      return this.pos >= this.src.length
    }

    private peekChar(): string {
      return this.eof() ? '' : this.src[this.pos]
    }

    /** Skips zero or more literal spaces/tabs (the grammar's `white-space`
     *  rule technically requires one-or-more in most spots, but this parser
     *  is deliberately lenient about whitespace counts). */
    private skipWs(): void {
      while (!this.eof() && (this.peekChar() === ' ' || this.peekChar() === '\t')) {
        this.pos++
      }
    }

    /** Case-insensitively consumes `word` if it appears at the current
     *  position; returns whether it matched. */
    private matchKeyword(word: string): boolean {
      if (this.src.slice(this.pos, this.pos + word.length).toLowerCase() === word.toLowerCase()) {
        this.pos += word.length

        return true
      }

      return false
    }

    /** Non-consuming (lookahead) test for `name:` at the current position,
     *  e.g. matchesPrefix('cs') tests for "cs:" case-insensitively. */
    private matchesPrefix(name: string): boolean {
      return new RegExp('^' + name + ':', 'i').test(this.src.slice(this.pos))
    }

    /** Non-consuming test for a bare `/if` at the current position. */
    private matchesIfLookahead(): boolean {
      return /^\/if\b/i.test(this.src.slice(this.pos))
    }

    expectEnd(): void {
      this.skipWs()

      if (!this.eof()) {
        this.error(`unexpected trailing input: '${this.src.slice(this.pos, this.pos + 30)}'`)
      }
    }

    private error(msg: string): never {
      const context = this.src.slice(this.pos, this.pos + 20)

      throw new ParseError(`${msg} (at position ${this.pos}, near '${context}')`)
    }

    /** Extracts and consumes the content between a `[` at the current
     *  position and its matching `]`. */
    private consumeBracketContent(): string {
      if (this.peekChar() !== '[') this.error("expected '['")
      const openIdx = this.pos
      const closeIdx = findMatchingDelimiter(this.src, openIdx, '[', ']')
      const inner = this.src.slice(openIdx + 1, closeIdx)

      this.pos = closeIdx + 1

      return inner
    }

    /** Extracts and consumes the content between a `{` at the current
     *  position and its matching `}`. */
    private consumeBraceContent(): string {
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

    parseIfStatement(): IfStatement {
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
     *  outcome-if-statement's clause list (cs:/s:/f:/cf:). */
    private matchesOutcomeLookahead(): boolean {
      return /^(cs|cf|s|f):/i.test(this.src.slice(this.pos))
    }

    // condition = "[", opaque-text, "]"
    private parseCondition(): string {
      this.skipWs()
      if (this.peekChar() !== '[') this.error("expected condition starting with '['")
      const text = this.consumeBracketContent()

      if (text.length === 0) this.error('condition must not be empty')

      return text
    }

    // -------------------------------------------------------------
    // simple-if-statement tail: then-action [ [/else] else-action ]
    // -------------------------------------------------------------

    private parseSimpleIfTail(negated: boolean, condition: string): SimpleIfStatement {
      const thenAction = this.parseAction()

      this.skipWs()

      let elseAction: Node | null = null

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

    // action = if-statement | "[" opaque-text "]" | "{" (if-statement | opaque-text) "}" | opaque-text
    private parseAction(): Node {
      this.skipWs()

      if (this.matchesIfLookahead()) {
        // Parsed in place: a bare nested if-statement is self-terminating,
        // so it needs no pre-extracted boundary.
        return this.parseIfStatement()
      }

      if (this.peekChar() === '[') {
        return { kind: 'Block', text: this.consumeBracketContent() }
      }

      if (this.peekChar() === '{') {
        return braceContentToNode(this.consumeBraceContent())
      }

      // Bare opaque text: runs until a top-level "/else" keyword, or end of
      // input. We don't care what it looks like -- kept verbatim.
      const rest = this.src.slice(this.pos)
      const elseMatch = rest.match(/\/else\b/i)
      let text: string

      if (elseMatch) {
        text = rest.slice(0, elseMatch.index)
        this.pos += elseMatch.index!
      } else {
        text = rest
        this.pos = this.src.length
      }

      text = text.trim()
      if (text.length === 0) this.error('expected an action (a nested /if, a bracket, a block, or text)')

      return { kind: 'Block', text }
    }

    // -------------------------------------------------------------
    // outcome-if-statement: [cs:{...}] [s:{...}] [f:{...}] [cf:{...}]
    // (each optional; when present, must appear in this order)
    // -------------------------------------------------------------

    private parseOutcomeIfTail(condition: string): OutcomeIfStatement {
      let critSuccess: Node | null = null
      let success: Node | null = null
      let failure: Node | null = null
      let critFailure: Node | null = null

      if (this.matchesPrefix('cs')) {
        critSuccess = this.parseOutcomeClause('cs')
        this.skipWs()
      }

      if (!this.eof() && this.matchesPrefix('s')) {
        success = this.parseOutcomeClause('s')
        this.skipWs()
      }

      if (!this.eof() && this.matchesPrefix('f')) {
        failure = this.parseOutcomeClause('f')
        this.skipWs()
      }

      if (!this.eof() && this.matchesPrefix('cf')) {
        critFailure = this.parseOutcomeClause('cf')
        this.skipWs()
      }

      return { kind: 'OutcomeIfStatement', condition, cs: critSuccess, s: success, f: failure, cf: critFailure }
    }

    // outcome-clause = "{" (if-statement | opaque-text) "}", preceded by "name:"
    private parseOutcomeClause(name: string): Node {
      if (!this.matchKeyword(name + ':')) this.error(`expected '${name}:'`)
      this.skipWs()

      return braceContentToNode(this.consumeBraceContent())
    }
  }

  function looksLikeNestedIf(text: string): boolean {
    return /^\/if\b/i.test(text.trim())
  }

  /** Turns the raw content of a `{...}` into a Node: a nested if-statement
   *  if it looks like one, otherwise an opaque Block. */
  function braceContentToNode(inner: string): Node {
    if (looksLikeNestedIf(inner)) {
      return parseIfStatementFromIsolatedText(inner.trim())
    }

    return { kind: 'Block', text: inner }
  }

  // ---------------------------------------------------------------------
  // Self-contained parse of an isolated substring (must consume it fully).
  // ---------------------------------------------------------------------

  function parseIfStatementFromIsolatedText(text: string): IfStatement {
    const parser = new Parser(text)
    const result = parser.parseIfStatement()

    parser.expectEnd()

    return result
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  /**
   * Parses a full `/if ...` chat command into an AST.
   * Throws ParseError on malformed input.
   */
  export function parse(text: string): IfStatement {
    return parseIfStatementFromIsolatedText(text)
  }
}
