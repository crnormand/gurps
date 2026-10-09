import { ChatTextChatProcessor } from '@module/chat/chat-text.js'

// @ts-expect-error: Ignore TypeScript error for global ChatMessage mock
global.ChatMessage = {
  create: vi.fn(),
}

describe('ChatTextProcessor', () => {
  it('should be defined', () => {
    const processor = new ChatTextChatProcessor()

    expect(processor).toBeDefined()
  })

  it('should return help text', () => {
    const processor = new ChatTextChatProcessor()

    expect(processor.help()).toEqual('/chat <text-to-display>')
  })

  it('should match lines correctly', () => {
    const processor = new ChatTextChatProcessor()

    expect(processor.matches('/chat Hello')).toBeTruthy()
  })

  it('should not match lines incorrectly', () => {
    const processor = new ChatTextChatProcessor()

    expect(processor.matches('/notchat Hello')).toBeFalsy()
  })

  it('should match lines with leading spaces correctly', () => {
    const processor = new ChatTextChatProcessor()

    expect(processor.matches('   /chat Hello')).toBeTruthy()
  })

  it('should process chat text correctly', async () => {
    const processor = new ChatTextChatProcessor()

    // Call the process method
    const result = await processor.process('/chat Hello')

    // expect ChatMessage.create to be called with the correct arguments
    expect(ChatMessage.create).toHaveBeenCalledWith({ content: 'Hello' })

    expect(result).toEqual('Hello')
  })
})
