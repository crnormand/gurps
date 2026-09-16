import { evaluateBlocks, IfBlockParser } from '@module/chat/if-block-parser.js'

describe('IfBlockParser', () => {
  test('recognizes an inverted condition after /if', async () => {
    const blocks = IfBlockParser.parse('/if ! [DX] {success} {failure}')

    await expect(evaluateBlocks(blocks, () => true)).resolves.toBe('failure')
  })
})
