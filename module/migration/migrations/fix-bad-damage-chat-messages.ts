export async function fixBadDamageChatMessages() {
  const chatMessages = game.messages?.contents.filter(message =>
    message.content.includes('<div class="damage-chat-message">')
  )
  if (!chatMessages || chatMessages.length === 0) return

  for (const message of chatMessages) {
    if (!message.flags?.gurps?.transfer) {
      // @ts-expect-error Legacy flag structure
      const transfer: string = message.flags.transfer
      await message.setFlag('gurps', 'transfer', JSON.parse(transfer))
    }
  }
}
