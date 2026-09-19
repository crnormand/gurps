// ---------- AST ----------

export type Block = IfNode | TextNode | undefined

export interface IfNode {
  type: 'if'
  condition: string
  invert: boolean
  thenBranch: Block | undefined
  elseBranch?: Block | undefined
  critSuccessBranch?: Block | undefined
  critFailureBranch?: Block | undefined
  line: string
}

export interface TextNode {
  type: 'text'
  value: string
}

class ParseError extends Error {}

// ---------- Parser ----------

export class IfBlockParser {
  private pos = 0

  private constructor(private readonly input: string) {}

  static parse(input: string): IfNode {
    const parser = new IfBlockParser(input)
    const block = parser.parseBlock()

    parser.skipWhitespace()

    if (!parser.atEnd()) {
      throw new ParseError(`Unexpected trailing input at ${parser.pos}: "${parser.input.slice(parser.pos)}"`)
    }

    return block as IfNode
  }

  private parseBlock(): Block {
    if (this.consumeLiteral('/if')) return this.parseIf()

    return this.parseText()
  }

  private parseIf(): IfNode {
    this.skipWhitespace()

    const input = `/if ${this.input.slice(this.pos)}`
    const invert = this.consumeLiteral('!')

    this.skipWhitespace()
    this.expect('[')
    const condition = this.readUntil(']').trim()

    this.expect(']')
    this.skipWhitespace()

    if (this.peek() === '{') {
      return this.parseIfCurlyBracesFormat(condition, invert, input)
    } else if (this.peek() === '[') {
      return this.parseIfSimpleFormat(condition, invert, input)
    } else if (this.peek() === '/') {
      return this.parseIfChatCommandFormat(condition, invert, input)
    } else if (this.isCritFormat()) {
      return this.parseCritBranches(condition, invert, input)
    } else {
      return this.parseIfChatTextFormat(condition, invert, input)
    }
  }

  /**
   * This only handles the curly braces format for the then-branch and optional else-branch. For example,
   * `/if [condition] { then-branch }`
   * `/if [condition] { then-branch } { else-branch }`
   * `/if [condition] { then-branch } /else { else-branch }`
   * @param condition
   * @param invert
   * @param input
   * @returns
   */
  private parseIfCurlyBracesFormat(condition: string, invert: boolean, input: string): IfNode {
    if (this.peek() !== '{') {
      throw new ParseError(`Expected "{" to open the then-branch at ${this.pos}`)
    }

    this.expect('{')
    const thenBranch = this.parseBlock()

    this.expect('}')

    let elseBranch: Block | undefined
    const checkpoint = this.pos

    this.skipWhitespace()

    if (this.peek() === '{') {
      this.expect('{')
      elseBranch = this.parseBlock()
      this.expect('}')
    } else {
      this.pos = checkpoint
    }

    return { line: input, type: 'if', condition, invert, thenBranch, elseBranch }
  }

  /**
   * This handles the chat command format for the then-branch and optional else-branch. For example,
   * `/if [condition] /command`
   * `/if [condition] /command /else /command`
   *
   * @param condition
   * @param invert
   * @param input
   * @returns
   */
  private parseIfChatCommandFormat(condition: string, invert: boolean, input: string): IfNode {
    let thenBranch: Block | undefined = undefined

    this.skipWhitespace()

    const start = this.pos

    while (!this.atEnd() && !this.input.startsWith('/if', this.pos) && !this.input.startsWith('/else', this.pos)) {
      this.pos++
    }

    const command = this.input.slice(start, this.pos).trim()

    if (command) {
      thenBranch = { type: 'text', value: command }
    }

    // if the next block is an /else, parse it as the elseBranch
    const checkpoint = this.pos

    this.skipWhitespace()
    const elseBranch: Block | undefined = this.parseElseBranch(checkpoint)

    return { line: input, type: 'if', condition, invert, thenBranch, elseBranch }
  }

  /**
   * This handles the chat text format for the then-branch and optional else-branch. For example,
   * `/if [condition] some text`
   * `/if [condition] some text /else some other text`
   *
   * @param condition
   * @param invert
   * @param input
   * @returns
   */
  private parseIfChatTextFormat(condition: string, invert: boolean, input: string): IfNode {
    let thenBranch: Block | undefined = undefined

    this.skipWhitespace()

    const start = this.pos

    while (!this.atEnd() && !this.input.startsWith('/else', this.pos)) {
      this.pos++
    }

    const text = this.input.slice(start, this.pos).trim()

    if (text) {
      thenBranch = { type: 'text', value: text }
    }

    // if the next block is an /else, parse it as the elseBranch
    const checkpoint = this.pos

    this.skipWhitespace()
    const elseBranch: Block | undefined = this.parseElseBranch(checkpoint)

    return { line: input, type: 'if', condition, invert, thenBranch, elseBranch }
  }

  /**
   * This handles the simple format for the then-branch and optional else-branch. For example,
   * `/if [condition] [then-branch]`
   * `/if [condition] [then-branch] [else-branch]`
   * `/if [condition] [then-branch] /else [else-branch]`
   *
   * @param condition
   * @param invert
   * @param input
   * @returns
   */
  private parseIfSimpleFormat(condition: string, invert: boolean, input: string): IfNode {
    let thenBranch: Block | undefined = undefined
    let elseBranch: Block | undefined = undefined

    this.skipWhitespace()

    if (this.peek() === '[') {
      this.expect('[')
      thenBranch = { type: 'text', value: `[${this.readUntil(']')}]` }
      this.expect(']')
    }

    this.skipWhitespace()

    if (this.peek() === '[') {
      this.expect('[')
      elseBranch = { type: 'text', value: `[${this.readUntil(']')}]` }
      this.expect(']')
    } else {
      // if the next block is an /else, parse it as the elseBranch
      const checkpoint = this.pos

      this.skipWhitespace()
      elseBranch = this.parseElseBranch(checkpoint)
    }

    return { line: input, type: 'if', condition, invert, thenBranch, elseBranch }
  }

  private parseElseBranch(checkpoint: number): Block | undefined {
    if (this.input.startsWith('/else', this.pos)) {
      this.consumeLiteral('/else')
      this.skipWhitespace()

      return this.parseElseData()
    } else {
      this.pos = checkpoint
    }

    return undefined
  }

  private parseElseData() {
    let elseBranch: Block | undefined = undefined

    if (this.peek() === '[') {
      this.expect('[')
      elseBranch = { type: 'text', value: `[${this.readUntil(']')}]` }
      this.expect(']')
    } else if (!this.atEnd()) {
      elseBranch = { type: 'text', value: this.readUntilEOL() }
    }

    return elseBranch
  }

  /**
   * This handles the critSucess and critFailure branches for the if-block. Examples:
   * `/if [condition] cs:{crit-success-branch} s:{then-branch} f:{else-branch} cf:{crit-failure-branch}`
   * `/if [condition] cs:{crit-success-branch} {then-branch} {else-branch} cf:{crit-failure-branch}`
   * `/if [condition] cs:{crit-success-branch}`
   * `/if [condition] cs:{crit-success-branch} {then-branch}`
   * `/if [condition] cs:{crit-success-branch} s:{then-branch}`
   * `/if [condition] cs:{crit-success-branch} f:{else-branch}`
   * `/if [condition] cf:{crit-failure-branch}`
   * `/if [condition] cf:{crit-failure-branch} {then-branch}`
   * `/if [condition] cf:{crit-failure-branch} s:{then-branch}`
   * `/if [condition] cf:{crit-failure-branch} f:{else-branch}`
   * `/if [condition] cs:{crit-success-branch} {then-branch} {else-branch}`
   * `/if [condition] cs:{crit-success-branch} s:{then-branch} f:{else-branch}`
   * `/if [condition] cf:{crit-failure-branch} {then-branch} {else-branch}`
   *
   * Crit-success and crit-failure branches must always have prefixes (cs: and cf: respectively).
   * The then-branch and else-branch can be specified with or without prefixes (s: and f: respectively), and they will
   * be selected by position.
   * @returns
   */
  private parseCritBranches(condition: string, invert: boolean, input: string): IfNode {
    if (!this.isCritFormat()) {
      throw new ParseError(`Expected "cs:{", "cf:{", "s:{", or "f:{" to open the branches at ${this.pos}`)
    }

    let thenBranch: Block | undefined
    let elseBranch: Block | undefined
    let critSuccessBranch = undefined
    let critFailureBranch = undefined

    while (!this.atEnd()) {
      this.skipWhitespace()

      let branch: 'cs' | 'cf' | 's' | 'f' | undefined

      for (const prefix of ['cs', 'cf', 's', 'f'] as const) {
        if (this.matchesLookahead(`${prefix}:{`)) {
          branch = prefix
          this.consumeLiteral(`${prefix}:{`)
          break
        }
      }

      if (!branch && this.peek() === '{') {
        this.expect('{')
        const positionalBranch = this.parseBlock()

        this.expect('}')

        if (!thenBranch) thenBranch = positionalBranch
        else if (!elseBranch) elseBranch = positionalBranch
        else break

        continue
      }

      if (!branch) break

      const parsedBranch = this.parseBlock()

      this.expect('}')

      if (branch === 'cs') critSuccessBranch = parsedBranch
      else if (branch === 'cf') critFailureBranch = parsedBranch
      else if (branch === 's') thenBranch = parsedBranch
      else elseBranch = parsedBranch
    }

    return { line: input, type: 'if', condition, invert, thenBranch, elseBranch, critSuccessBranch, critFailureBranch }
  }

  private isCritFormat(): boolean {
    return this.matchesAllLookahead(['cs:{', 'cf:{', 's:{', 'f:{'])
  }

  private parseText(): TextNode {
    const start = this.pos

    while (
      !this.atEnd() &&
      this.peek() !== '{' &&
      this.peek() !== '}' &&
      // this.peek() !== '[' &&
      // this.peek() !== ']' &&
      !this.input.startsWith('/if', this.pos)
    ) {
      this.pos++
    }

    return { type: 'text', value: this.input.slice(start, this.pos) }
  }

  //---- low-level scanning helpers (no regex) ----

  private atEnd(): boolean {
    return this.pos >= this.input.length
  }

  private peek(): string | undefined {
    return this.input[this.pos]
  }

  private expect(ch: string): void {
    if (this.input[this.pos] !== ch) {
      throw new ParseError(`Expected "${ch}" at ${this.pos}, found "${this.input[this.pos] ?? 'EOF'}"`)
    }

    this.pos++
  }

  private readUntil(ch: string): string {
    const start = this.pos

    while (!this.atEnd() && this.input[this.pos] !== ch) this.pos++
    if (this.atEnd()) throw new ParseError(`Expected "${ch}" before end of input`)

    return this.input.slice(start, this.pos)
  }

  private readUntilEOL(): string {
    const start = this.pos

    while (!this.atEnd() && this.input[this.pos] !== '\n') this.pos++

    return this.input.slice(start, this.pos)
  }

  private consumeLiteral(literal: string): boolean {
    if (this.input.toLowerCase().startsWith(literal.toLowerCase(), this.pos)) {
      this.pos += literal.length

      return true
    }

    return false
  }

  private skipWhitespace(): void {
    while (!this.atEnd()) {
      const char = this.input[this.pos]

      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') this.pos++
      else break
    }
  }

  /** Non-consuming (lookahead) test for `word` at the current position. */
  private matchesLookahead(word: string): boolean {
    const pattern = new RegExp('^' + word + '\\b', 'i')

    return pattern.test(this.input.slice(this.pos))
  }

  private matchesAllLookahead(texts: string[]): boolean {
    for (const text of texts) {
      if (this.matchesLookahead(text)) return true
    }

    return false
  }
}

// ---------- Evaluator ----------

export type ConditionResolver = (condition: string, line: string) => Promise<boolean>

export async function evaluateBlock(block: Block, resolve: ConditionResolver): Promise<string> {
  if (!block) return ''

  switch (block.type) {
    case 'text':
      return block.value

    case 'if': {
      const temp = await resolve(block.condition, block.line)
      const pass = block.invert ? !temp : temp
      const branch = pass
        ? GURPS.lastTargetedRoll?.isCritSuccess && block.critSuccessBranch
          ? block.critSuccessBranch
          : block.thenBranch
        : GURPS.lastTargetedRoll?.isCritFailure && block.critFailureBranch
          ? block.critFailureBranch
          : block.elseBranch

      return branch ? await evaluateBlock(branch, resolve) : ''
    }
  }
}
