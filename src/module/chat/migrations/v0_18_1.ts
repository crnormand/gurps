import { getGame } from '@module/util/guards.js'

const MIGRATION_VERSION = '0.18.1'

/* ---------------------------------------- */

async function migrateBadDamageChatMessages() {
  const chatMessages = getGame().messages.contents.filter(message =>
    message.content.includes('<div class="damage-chat-message">')
  )

  for (const message of chatMessages) {
    if (!message.flags?.gurps?.transfer) {
      const transfer = (message.flags as any).transfer

      await message.update({ 'flags.gurps.transfer': JSON.parse(transfer) } as ChatMessage.UpdateData)
    }
  }
}

/* ---------------------------------------- */

async function migrate(): Promise<void> {
  await migrateBadDamageChatMessages()
}

/* ---------------------------------------- */

export const v0_18_1 = { version: MIGRATION_VERSION, migrate }
