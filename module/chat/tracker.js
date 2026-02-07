import { zeroFill } from '../../lib/utilities.js'

import ChatProcessor from './chat-processor.js'

export default class TrackerChatProcessor extends ChatProcessor {
  help() {
    return '/tr&lt;N&gt; (or /tr (&lt;name&gt;)) &lt;formula&gt;'
  }

  matches(line) {
    this.match = line.match(/^\/(tracker|tr|rt|resource)([0123])?( *\(([^)]+)\))? +([+-=] *\d+)?(reset)?(.*)/i)

    return !!this.match
  }

  usagematches(line) {
    return line.match(/^[/?](tracker|tr|rt|resource)([0123])?( *\(([^)]+)\))?$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpTracker')
  }

  async process(line) {
    let match = this.match
    let actor = GURPS.LastActor

    if (!actor) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

      return false
    }

    let tracker = parseInt(match[2])
    let display = tracker

    // find tracker
    if (match[3]) {
      let pattern = '^' + match[3].trim().replace(/\(\)/, '')

      tracker = -1

      for (const [key, value] of Object.entries(actor.system.additionalresources.tracker)) {
        if (value.name.match(pattern)) {
          tracker = key
          display = '(' + value.name + ')'
        }
      }

      if (tracker == -1) {
        ui.notifications.warn(
          `${game.i18n.localize('GURPS.chatNoResourceTracker', 'No Resource Tracker matched')} '${match[3]}'`
        )

        return false
      }
    }

    let theTrackerKey = zeroFill(tracker, 4)
    let theTracker = actor.system.additionalresources.tracker[theTrackerKey]

    if (!theTracker) {
      ui.notifications.warn(
        `${game.i18n.localize('GURPS.chatNoResourceTracker', 'No Resource Tracker matched')} 'tr${match[2]}'`
      )

      return false
    }

    if (match[6]) {
      // reset -- Damage Tracker's reset to zero
      let value = theTracker.isDamageTracker ? parseInt(theTracker.min) : parseInt(theTracker.max)

      //if (!!theTracker.isDamageTracker) max = 0
      await actor.update({ ['system.additionalresources.tracker.' + theTrackerKey + '.value']: value })
      this.prnt(
        `${game.i18n.localize('GURPS.chatResourceTracker', 'Resource Tracker')}${display} ${game.i18n.localize(
          'GURPS.chatResetTo',
          'reset to'
        )} ${value}`
      )

      return true
    }

    if (!match[5]) {
      ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)

      return false
    }

    let delta = parseInt(match[5].replace(/ /g, ''))

    if (isNaN(delta)) {
      // only happens with '='
      let value = parseInt(match[5].substr(1).replace(/ /g, ''))

      if (isNaN(value)) {
        ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)

        return false
      } else {
        value = theTracker.isMaximumEnforced && value > parseInt(theTracker.max) ? parseInt(theTracker.max) : value
        value = theTracker.isMinimumEnforced && value < parseInt(theTracker.min) ? parseInt(theTracker.min) : value
        await actor.update({ ['system.additionalresources.tracker.' + theTrackerKey + '.value']: value })
        this.prnt(`${game.i18n.localize('GURPS.chatResourceTracker')}${display} set to ${value}`)

        return true
      }
    } else {
      let max = theTracker.max == 0 ? Number.MAX_SAFE_INTEGER : theTracker.max
      let min = theTracker.min
      let value = parseInt(theTracker.value) + delta

      if (value > max) {
        ui.notifications.warn(
          `${game.i18n.localize('GURPS.chatExceededMax', 'Exceeded MAX')}:${max} ${game.i18n.localize('GURPS.for')} ${game.i18n.localize(
            'GURPS.chatResourceTracker'
          )}${display}`
        )
        if (theTracker.isMaximumEnforced) return false
      }

      if (value < min) {
        ui.notifications.warn(
          `${game.i18n.localize('GURPS.chatResultBelowZero', 'Result below zero')}: ${game.i18n.localize('GURPS.chatResourceTracker')}${display}`
        )
        if (theTracker.isMinimumEnforced) return false
      }

      await actor.update({ ['system.additionalresources.tracker.' + theTrackerKey + '.value']: value })
      this.prnt(`${game.i18n.localize('GURPS.chatResourceTracker')}${display} ${match[5]} = ${value}`)

      return true
    }
  }
}
