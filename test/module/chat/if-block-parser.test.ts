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

    describe('critical branch format', () => {
      test.each([
        [
          'all prefixed branches',
          '/if [DX] cs:{crit-success} s:{success} f:{failure} cf:{crit-failure}',
          {
            critSuccessBranch: 'crit-success',
            thenBranch: 'success',
            elseBranch: 'failure',
            critFailureBranch: 'crit-failure',
          },
        ],
        [
          'critical branches with positional success and failure branches',
          '/if [DX] cs:{crit-success} {success} {failure} cf:{crit-failure}',
          {
            critSuccessBranch: 'crit-success',
            thenBranch: 'success',
            elseBranch: 'failure',
            critFailureBranch: 'crit-failure',
          },
        ],
        ['critical success branch only', '/if [DX] cs:{crit-success}', { critSuccessBranch: 'crit-success' }],
        [
          'critical success followed by positional success branch',
          '/if [DX] cs:{crit-success} {success}',
          { critSuccessBranch: 'crit-success', thenBranch: 'success' },
        ],
        [
          'critical success followed by prefixed success branch',
          '/if [DX] cs:{crit-success} s:{success}',
          { critSuccessBranch: 'crit-success', thenBranch: 'success' },
        ],
        [
          'critical success followed by prefixed failure branch',
          '/if [DX] cs:{crit-success} f:{failure}',
          { critSuccessBranch: 'crit-success', elseBranch: 'failure' },
        ],
        ['critical failure branch only', '/if [DX] cf:{crit-failure}', { critFailureBranch: 'crit-failure' }],
        [
          'critical failure followed by positional success branch',
          '/if [DX] cf:{crit-failure} {success}',
          { critFailureBranch: 'crit-failure', thenBranch: 'success' },
        ],
        [
          'critical failure followed by prefixed success branch',
          '/if [DX] cf:{crit-failure} s:{success}',
          { critFailureBranch: 'crit-failure', thenBranch: 'success' },
        ],
        [
          'critical failure followed by prefixed failure branch',
          '/if [DX] cf:{crit-failure} f:{failure}',
          { critFailureBranch: 'crit-failure', elseBranch: 'failure' },
        ],
        [
          'critical success with positional success and failure branches',
          '/if [DX] cs:{crit-success} {success} {failure}',
          { critSuccessBranch: 'crit-success', thenBranch: 'success', elseBranch: 'failure' },
        ],
        [
          'critical success with prefixed success and failure branches',
          '/if [DX] cs:{crit-success} s:{success} f:{failure}',
          { critSuccessBranch: 'crit-success', thenBranch: 'success', elseBranch: 'failure' },
        ],
        [
          'critical failure with positional success and failure branches',
          '/if [DX] cf:{crit-failure} {success} {failure}',
          { critFailureBranch: 'crit-failure', thenBranch: 'success', elseBranch: 'failure' },
        ],
      ])('%s', (_description, input, expected) => {
        const block = IfBlockParser.parse(input)

        expect(block.condition).toBe('DX')
        expect(block.invert).toBe(false)

        const ifBlock = block as IfNode
        const expectedBranches = expected as Record<string, string>

        for (const [branch, value] of Object.entries(expectedBranches)) {
          expect(ifBlock[branch as keyof IfNode]).toEqual({ type: 'text', value })
        }

        for (const branch of ['thenBranch', 'elseBranch', 'critSuccessBranch', 'critFailureBranch']) {
          if (!(branch in expectedBranches)) expect(ifBlock[branch as keyof IfNode]).toBeUndefined()
        }
      })
    })
  })
})
