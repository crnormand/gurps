import { GurpsModule } from 'module/gurps-module.js'
import { GurpsChatMessage } from './gurps-chat-message.js'

function init() {
  console.log('GURPS | Initializing GURPS Chat Message module.')
  Hooks.on('init', () => {
    CONFIG.ChatMessage.documentClass = GurpsChatMessage
  })
}

export const ChatMessage: GurpsModule = {
  init,
}
