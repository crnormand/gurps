import { parselink } from '@module/otf/parselink.js'
import { OtfActionType } from '@module/otf/types.js'

import ChatProcessor from './chat-processor.js'
import { IfParser } from './dsl-parser/if-parser.js'
import { ParseError } from './dsl-parser/parser-helpers.ts'

class RollCancelError extends Error {}

export class IfChatProcessor extends ChatProcessor {
  override help(): string {
    return '/if [OtF] [thenOTF] /else [elseOTF]<br>/if [OtF] {thenChatCmd} {elseChatCmd}'
  }

  override matches(line: string): boolean {
    const match = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/)

    return !!match
  }

  override async process(line: string) {
    try {
      const block = IfParser.parse(line)
      const result = await IfParser.visit(block, this.resolveCondition.bind(this))

      await this.handleResult(result)
      // Catch RollCancelError separately to avoid showing an error notification.
    } catch (error) {
      if (error instanceof RollCancelError) {
        console.log('Roll canceled:', error)
      } else if (error instanceof ParseError) {
        console.error('Parser error processing if block:', error)
        ui.notifications?.warn(`${game.i18n?.localize('GURPS.chatUnrecognizedFormat')} '${line}'`)
      } else {
        console.error('Error processing if block:', error)
        ui.notifications?.warn('Unknown error processing if block: ' + line)
      }
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
      throw new Error(`${game.i18n?.localize('GURPS.chatUnrecognizedFormat')}: [${condition}]`)
    }

    if (this.isOtfAction(action)) {
      return !!(await this.performOtfAction(action.action, line))
    }

    this.priv(`${game.i18n?.localize('GURPS.chatMustBeACheck')}: [${condition}]`)
    throw new Error(`${game.i18n?.localize('GURPS.chatMustBeACheck')}: [${condition}]`)
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
      throw new RollCancelError('Stop actions after dialog canceled')
    }

    return pass
  }
}
