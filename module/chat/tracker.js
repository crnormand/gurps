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
    let answer = false
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor) {
      ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
      return
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
        return
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
      return
    }

    let delta = parseInt(m[5])
    if (isNaN(delta)) {
      // only happens with '='
      let value = parseInt(m[5].substr(1))
      if (isNaN(value))
        ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
      else {
        value = this.getRestrictedValue(theTracker, value)

        await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
        this.prnt(`${i18n('GURPS.chatResourceTracker')}${display} set to ${value}`)
        answer = true
      }
    } else if (!!m[5]) {
      let max = theTracker.max == 0 ? Number.MAX_SAFE_INTEGER : theTracker.max
      let value = this.getRestrictedValue(theTracker, theTracker.value + delta)

      if (value > max) {
        // This only happens if the value exceeds max, but Maximum is NOT enforced for this tracker.
        // Allow it, but give the user a warning.
        ui.notifications.warn(
          `${i18n('GURPS.chatExceededMax', 'Exceeded MAX')}:${max} ${i18n('GURPS.for')} ${i18n(
            'GURPS.chatResourceTracker'
          )}${display}`
        )
        // Allow it: value = max
      }
      if (!!theTracker.isDamageTracker && value < 0) {
        // This only happens if the value is under min, but Minimum is NOT enforced for this tracker.
        // Allow it, but give the user a warning.
        ui.notifications.warn(
          `${i18n('GURPS.chatResultBelowZero', 'Result below zero')}: ${i18n('GURPS.chatResourceTracker')}${display}`
        )
        // Allow it: value = 0
      }
      await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
      this.prnt(`${i18n('GURPS.chatResourceTracker')}${display} ${m[5]} = ${value}`)
      answer = value >= 0
    } else ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)

    return answer
  }

  getRestrictedValue(theTracker, value) {
    value = theTracker.isMaximumEnforced && value > theTracker.max ? theTracker.max : value
    value = theTracker.isMinimumEnforced && value < theTracker.min ? theTracker.min : value
    return value
  }
}
