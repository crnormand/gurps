import ChatProcessor from './chat-processor.js'
import { i18n } from '../../lib/utilities.js'

export default class TrackerChatProcessor extends ChatProcessor {
  help() {
    return '/tr&lt;N&gt; (or /tr (&lt;name&gt;)) &lt;formula&gt;'
  }

  matches(line) {
    this.match = line.match(/^\/(tracker|tr|rt|resource)([0123])?( *\(([^\)]+)\))? *([+-=]\d+)?(reset)?(.*)/i)
    return !!this.match
  }

  async process(line) {
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor) {
      ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
      return false
    }

    let tracker = parseInt(m[2])
    let display = tracker

    // find tracker
    if (!!m[3]) {
      let pattern = '^' + m[3].trim()
      tracker = -1
      for (const [key, value] of Object.entries(actor.data.data.additionalresources.tracker)) {
        if (value.name.match(pattern)) {
          tracker = key
          display = '(' + value.name + ')'
        }
      }
      if (tracker == -1) {
        ui.notifications.warn(`${i18n('GURPS.chatNoResourceTracker', 'No Resource Tracker matched')} '${m[3]}'`)
        return false
      }
    }

    let theTracker = actor.data.data.additionalresources.tracker[tracker]
    if (!!m[6]) {
      // reset -- Damage Tracker's reset to zero
      let value = !!theTracker.isDamageTracker ? theTracker.min : theTracker.max
      //if (!!theTracker.isDamageTracker) max = 0
      await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
      this.prnt(
        `${i18n('GURPS.chatResourceTracker', 'Resource Tracker')}${display} ${i18n(
          'GURPS.chatResetTo',
          'reset to'
        )} ${value}`
      )
      return true
    }

    if (!m[5]) {
      ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
      return false
    }

    let delta = parseInt(m[5])
    if (isNaN(delta)) {
      // only happens with '='
      let value = parseInt(m[5].substr(1))
      if (isNaN(value)) {
        ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
        return false
      } else {
        value = theTracker.isMaximumEnforced && value > theTracker.max ? theTracker.max : value
        value = theTracker.isMinimumEnforced && value < theTracker.min ? theTracker.min : value
        await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
        this.prnt(`${i18n('GURPS.chatResourceTracker')}${display} set to ${value}`)
        return true
      }
    } else if (!!m[5]) {
      let max = theTracker.max == 0 ? Number.MAX_SAFE_INTEGER : theTracker.max
      let min = theTracker.min
      let value = theTracker.value + delta

      if (value > max) {
        ui.notifications.warn(
          `${i18n('GURPS.chatExceededMax', 'Exceeded MAX')}:${max} ${i18n('GURPS.for')} ${i18n(
            'GURPS.chatResourceTracker'
          )}${display}`
        )
        if (theTracker.isMaximumEnforced) return false
      }
      if (value < min) {
        ui.notifications.warn(
          `${i18n('GURPS.chatResultBelowZero', 'Result below zero')}: ${i18n('GURPS.chatResourceTracker')}${display}`
        )
        if (theTracker.isMinimumEnforced) return false
      }
      await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
      this.prnt(`${i18n('GURPS.chatResourceTracker')}${display} ${m[5]} = ${value}`)
      return true
    } else {
      ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
      return false
    }    
  }
}
