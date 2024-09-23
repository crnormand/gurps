import { makeRegexPatternFrom } from '../../lib/utilities.js'
import ChatProcessor from './chat-processor.js'
import * as Settings from '../../lib/miscellaneous-settings.js'

export class ActiveEffectChatProcessor extends ChatProcessor {
  help() {
    return '/activeeffect (or /ae)'
  }
  isGMOnly() {
    return true
  }

  matches(line) {
    this.match = line.match(/^\/(ae|activeeffect)/)
    return !!this.match
  }

  async process(line) {
    if (!GURPS.LastActor) {
      ui.notifications.error('Please select a token/character.')
      return
    }
    
    let actor = GURPS.LastActor
    let tblname = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_FRIGHT_CHECK_TABLE) || 'Fright Check'

    // TODO reskin frightcheck UI
    renderTemplate('systems/gurps/templates/frightcheck-macro.html', { tblname: tblname }).then(dialogTemplate =>
      new Dialog(
        {
          title: 'Fright Check',
          content: dialogTemplate,
          buttons: {
            rollFrightCheck: {
              label: 'Roll Fright Check',
              callback: this.rollFrightCheckCallback.bind(this, actor),
            },
            close: {
              label: 'Close',
            },
          },
        },
        { width: 650 }
      ).render(true)
    )
  }
}