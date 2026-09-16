// ---------- AST ----------

type Block = IfNode | GroupNode | TextNode

interface IfNode {
  type: 'if'
  condition: string
  invert: boolean
  thenBranch: Block[]
  elseBranch?: Block[]
  line: string
}

interface GroupNode {
  type: 'group'
  children: Block[]
}

interface TextNode {
  type: 'text'
  value: string
}

class ParseError extends Error {}

// ---------- Parser ----------

export class IfBlockParser {
  private pos = 0

  private constructor(private readonly input: string) {}

  static parse(input: string): Block[] {
    const parser = new IfBlockParser(input)
    const blocks = parser.parseBlocks()

    parser.skipWhitespace()

    if (!parser.atEnd()) {
      throw new ParseError(`Unexpected trailing input at ${parser.pos}: "${parser.input.slice(parser.pos)}"`)
    }

    return blocks
  }

  // Sibling blocks, until EOF or a '}' owned by an enclosing group.
  private parseBlocks(): Block[] {
    const blocks: Block[] = []

    for (;;) {
      this.skipWhitespace()

      if (this.atEnd() || this.peek() === '}') break
      blocks.push(this.parseBlock())
    }

    return blocks
  }

  private parseBlock(): Block {
    if (this.consumeLiteral('/if')) return this.parseIf()

    if (this.peek() === '{') return this.parseGroup()

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

    if (this.peek() !== '{') {
      throw new ParseError(`Expected "{" to open the then-branch at ${this.pos}`)
    }

    const thenBranch = this.parseGroup().children

    // An /if consumes at most ONE more adjacent brace group as its else-branch.
    // Anything after that is a sibling block, not part of this /if.

    let elseBranch: Block[] | undefined
    const checkpoint = this.pos

    this.skipWhitespace()

    if (this.peek() === '{') {
      elseBranch = this.parseGroup().children
    } else {
      this.pos = checkpoint // don't swallow whitespace that belongs to the parent
    }

    return { line: input, type: 'if', condition, invert, thenBranch, elseBranch }
  }

  private parseGroup(): GroupNode {
    this.expect('{')
    const children = this.parseBlocks()

    this.expect('}')

    return { type: 'group', children }
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

export async function evaluateBlocks(blocks: Block[], resolve: ConditionResolver): Promise<string> {
  return (await Promise.all(blocks.map(async block => await evaluateBlock(block, resolve)))).join('')
}

async function evaluateBlock(block: Block, resolve: ConditionResolver): Promise<string> {
  switch (block.type) {
    case 'text':
      return block.value

    case 'group':
      return await evaluateBlocks(block.children, resolve)

    case 'if': {
      const temp = await resolve(block.condition, block.line)
      const pass = block.invert ? !temp : temp
      const branch = pass ? block.thenBranch : block.elseBranch

      return branch ? await evaluateBlocks(branch, resolve) : ''
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
