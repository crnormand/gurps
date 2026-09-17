// ---------- AST ----------

export type Block = IfNode | TextNode | undefined

export interface IfNode {
  type: 'if'
  condition: string
  invert: boolean
  thenBranch: Block | undefined
  elseBranch?: Block | undefined
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

    // if (this.peek() === '{') return this.parseGroup()

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
    } else {
      return this.parseIfChatTextFormat(condition, invert, input)
    }
  }

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

  private parseIfCurlyBracesFormat(condition: string, invert: boolean, input: string): IfNode {
    if (this.peek() !== '{') {
      throw new ParseError(`Expected "{" to open the then-branch at ${this.pos}`)
    }

    this.expect('{')
    const thenBranch = this.parseBlock()

    this.expect('}')

    // const thenBranch = this.parseGroup().children

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

  private parseText(): TextNode {
    const start = this.pos

    while (!this.atEnd() && this.peek() !== '{' && this.peek() !== '}' && !this.input.startsWith('/if', this.pos)) {
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
    if (this.input.startsWith(literal, this.pos)) {
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
      const branch = pass ? block.thenBranch : block.elseBranch

      return branch ? await evaluateBlock(branch, resolve) : ''
    }
  }
}

// ---------- Public entry point (drop-in for IfChatProcessor.process) ----------

// class IfChatProcessor {

//   static process(input: string, resolveCondition: ConditionResolver): string {
//     const blocks = IfBlockParser.parse(input)

//     return evaluateBlocks(blocks, resolveCondition)
//   }
// }
