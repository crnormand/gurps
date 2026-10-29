import { MessageMode } from '@module/util/foundry-utils.js'

describe('MessageMode', () => {
  test.each(['invalid', 'toString', '__proto__'])('rejects unregistered mode %s', value => {
    expect(() => new MessageMode(value as ChatMessage.Mode)).toThrow(`Invalid Message Mode: ${value}`)
  })
})
