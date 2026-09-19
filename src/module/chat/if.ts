import { parselink } from '@module/otf/parselink.js'
import { OtfActionType } from '@module/otf/types.js'

import ChatProcessor from './chat-processor.js'
import { IfParser } from './dsl-parser/if-parser.ts'

export class IfChatProcessor extends ChatProcessor {
  override help(): string {
    return '/if [OtF] [thenOTF] /else [elseOTF]<br>/if [OtF] {thenChatCmd} {elseChatCmd}'
  }

  override matches(line: string): boolean {
    const match = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/)

    return !!match
  }

  override async process(line: string) {
    const block = IfParser.parse(line)

    try {
      const result = await IfParser.visit(block, this.resolveCondition.bind(this))

      await this.handleResult(result)
    } catch (error) {
      console.error('Error processing if block:', error)
    }
  }

  private async handleResult(then: string) {
    const match = then.match(/^\[([^\]]+)\]/)

    if (match) {
      const action = parselink(match[1].trim())

      if (action.action) {
        if (action.action.type === OtfActionType.modifier) {
          // only need to show modifiers, everything else does something.
          this.priv(then)
        } else {
          this.send() // send what we have
        }

        await GURPS.modules.Otf.performAction(action.action, GURPS.LastActor, this.msgs().event)
      }
    } else {
      await this.registry.processLines(then)
    }
  }

  /**
   * If called for an IfBlock, return true or false to select which child block to execute.
   * @param {*} condition
   * @returns
   */
  private async resolveCondition(condition: string, line: string): Promise<boolean> {
    // Try to parse the condition as an OTF action.
    const action = parselink(condition)

    if (!action.action) {
      this.priv(`${game.i18n?.localize('GURPS.chatUnrecognizedFormat')}: [${condition}]`)

      return false
    }

    if (this.isOtfAction(action)) {
      return !!(await this.performOtfAction(action.action, line))
    } else {
      this.priv(`${game.i18n?.localize('GURPS.chatMustBeACheck')}: [${condition}]`)
    }

    return false // or true based on the condition
  }

  private isOtfAction(action: any) {
    return (
      action &&
      action.action &&
      [
        OtfActionType.skillSpell,
        OtfActionType.attribute,
        OtfActionType.attack,
        OtfActionType.controlRoll,
        OtfActionType.chat,
        OtfActionType.testExists,
        OtfActionType.ifTest,
      ].includes(action.action.type)
    )
  }

  private async performOtfAction(action: any, line: string) {
    this.priv(line)
    this.send()
    const event = this.msgs().event

    event.chatmsgData = this.msgs().data
    const pass = await GURPS.modules.Otf.performAction(action, GURPS.LastActor, event)

    if (GURPS.stopActions) {
      GURPS.stopActions = false
      throw new Error('Stop actions after dialog canceled')
    }

    return pass
  }
}
