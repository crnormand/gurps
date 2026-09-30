import { jest } from '@jest/globals'
import { ChatTextProcessor } from '../module/chat/chat-text.js'

global.ChatMessage = {
  // @ts-expect-error: Ignore TypeScript error for global ChatMessage mock
  create: jest.fn(),
}

describe('ChatTextProcessor', () => {
  it('should be defined', () => {
    const processor = new ChatTextProcessor()
    expect(processor).toBeDefined()
  })

  it('should return help text', () => {
    const processor = new ChatTextProcessor()
    expect(processor.help()).toEqual('/chat [text-to-display]')
  })

  it('should match lines correctly', () => {
    const processor = new ChatTextProcessor()
    expect(processor.matches('/chat Hello')).toBeTruthy()
  })

  it('should not match lines incorrectly', () => {
    const processor = new ChatTextProcessor()
    expect(processor.matches('/notchat Hello')).toBeFalsy()
  })

  it('should match lines with leading spaces correctly', () => {
    const processor = new ChatTextProcessor()
    expect(processor.matches('   /chat Hello')).toBeTruthy()
  })

  it('should process chat text correctly', () => {
    const processor = new ChatTextProcessor()

    // Call the process method
    const result = processor.process('/chat Hello')

    // expect ChatMessage.create to be called with the correct arguments
    expect(ChatMessage.create).toHaveBeenCalledWith({ content: 'Hello' })

    expect(result).resolves.toEqual('Hello')
  })
})
