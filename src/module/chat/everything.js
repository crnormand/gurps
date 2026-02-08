'use strict'

import { parselink } from '@util/parselink.js'
import { isNiceDiceEnabled, splitArgs } from '@util/utilities.js'

import ChatProcessor from './chat-processor.js'

export class EveryoneAChatProcessor extends ChatProcessor {
  help() {
    return '/everyone (or /ev) &lt;formula&gt;'
  }
  isGMOnly() {
    return true
  }

  matches(line) {
    this.match = line.match(/^\/(everyone|ev) ([fh]p) reset/i)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?](everyone|ev)$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpEveryone')
  }

  async process() {
    let match = this.match
    let any = false

    for (const token of canvas.tokens.ownedTokens) {
      let actor = token.actor

      if (actor.hasPlayerOwner) {
        any = true
        let attr = match[2].toUpperCase()
        let max = actor.system[attr].max

        await actor.update({ ['system.' + attr + '.value']: max })
        this.priv(`${actor.displayname} ${attr} reset to ${max}`)
      }
    }

    if (!any) this.priv(`There are no player owned characters!`)
  }
}

export class EveryoneBChatProcessor extends ChatProcessor {
  help() {
    return null
  } // Don't display a help line for this processor.  Useful if you have multiple processors for essentially the same command
  isGMOnly() {
    return true
  }

  matches(line) {
    this.match = line.match(/^\/(everyone|ev) \[(.*)\]/i)

    return !!this.match
  }

  async process() {
    let match = this.match
    let any = false
    let action = parselink(match[2].trim())

    if (action.action) {
      if (!['modifier', 'chat', 'pdf'].includes(action.action.type)) {
        for (const token of canvas.tokens.ownedTokens) {
          let actor = token.actor

          if (actor.hasPlayerOwner) {
            any = true
            let event = { data: {} }

            event.blind = this.msgs().quiet
            await GURPS.performAction(action.action, actor, event)
          }
        }

        if (!any) this.priv(`There are no player owned characters!`)
      } else this.priv(`Not allowed to execute Modifier, Chat or PDF links [${match[2].trim()}]`)
    } else this.priv(`Unable to parse On-the-Fly formula: [${match[2].trim()}]`)
  }
}

export class EveryoneCChatProcessor extends ChatProcessor {
  help() {
    return null
  } // Don't display a help line for this processor.  Useful if you have multiple processors for essentially the same command
  isGMOnly() {
    return true
  }

  matches(line) {
    // /everyone +1 fp or /everyone -2d-1 fp
    this.match = line.match(/^\/(everyone|ev) ([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?/i)

    return !!this.match
  }

  async process(line) {
    let match = this.match

    if (!!match[3] || !!match[4]) {
      let any = false

      for (const token of canvas.tokens.ownedTokens) {
        let actor = token.actor

        if (actor.hasPlayerOwner) {
          any = true
          let mod = match[4] || ''
          let value = mod
          let dice = match[3] || ''
          let txt = ''
          let attr = match[2].toUpperCase()

          if (dice) {
            let sign = dice[0] == '-' ? -1 : 1
            let die = dice.match(/[+-](\d+)d(\d*)/)
            let rollFormula = die[1] + 'd' + (die[2] ? die[2] : '6') + `[/ev ${attr}]`
            let roll = Roll.create(rollFormula)

            await roll.evaluate()

            if (isNiceDiceEnabled()) {
              let throws = []
              let dc = []

              roll.dice.forEach(die => {
                let type = 'd' + die.faces

                die.results.forEach(result =>
                  dc.push({
                    result: result.result,
                    resultLabel: result.result,
                    type: type,
                    vectors: [],
                    options: {},
                  })
                )
              })
              throws.push({ dice: dc })

              if (dc.length > 0) {
                // The user made a "multi-damage" roll... let them see the dice!
                // @ts-expect-error - dice3d is added by Dice So Nice module and not in core types
                game.dice3d.show({ throws: throws })
              }
            }

            value = roll.total
            if (mod)
              if (isNaN(mod)) {
                ui.notifications.warn(`Unrecognized format for '${line}'`)

                return
              } else value += parseInt(mod)
            value = Math.max(value, match[5] ? 1 : 0)
            value *= sign
            txt = `(${value}) `
          }

          let cur = actor.system[attr].value
          let newval = parseInt(value)

          if (isNaN(newval)) {
            // only happens on =10
            newval = parseInt(value.substr(1))

            if (isNaN(newval)) {
              ui.notifications.warn(`Unrecognized format for '${line}'`)

              return
            }
          } else newval += cur
          let mtxt = ''
          let max = actor.system[attr].max

          if (newval > max) {
            newval = max
            mtxt = `(max: ${max})`
          }

          await actor.update({ ['system.' + attr + '.value']: newval })
          this.priv(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`)
        }
      }

      if (!any) this.priv(`There are no player owned characters!`)
    } // Didn't provide dice or scalar, so maybe someone else wants to handle it
    else ui.notifications.warn(`There was no dice or number formula to apply '${line}'`)
  }
}

export class RemoteChatProcessor extends ChatProcessor {
  help() {
    return '/remote [OtF] &lt;user list&gt;'
  }
  isGMOnly() {
    return true
  }

  matches(line) {
    this.match = line.match(/^\/(remote|rem) \[(.*)\](.*)/i)

    return !!this.match
  }

  usagematches(line) {
    return line.match(/^[/?](remote|rem)$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpRemote')
  }

  async process(line) {
    let match = this.match
    let action = parselink(match[2].trim())

    if (action.action) {
      let users = match[3] ? splitArgs(match[3]) : [] // empty array means everyone

      this.priv(line)
      game.socket.emit('system.gurps', {
        type: 'executeOtF',
        action: action.action,
        users: users,
      })
    } else this.priv(`Unable to parse On-the-Fly formula: [${match[2].trim()}]`)
  }
}
