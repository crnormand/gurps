import { IfBlockParser, IfNode } from '@module/chat/if-block-parser.js'

describe('IfBlockParser', () => {
  describe('simple format (/if [OTF1] [OTF2])', () => {
    test('returns thenBranch of [OTF2]', async () => {
      const block = IfBlockParser.parse('/if [DX] [success]')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: '[success]' })
      expect(ifBlock.elseBranch).toBeUndefined()
      expect(ifBlock.invert).toBe(false)
    })
  })

  describe('chat command format (/if [condition] /chat-command)', () => {
    test('parses a chat command as the thenBranch', async () => {
      const block = IfBlockParser.parse('/if [DX] /roll 1d20')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: '/roll 1d20' })
      expect(ifBlock.elseBranch).toBeUndefined()
      expect(ifBlock.invert).toBe(false)
    })

    test('parses a chat command as the elseBranch', async () => {
      const block = IfBlockParser.parse('/if [DX] /roll 1d20 /else /help')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: '/roll 1d20' })
      expect(ifBlock.elseBranch).toEqual({ type: 'text', value: '/help' })
      expect(ifBlock.invert).toBe(false)
    })
  })

  describe('chat text format (/if [condition] Any text here)', () => {
    test('parses chat text as the thenBranch', async () => {
      const block = IfBlockParser.parse('/if [DX] Any text here')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: 'Any text here' })
      expect(ifBlock.elseBranch).toBeUndefined()
      expect(ifBlock.invert).toBe(false)
    })
  })

  describe('/else format (/if [condition] [OTF1] /else [OTF2])', () => {
    test('parses then and else branches correctly', async () => {
      const block = IfBlockParser.parse('/if [DX] [success] /else [failure]')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: '[success]' })
      expect(ifBlock.elseBranch).toEqual({ type: 'text', value: '[failure]' })
      expect(ifBlock.invert).toBe(false)
    })
  })

  describe('curly-brace format', () => {
    test('builds an if block with then branch', async () => {
      const block = IfBlockParser.parse('/if [DX] {success}')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: 'success' })
      expect(ifBlock.elseBranch).toBeUndefined()
      expect(ifBlock.invert).toBe(false)
    })

    test('builds an if block with then and else branches', async () => {
      const block = IfBlockParser.parse('/if [DX] {success} {failure}')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: 'success' })
      expect(ifBlock.elseBranch).toEqual({ type: 'text', value: 'failure' })
      expect(ifBlock.invert).toBe(false)
    })

    test('builds an inverted if block with then and else branches', async () => {
      const block = IfBlockParser.parse('/if ! [DX] {success} {failure}')

      expect(block).toBeDefined()
      expect(block.type).toBe('if')
      const ifBlock = block as IfNode

      expect(ifBlock.condition).toBe('DX')
      expect(ifBlock.thenBranch).toEqual({ type: 'text', value: 'success' })
      expect(ifBlock.elseBranch).toEqual({ type: 'text', value: 'failure' })
      expect(ifBlock.invert).toBe(true)
    })
  })
})
