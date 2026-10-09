import ChatProcessor from './chat-processor.js'

const COMMAND = '/chat '
const REGEX = new RegExp(`^${COMMAND}(.*)$`)

// TODO Expand this to allow the user to select players, style text, etc.
export class ChatTextChatProcessor extends ChatProcessor {
  override help() {
    return `${COMMAND}<text-to-display>`
  }

  override matches(line: string) {
    return REGEX.test(line.trim())
  }

  override async process(line: string) {
    // Remove COMMAND from start of line
    line = line.trim()
    const result = line.replace(REGEX, '$1')

    await ChatMessage.create({ content: result })

    return result
  }
}
