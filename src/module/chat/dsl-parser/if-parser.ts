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
    type: 'Block'
    /** Opaque text, taken verbatim from the source (brackets/braces
     *  stripped if it was bracketed/braced). Never interpreted further. */
    value: string
    /** The original text of the block, before any further parsing. */
    text?: string
  }

  export type IfStatement = SimpleIfStatement | OutcomeIfStatement

  export interface SimpleIfStatement {
    type: 'SimpleIfStatement'
    negated: boolean
    /** Opaque bracket content; a condition is never itself a nested if. */
    condition: string
    thenAction: Node
    elseAction?: Node
    /** The original text of the simple if statement, before any further parsing. */
    text?: string
  }

  export interface OutcomeIfStatement {
    type: 'OutcomeIfStatement'
    condition: string
    critSuccessAction?: Node
    successAction?: Node
    failureAction?: Node
    critFailureAction?: Node
    /** The original text of the outcome if statement, before any further parsing. */
    text?: string
  }

  // ---------------------------------------------------------------------
  // Parser
  // ---------------------------------------------------------------------

  class Parser {
    private input: string
    private pos: number

    constructor(src: string) {
      this.input = src
      this.pos = 0
    }

    private atEnd(): boolean {
      return this.pos >= this.input.length
    }

    private peek(): string {
      return this.input[this.pos]
    }

    /** Skips zero or more literal spaces/tabs (the grammar's `white-space`
     *  rule technically requires one-or-more in most spots, but this parser
     *  is deliberately lenient about whitespace counts). */
    private skipWhitespace(): void {
      while (!this.atEnd()) {
        const char = this.input[this.pos]

        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') this.pos++
        else break
      }
    }

    /** Case-insensitively consumes `word` if it appears at the current
     *  position; returns whether it matched. */
    private consumeLiteral(word: string): boolean {
      if (this.input.toLowerCase().startsWith(word.toLowerCase(), this.pos)) {
        this.pos += word.length

        return true
      }

      return false
    }

    /** Non-consuming (lookahead) test for `name:` at the current position,
     *  e.g. matchesPrefix('cs') tests for "cs:" case-insensitively. */
    private matchesPrefix(name: string): boolean {
      return new RegExp('^' + name + ':', 'i').test(this.input.slice(this.pos))
    }

    /** Non-consuming (lookahead) test for `word` at the current position. */
    private matchesLookahead(word: string): boolean {
      const pattern = new RegExp('^' + word + '\\b', 'i')

      return pattern.test(this.input.slice(this.pos))
    }

    expectEnd(): void {
      this.skipWhitespace()

      if (!this.atEnd()) {
        this.error(`unexpected trailing input: '${this.input.slice(this.pos, this.pos + 30)}'`)
      }
    }

    private error(msg: string): never {
      const context = this.input.slice(this.pos, this.pos + 20)

      throw new ParseError(`${msg} (at position ${this.pos}, near '${context}')`)
    }

    /** Extracts and consumes the content between a `[` at the current
     *  position and its matching `]`. */
    private consumeBracketContent(): string {
      if (this.peek() !== '[') this.error("expected '['")
      const openIdx = this.pos
      const closeIdx = findMatchingDelimiter(this.input, openIdx, '[', ']')
      const inner = this.input.slice(openIdx + 1, closeIdx)

      this.pos = closeIdx + 1

      return inner
    }

    /** Extracts and consumes the content between a `{` at the current
     *  position and its matching `}`. */
    private consumeBraceContent(): string {
      if (this.peek() !== '{') this.error("expected '{'")
      const openIdx = this.pos
      const closeIdx = findMatchingDelimiter(this.input, openIdx, '{', '}')
      const inner = this.input.slice(openIdx + 1, closeIdx)

      this.pos = closeIdx + 1

      return inner
    }

    // -------------------------------------------------------------
    // if-statement = simple-if-statement | outcome-if-statement
    // -------------------------------------------------------------

    parseIfStatement(): IfStatement {
      const conditionStart = this.pos

      this.skipWhitespace()
      if (!this.consumeLiteral('/if')) this.error("expected '/if'")
      this.skipWhitespace()

      let negated = false

      if (this.peek() === '!') {
        negated = true
        this.pos++
        this.skipWhitespace()
      }

      const condition = this.parseCondition()

      this.skipWhitespace()

      if (!negated && this.matchesOutcomeLookahead()) {
        return this.parseOutcomeIfTail(condition)
      }

      const node = this.parseSimpleIfTail(negated, condition)

      node.text = this.input.slice(conditionStart, this.pos)

      return node
    }

    /** True if the upcoming tokens look like the start of an
     *  outcome-if-statement's clause list (cs:/s:/f:/cf:). */
    private matchesOutcomeLookahead(): boolean {
      return /^(cs|cf|s|f):/i.test(this.input.slice(this.pos))
    }

    // condition = "[", opaque-text, "]"
    private parseCondition(): string {
      this.skipWhitespace()
      if (this.peek() !== '[') this.error("expected condition starting with '['")
      const text = this.consumeBracketContent()

      if (text.length === 0) this.error('condition must not be empty')

      return text
    }

    // -------------------------------------------------------------
    // simple-if-statement tail: then-action [ [/else] else-action ]
    // -------------------------------------------------------------

    private parseSimpleIfTail(negated: boolean, condition: string): SimpleIfStatement {
      const thenAction = this.parseAction()

      this.skipWhitespace()

      let elseAction: Node | undefined = undefined

      if (!this.atEnd()) {
        this.consumeLiteral('/else') // optional literal keyword
        this.skipWhitespace()

        if (!this.atEnd()) {
          elseAction = this.parseAction()
          this.skipWhitespace()
        }
      }

      return { type: 'SimpleIfStatement', negated, condition, thenAction, elseAction }
    }

    // action = if-statement | "[" opaque-text "]" | "{" (if-statement | opaque-text) "}" | opaque-text
    private parseAction(): Node {
      const actionStart = this.pos

      this.skipWhitespace()

      if (this.matchesLookahead('/if')) {
        // Parsed in place: a bare nested if-statement is self-terminating,
        // so it needs no pre-extracted boundary.
        const node = this.parseIfStatement()

        node.text = this.input.slice(actionStart, this.pos)

        return node
      }

      if (this.peek() === '[') {
        const node = {
          type: 'Block' as const,
          value: this.consumeBracketContent(),
          text: this.input.slice(actionStart, this.pos),
        }

        return node
      }

      if (this.peek() === '{') {
        const node = braceContentToNode(this.consumeBraceContent())

        node.text = this.input.slice(actionStart, this.pos)

        return node
      }

      // Bare opaque text: runs until a top-level "/else" keyword, or end of
      // input. We don't care what it looks like -- kept verbatim.
      const rest = this.input.slice(this.pos)
      const elseMatch = rest.match(/\/else\b/i)
      let value: string

      if (elseMatch) {
        value = rest.slice(0, elseMatch.index)
        this.pos += elseMatch.index!
      } else {
        value = rest
        this.pos = this.input.length
      }

      value = value.trim()
      if (value.length === 0) this.error('expected an action (a nested /if, a bracket, a block, or text)')

      return { type: 'Block', value, text: this.input.slice(actionStart, this.pos) }
    }

    // -------------------------------------------------------------
    // outcome-if-statement: [cs:{...}] [s:{...}] [f:{...}] [cf:{...}]
    // (each optional; when present, must appear in this order)
    // -------------------------------------------------------------

    private parseOutcomeIfTail(condition: string): OutcomeIfStatement {
      let critSuccess: Node | undefined = undefined
      let success: Node | undefined = undefined
      let failure: Node | undefined = undefined
      let critFailure: Node | undefined = undefined

      if (this.matchesPrefix('cs')) {
        critSuccess = this.parseOutcomeClause('cs')
        this.skipWhitespace()
      }

      if (!this.atEnd() && this.matchesPrefix('s')) {
        success = this.parseOutcomeClause('s')
        this.skipWhitespace()
      }

      if (!this.atEnd() && this.matchesPrefix('f')) {
        failure = this.parseOutcomeClause('f')
        this.skipWhitespace()
      }

      if (!this.atEnd() && this.matchesPrefix('cf')) {
        critFailure = this.parseOutcomeClause('cf')
        this.skipWhitespace()
      }

      return {
        type: 'OutcomeIfStatement',
        condition,
        critSuccessAction: critSuccess,
        successAction: success,
        failureAction: failure,
        critFailureAction: critFailure,
      }
    }

    // outcome-clause = "{" (if-statement | opaque-text) "}", preceded by "name:"
    private parseOutcomeClause(name: string): Node {
      if (!this.consumeLiteral(name + ':')) this.error(`expected '${name}:'`)
      this.skipWhitespace()

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

    return { type: 'Block', value: inner }
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

  // ---------- Visitor/Evaluator ----------

  export type ConditionResolver = (condition: string, line: string) => Promise<boolean>

  export async function visit(node: Node, resolve: ConditionResolver): Promise<string> {
    if (!node) return ''

    switch (node.type) {
      case 'Block':
        return node.value

      case 'SimpleIfStatement': {
        const temp = await resolve(node.condition, node.text ?? '')
        const pass = node.negated ? !temp : temp
        const branch = pass ? node.thenAction : node.elseAction

        return branch ? await visit(branch, resolve) : ''
      }

      case 'OutcomeIfStatement': {
        const temp = await resolve(node.condition, node.text ?? '')
        const branch = temp
          ? GURPS.lastTargetedRoll?.isCritSuccess && node.critSuccessAction
            ? node.critSuccessAction
            : node.successAction
          : GURPS.lastTargetedRoll?.isCritFailure && node.critFailureAction
            ? node.critFailureAction
            : node.failureAction

        return branch ? await visit(branch, resolve) : ''
      }
    }
  }
}
