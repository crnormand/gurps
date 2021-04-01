'use strict'
import { parselink } from '../lib/parselink.js'
import { NpcInput } from '../lib/npc-input.js'
import { Equipment } from './actor.js'
import * as Settings from '../lib/miscellaneous-settings.js'

/**
 *  This holds functions for all things chat related
 *
 */

function whisper(priv) {
  if (priv.length == 0) return
  ChatMessage.create({
    alreadyProcessed: true,
    content: priv.join('<br>'),
    user: game.user._id,
    type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
    whisper: [game.user._id],
  })
  priv.length = 0
}

function chat(pub, chatData) {
  if (pub.length == 0) return
  let d = duplicate(chatData)
  d.alreadyProcessed = true
  d.content = pub.join('<br>')
  ChatMessage.create(d)
  pub.length = 0
}

function send(priv, pub, data) {
  this.whisper(priv)
  this.chat(pub, data)
}

class ChatProcessorRegistry {
  constructor() {
    this._processors = []
  }

  /**
   * Handle the chat message
   * @param {String} line - chat input
   * @returns true, if handled
   */
  handle(line, msgs) {
    let processor = this._processors.find(it => it.matches(line))
    if (!!processor) return processor.process(line, msgs)
    return false
  }

  /**
   * Register a chat processor
   * @param {*} processor
   */
  registerProcessor(processor) {
    this._processors.push(processor)
  }
}

export let ChatProcessors = new ChatProcessorRegistry()

// Stack up as many public messages as we can, until we need to print a private one (to reduce the number of chat messages)
let pub = (text, msgs) => {
  if (msgs.priv.length > 0) send(msgs)
  msgs.pub.push(text)
}
// Stack up as many private messages as we can, until we need to print a public one (to reduce the number of chat messages)
let priv = (text, msgs) => {
  if (msgs.pub.length > 0) send(msgs)
  msgs.priv.push(text)
}

let prnt = (text, msgs) => {
  let p_setting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PLAYER_CHAT_PRIVATE)
  if (game.user.isGM || p_setting) priv(text, msgs)
  else pub(text, msgs)
}

/**
 * Base class for a chat message processor.
 */
export class ChatProcessor {
  /**
   * Override
   * @param {*} line - chat command
   * @returns true if this processor will handle this chat command
   */
  matches(line) {}

  /**
   * Override to process a chat command
   * @param {*} line
   */
  process(line, msgs) {}

  sendPublicMessage(text, msgs) {
    pub(text, msgs)
  }

  sendPrivateMessage(text, msgs) {
    priv(text, msgs)
  }

  printMessage(text, msgs) {
    prnt(text, msgs)
  }
}

export default function addChatHooks() {
  Hooks.once('init', async function () {
    let send = msgs => {
      if (msgs.priv.length > 0) {
        ChatMessage.create({
          alreadyProcessed: true,
          content: msgs.priv.join('<br>'),
          user: game.user._id,
          type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
          whisper: [game.user._id],
        })
        msgs.priv.length = 0
      }
      if (msgs.pub.length > 0) {
        msgs.data.alreadyProcessed = true
        msgs.data.content = msgs.pub.join('<br>')
        ChatMessage.create(msgs.data)
        msgs.pub.length = 0
      }
    }

    Hooks.on('chatMessage', (log, message, data) => {
      if (!!data.alreadyProcessed) return true // The chat message has already been parsed for GURPS commands show it should just be displayed
      if (GURPS.ChatCommandsInProcess.includes(message)) {
        GURPS.ChatCommandsInProcess = GURPS.ChatCommandsInProcess.filter(item => item !== message)
        return true // Ok. this is a big hack, and only used for singe line chat commands... but since arrays are synchronous and I don't expect chat floods, this is safe
      }

      let msgs = { pub: [], priv: [], data: data }

      // Is Dice So Nice enabled ?
      let niceDice = false
      try {
        niceDice = game.settings.get('dice-so-nice', 'settings').enabled
      } catch {}
      let handled = false
      message
        .replace(/\\\\/g, '\n')
        .split('\n')
        .forEach(line => {
          var m
          if (line === '/help' || line === '!help') {
            let c = "<a href='" + GURPS.USER_GUIDE_URL + "'>GURPS 4e Game Aid USERS GUIDE</a>"
            c += '<br>/:&lt;macro name&gt'
            c += '<br>/clearmb'
            c += '<br>/fp &lt;formula&gt;'
            c += '<br>/hp &lt;formula&gt;'
            c += '<br>/private (or /pr) [On-the-Fly formula]'
            c += '<br>/qty &lt;formula&gt; &lt;equipment name&gt;'
            c += '<br>/ra N | Skillname-N'
            c += '<br>/roll (or /r) [On-the-Fly formula]'
            c += '<br>/rolltable &lt;RollTable name&gt;'
            c += '<br>/select &lt;Actor name&gt'
            c += '<br>/showmbs'
            c += '<br>/status on|off|t|toggle|clear &lt;status&gt;'
            c += '<br>/tracker(&lt;name&gt;) &lt;formula&gt;'
            c += '<br>/trackerN (N=0-3) &lt;formula&gt;'
            c += '<br>/uses &lt;formula&gt; &lt;equipment name&gt;'
            if (game.user.isGM) {
              c += '<br> --- GM only ---'
              c += '<br>/everyone (or /ev) &lt;formula&gt;'
              c += '<br>/frightcheck (or /fc)'
              c += '<br>/mook'
              c += '<br>/sendmb &lt;OtF&gt &lt;playername(s)&gt'
            }
            priv(c, msgs)
            handled = true
            return
          }
          if (line === '/mook' && game.user.isGM) {
            new NpcInput().render(true)
            priv('Opening Mook Generator', msgs)
            handled = true
            return
          }

          m = line.match(/\/(select|sel) ?([^!]*)(!)?/)
          if (!!m) {
            if (!m[2]) {
              GURPS.ClearLastActor(GURPS.LastActor)
              priv('Clearing Last Actor', msgs)
            } else {
              let pat = m[2].split('*').join('.*')
              pat = '^' + pat.trim() + '$'
              let list = game.scenes.viewed?.data.tokens.map(t => game.actors.get(t.actorId)) || []
              if (!!m[3]) list = game.actors.entities
              let a = list.filter(a => a.name.match(pat))
              let msg = "More than one Actor found matching '" + m[2] + "': " + a.map(e => e.name).join(', ')
              if (a.length == 0 || a.length > 1) {
                // No good match on actors, try token names
                a = canvas.tokens.placeables.filter(t => t.name.match(pat))
                msg = "More than one Token found matching '" + m[2] + "': " + a.map(e => e.name).join(', ')
                a = a.map(t => t.actor)
              }
              if (a.length == 0) ui.notifications.warn("No Actor/Token found matching '" + m[2] + "'")
              else if (a.length > 1) ui.notifications.warn(msg)
              else {
                GURPS.SetLastActor(a[0])
                priv('Selecting ' + a[0].displayname, msgs)
              }
            }
            handled = true
            return
          }

          m = line.match(/\/(st|status) +(t|toggle|on|off|\+|-|clear|set|unset) *([^\@ ]+)? *(\@self)?/i)
          if (!!m) {
            let pattern = !m[3]
              ? '.*'
              : new RegExp('^' + m[3].trim().split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)'), 'i') // Make string into a RegEx pattern
            let any = false
            let on = false
            let set = m[2].toLowerCase() == 'on' || m[2] == '+' || m[2] == 'set'
            let toggle = m[2].toLowerCase() == 't' || m[2].toLowerCase() == 'toggle'
            let clear = m[2].toLowerCase() == 'clear'
            var effect, msg
            Object.values(CONFIG.statusEffects).forEach(s => {
              let nm = game.i18n.localize(s.label)
              if (nm.match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
              if (s.id.match(pattern)) effect = s
            })
            if (!effect) ui.notifications.warn("No status matched '" + pattern + "'")
            else if (!!m[4]) {
              if (!!GURPS.LastActor) {
                let tokens = !!GURPS.LastActor.token ? [GURPS.LastActor.token] : GURPS.LastActor.getActiveTokens()
                if (tokens.length == 0)
                  msg = 'Your character does not have any tokens.   We require a token to set statuses'
                else {
                  any = true
                  GURPS.LastActor.effects.forEach(e => {
                    if (clear)
                      Object.values(CONFIG.statusEffects).forEach(s => {
                        if (s.id == e.getFlag('core', 'statusId')) {
                          tokens[0].toggleEffect(s)
                          prnt(`Clearing ${e.data.label} for ${GURPS.LastActor.displayname}`, msgs)
                        }
                      })
                    else if (effect.id == e.getFlag('core', 'statusId')) on = true
                  })
                  if (on & !set || (!on && set) || toggle) {
                    prnt(`Toggling ${game.i18n.localize(effect.label)} for ${GURPS.LastActor.displayname}`, msgs)
                    tokens[0].toggleEffect(effect)
                  }
                }
              } else msg = 'You must select a character to apply status effects'
            } else {
              msg = 'You must select tokens (or use @self) to apply status effects'
              canvas.tokens.controlled.forEach(t => {
                any = true
                if (!!t.actor)
                  t.actor.effects.forEach(e => {
                    if (clear)
                      Object.values(CONFIG.statusEffects).forEach(s => {
                        if (s.id == e.getFlag('core', 'statusId')) {
                          t.toggleEffect(s)
                          prnt(`Clearing ${e.data.label} for ${t.actor.displayname}`, msgs)
                        }
                      })
                    else if (effect.id == e.getFlag('core', 'statusId')) on = true
                  })
                if (on & !set || (!on && set) || toggle) {
                  prnt(`Toggling ${game.i18n.localize(effect.label)} for ${t.actor.displayname}`, msgs)
                  t.toggleEffect(effect)
                }
              })
            }
            if (!any) ui.notifications.warn(msg)
            handled = true
            return
          }

          m = line.match(/\/qty *([\+-=]\d+)(.*)/i)
          if (!!m) {
            let actor = GURPS.LastActor
            if (!actor) ui.notifications.warn('You must have a character selected')
            else {
              let m2 = m[2].trim().match(/^(o[\.:])?(.*)/i)
              let pattern = m2[2]
              let [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
              if (!eqt) ui.notifications.warn("No equipment matched '" + pattern + "'")
              else {
                eqt = duplicate(eqt)
                let delta = parseInt(m[1])
                if (isNaN(delta)) {
                  // only happens with '='
                  delta = parseInt(m[1].substr(1))
                  if (isNaN(delta)) ui.notifications.warn(`Unrecognized format '${m[1]}'`)
                  else {
                    eqt.count = delta
                    actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
                    prnt(`${pattern} set to ${delta}`, msgs)
                  }
                } else {
                  let q = parseInt(eqt.count) + delta
                  if (q < 0) ui.notifications.warn("You do not have enough '" + eqt.name + "'")
                  else {
                    prnt(`${pattern} QTY ${m[1]}`, msgs)
                    eqt.count = q
                    actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
                  }
                }
              }
            }
            handled = true
            return
          }

          m = line.match(/\/uses *([\+-=]\w+)?(reset)?(.*)/i)
          if (!!m) {
            let actor = GURPS.LastActor
            if (!actor) ui.notifications.warn('You must have a character selected')
            else {
              let pattern = m[3].trim()
              let [eqt, key] = actor.findEquipmentByName(pattern)
              if (!eqt) ui.notifications.warn("No equipment matched '" + pattern + "'")
              else {
                eqt = duplicate(eqt)
                let delta = parseInt(m[1])
                if (!!m[2]) {
                  prnt(`${pattern} USES reset to MAX USES (${eqt.maxuses})`, msgs)
                  eqt.uses = eqt.maxuses
                  actor.update({ [key]: eqt })
                } else if (isNaN(delta)) {
                  // only happens with '='
                  delta = m[1].substr(1)
                  eqt.uses = delta
                  actor.update({ [key]: eqt })
                  prnt(`${pattern} USES set to ${delta}`, msgs)
                } else {
                  let q = parseInt(eqt.uses) + delta
                  let max = parseInt(eqt.maxuses)
                  if (isNaN(q)) ui.notifications.warn(eqt.name + " 'uses' is not a number")
                  else if (q < 0) ui.notifications.warn(eqt.name + ' does not have enough USES')
                  else if (!isNaN(max) && max > 0 && q > max)
                    ui.notifications.warn(`Exceeded max uses (${max}) for ` + eqt.name)
                  else {
                    prnt(`${pattern} USES ${m[1]} = ${q}`, msgs)
                    eqt.uses = q
                    actor.update({ [key]: eqt })
                  }
                }
              }
            }
            handled = true
            return
          }

          m = line.match(/\/([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?(reset)?(.*)/i)
          if (!!m) {
            let actor = GURPS.LastActor
            if (!actor) ui.notifications.warn('You must have a character selected')
            else {
              let attr = m[1].toUpperCase()
              let delta = parseInt(m[3])
              const max = actor.data.data[attr].max
              let reset = ''
              if (!!m[5]) {
                actor.update({ ['data.' + attr + '.value']: max })
                prnt(`${actor.displayname} reset to ${max} ${attr}`, msgs)
              } else if (isNaN(delta) && !!m[3]) {
                // only happens with '='
                delta = parseInt(m[3].substr(1))
                if (isNaN(delta)) ui.notifications.warn(`Unrecognized format for '${line}'`)
                else {
                  let mtxt = ''
                  if (delta > max) {
                    delta = max
                    mtxt = ` (max: ${max})`
                  }
                  actor.update({ ['data.' + attr + '.value']: delta })
                  prnt(`${actor.displayname} set to ${delta} ${attr}${mtxt}`, msgs)
                }
              } else if (!!m[2] || !!m[3]) {
                let mtxt = ''
                let mod = m[3] || ''
                delta = parseInt(mod)
                let dice = m[2] || ''
                let txt = ''
                if (!!dice) {
                  let sign = dice[0] == '-' ? -1 : 1
                  let d = dice.match(/[+-](\d+)d(\d*)/)
                  let r = d[1] + 'd' + (!!d[2] ? d[2] : '6')
                  let roll = Roll.create(r).evaluate()
                  if (niceDice) game.dice3d.showForRoll(roll, game.user, data.whisper)
                  delta = roll.total
                  if (!!mod)
                    if (isNaN(mod)) {
                      ui.notifications.warn(`Unrecognized format '${line}'`)
                      handled = true
                      return
                    } else delta += parseInt(mod)
                  delta = Math.max(delta, !!m[4] ? 1 : 0)
                  if (!!m[4]) mod += '!'
                  delta *= sign
                  txt = `(${delta}) `
                }
                delta += actor.data.data[attr].value
                if (delta > max) {
                  delta = max
                  mtxt = ` (max: ${max})`
                }
                actor.update({ ['data.' + attr + '.value']: delta })
                prnt(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`, msgs)
              } else ui.notifications.warn(`Unrecognized format for '${line}'`)
            }
            handled = true
            return
          }

          m = line.match(/\/(tracker|tr|rt|resource)([0123])?(\(([^\)]+)\))? *([+-=]\d+)?(reset)?(.*)/i)
          if (!!m) {
            let actor = GURPS.LastActor
            if (!actor) ui.notifications.warn('You must have a character selected')
            else {
              let tracker = parseInt(m[2])
              let display = tracker
              if (!!m[3]) {
                tracker = -1
                for (const [key, value] of Object.entries(actor.data.data.additionalresources.tracker)) {
                  if (value.name.match(m[4])) {
                    tracker = key
                    display = '(' + value.name + ')'
                  }
                }
                if (tracker == -1) {
                  ui.notifications.warn(`No Resource Tracker matched '${m[3]}'`)
                  handled = true
                  return
                }
              }
              let delta = parseInt(m[5])
              let reset = ''
              let max = actor.data.data.additionalresources.tracker[tracker].max
              if (!!m[6]) {
                actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: max })
                prnt(`Resource Tracker${display} reset to ${max}`, msgs)
              } else if (isNaN(delta)) {
                // only happens with '='
                delta = parseInt(m[5].substr(1))
                if (isNaN(delta)) ui.notifications.warn(`Unrecognized format for '${line}'`)
                else {
                  actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: delta })
                  prnt(`Resource Tracker${display} set to ${delta}`, msgs)
                }
              } else if (!!m[5]) {
                if (max == 0) max = Number.MAX_SAFE_INTEGER
                let v = actor.data.data.additionalresources.tracker[tracker].value + delta
                if (v > max) {
                  ui.notifications.warn(`Exceeded MAX:${max} for Resource Tracker${tracker}`)
                  v = max
                }
                actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: v })
                prnt(`Resource Tracker${display} ${m[5]} = ${v}`, msgs)
              } else ui.notifications.warn(`Unrecognized format for '${line}'`)
            }
            handled = true
            return
          }

          // /everyone +1 fp or /everyone -2d-1 fp
          m = line.match(/\/(everyone|ev) ([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?/i)
          if (!!m && (!!m[3] || !!m[4])) {
            if (game.user.isGM) {
              let any = false
              game.actors.entities.forEach(actor => {
                if (actor.hasPlayerOwner) {
                  any = true
                  let mod = m[4] || ''
                  let value = mod
                  let dice = m[3] || ''
                  let txt = ''
                  if (!!dice) {
                    let sign = dice[0] == '-' ? -1 : 1
                    let d = dice.match(/[+-](\d+)d(\d*)/)
                    let r = d[1] + 'd' + (!!d[2] ? d[2] : '6')
                    let roll = Roll.create(r).evaluate()
                    if (niceDice) game.dice3d.showForRoll(roll, game.user, data.whisper)
                    value = roll.total
                    if (!!mod)
                      if (isNaN(mod)) {
                        ui.notifications.warn(`Unrecognized format for '${line}'`)
                        handled = true
                        return
                      } else value += parseInt(mod)
                    value = Math.max(value, !!m[5] ? 1 : 0)
                    value *= sign
                    txt = `(${value}) `
                  }
                  let attr = m[2].toUpperCase()
                  let cur = actor.data.data[attr].value
                  let newval = parseInt(value)
                  if (isNaN(newval)) {
                    // only happens on =10
                    newval = parseInt(value.substr(1))
                    if (isNaN(newval)) {
                      ui.notifications.warn(`Unrecognized format for '${line}'`)
                      handled = true
                      return
                    }
                  } else newval += cur
                  let mtxt = ''
                  let max = actor.data.data[attr].max
                  if (newval > max) {
                    newval = max
                    mtxt = `(max: ${max})`
                  }
                  actor.update({ ['data.' + attr + '.value']: newval })
                  priv(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`, msgs)
                }
              })
              if (!any) priv(`There are no player owned characters!`, msgs)
            } else priv(`You must be a GM to execute '${line}'`, msgs)
            handled = true
            return
          }

          // /everyone fp/hp reset
          m = line.match(/\/(everyone|ev) ([fh]p) reset/i)
          if (!!m) {
            if (game.user.isGM) {
              let any = false
              game.actors.entities.forEach(actor => {
                if (actor.hasPlayerOwner) {
                  any = true
                  let attr = m[2].toUpperCase()
                  let max = actor.data.data[attr].max
                  actor.update({ ['data.' + attr + '.value']: max })
                  priv(`${actor.displayname} ${attr} reset to ${max}`, msgs)
                }
              })
              if (!any) priv(`There are no player owned characters!`, msgs)
            } else priv(`You must be a GM to execute '${line}'`, msgs)
            handled = true
            return
          }

          m = line.match(/\/(everyone|ev) \[(.*)\]/i)
          if (!!m) {
            if (game.user.isGM) {
              let any = false
              let action = parselink(m[2].trim())
              if (!!action.action) {
                if (!['modifier', 'chat', 'pdf'].includes(action.action.type)) {
                  game.actors.entities.forEach(actor => {
                    if (actor.hasPlayerOwner) {
                      any = true
                      GURPS.performAction(action.action, actor)
                    }
                  })
                  if (!any) priv(`There are no player owned characters!`, msgs)
                } else priv(`Not allowed to execute Modifier, Chat or PDF links [${m[2].trim()}]`, msgs)
              } else priv(`Unable to parse On-the-Fly formula: [${m[2].trim()}]`, msgs)
            } else priv(`You must be a GM to execute '${line}'`, msgs)
            handled = true
            return
          }

          m = line.match(/^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/)
          if (!!m && !!m[2]) {
            let action = parselink(m[2])
            if (!!action.action) {
              if (action.action.type === 'modifier')
                // only need to show modifiers, everything else does something.
                priv(line, msgs)
              else send(msgs) // send what we have
              GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.startsWith('/pr') }) // We can't await this until we rewrite Modifiers.js to use sockets to update stacks
              handled = true
              return
            } // Looks like a /roll OtF, but didn't parse as one
          }

          m = line.match(/([\.\/]p?ra) +(\w+-)?(\d+)/i)
          if (!!m) {
            let skill = m[2] || 'Default='
            let action = parselink('S:' + skill.replace('-', '=') + m[3])
            send(msgs) // send what we have
            GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.substr(1).startsWith('pra') }) // We can't await this until we rewrite Modifiers.js to use sockets to update stacks
            handled = true
            return
          }

          handled = ChatProcessors.handle(line, msgs)
          if (handled) return

          if (line === '/clearmb') {
            priv(line, msgs)
            GURPS.ModifierBucket.clear()
            handled = true
            return
          }

          if (line === '/showmbs') {
            priv(line, msgs)
            GURPS.ModifierBucket.showOthers()
            handled = true
            return
          }

          if (line.startsWith('/sendmb')) {
            if (game.user.isGM) {
              priv(line, msgs)
              let user = line.replace(/\/sendmb/, '').trim()
              let m = user.match(/\[(.*)\](.*)/)
              if (!!m) {
                let otf = m[1]
                let t = parselink(otf)
                if (!!t.action && t.action.type == 'modifier') GURPS.ModifierBucket.sendToPlayer(t.action, m[2].trim())
                else GURPS.ModifierBucket.sendBucketToPlayer(user)
              } else GURPS.ModifierBucket.sendBucketToPlayer(user)
            } else priv(`You must be a GM to execute '${line}'`, msgs)
            handled = true
            return
          }

          if (line.startsWith('/:')) {
            m = Object.values(game.macros.entries).filter(m => m.name.startsWith(line.substr(2)))
            if (m.length > 0) {
              send(msgs)
              m[0].execute()
            } else priv(`Unable to find macro named '${line.substr(2)}'`, msgs)
            handled = true
            return
          }

          m = line.match(/\/rolltable(.*)/)
          if (!!m) {
            handled = true
            let tblname = m[1].trim()
            let table = game.tables.entities.find(t => t.name === tblname)
            if (!table) {
              ui.notifications.error("No table found for '" + tblname + "'")
              return
            }
            let r = table.roll()
            table.draw({ roll: r })
            GURPS.ModifierBucket.clear()
            return
          }

          if (line.match(/\/(fc|frightcheck)/)) {
            handled = true
            if (!game.user.isGM) {
              priv(`You must be a GM to execute '${line}'`, msgs)
              return
            }
            if (!GURPS.LastActor) {
              ui.notifications.error('Please select a token/character.')
              return
            }
            let actor = GURPS.LastActor
            let tblname = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_FRIGHT_CHECK_TABLE) || 'Fright Check'

            let p = renderTemplate('systems/gurps/templates/frightcheck-macro.html', { tblname: tblname })
            p.then(dialogTemplate =>
              new Dialog(
                {
                  title: 'Fright Check',
                  content: dialogTemplate,
                  buttons: {
                    rollFrightCheck: {
                      label: 'Roll Fright Check',
                      callback: html => {
                        let mod1 = html.find('#mod1')[0].value
                        mod1 = parseInt(mod1, 10)
                        let mod2 = html.find('#mod2')[0].value
                        mod2 = parseInt(mod2, 10)
                        let mod3 = html.find('#mod3')[0].value
                        mod3 = parseInt(mod3, 10)
                        let mod4 = html.find('#mod4')[0].value
                        mod4 = parseInt(mod4, 10)
                        let mod5 = html.find('#mod5')[0].value
                        mod5 = parseInt(mod5, 10)
                        let check1 = html.find('#check1')[0]
                        let check2 = html.find('#check2')[0]
                        let bodies1 = html.find('#bodies1')[0].value
                        bodies1 = parseInt(bodies1, 10)
                        let bodies2 = html.find('#bodies2')[0]
                        let check3 = html.find('#check3')[0]
                        let monster1 = html.find('#monster1')[0].value
                        monster1 = parseInt(monster1, 10)
                        let monster2 = html.find('#monster2')[0].value
                        monster2 = parseInt(monster2, 10)
                        let check4 = html.find('#check4')[0]
                        let check4a = html.find('#check4a')[0]
                        let check4b = html.find('#check4b')[0]
                        let check5 = html.find('#check5')[0]
                        let check6 = html.find('#check6')[0]
                        let check7 = html.find('#check7')[0]
                        let check8 = html.find('#check8')[0]
                        let check9 = html.find('#check9')[0]

                        let WILLVar = actor.data.data.frightcheck || actor.data.data.attributes.WILL.value
                        WILLVar = parseInt(WILLVar, 10)

                        let rollString = `3d6`
                        let roll = Roll.create(rollString).roll()
                        let fearMod = 0

                        let chatContent = ``
                        let totalMod = 0

                        if (check1.checked) {
                          check1 = parseInt(check1.value, 10)
                          fearMod += check1
                        }
                        if (check2.checked) {
                          check2 = parseInt(check2.value, 10)
                          fearMod += check2
                        }
                        if (bodies2.checked) {
                          bodies2 = parseInt(bodies2.value, 10)
                          fearMod += bodies2
                        }
                        if (check3.checked) {
                          check3 = parseInt(check3.value, 10)
                          fearMod += check3
                        }
                        if (check4.checked) {
                          check4 = parseInt(check4.value, 10)
                          fearMod += check4
                        }
                        if (check4a.checked) {
                          check4a = parseInt(check4a.value, 10)
                          fearMod += check4a
                        }
                        if (check4b.checked) {
                          check4b = parseInt(check4b.value, 10)
                          fearMod += check4b
                        }
                        if (check5.checked) {
                          check5 = parseInt(check5.value, 10)
                          fearMod += check5
                        }
                        if (check6.checked) {
                          check6 = parseInt(check6.value, 10)
                          fearMod += check6
                        }
                        if (check7.checked) {
                          check7 = parseInt(check7.value, 10)
                          fearMod += check7
                        }
                        if (check8.checked) {
                          check8 = parseInt(check8.value, 10)
                          fearMod += check8
                        }
                        if (check9.checked) {
                          check9 = parseInt(check9.value, 10)
                          fearMod += check9
                        }
                        console.log('Fright Margin mod: ', fearMod)

                        totalMod = fearMod + mod1 + mod2 + mod3 + mod4 + mod5 + bodies1 + monster1 + monster2
                        let tm = totalMod >= 0 ? '+' + totalMod : totalMod
                        console.log('Total mod before checked: ', totalMod)
                        let targetRoll = totalMod + WILLVar
                        let g13 = ''
                        if (targetRoll > 13) {
                          targetRoll = 13
                          g13 = `<span style='font-size:small;font-style:italic'>(Cannot be greater than 13 [PDF:B360])</span><br><br>`
                        }

                        tblname = html.find('#tblname')[0].value
                        game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_FRIGHT_CHECK_TABLE, tblname)
                        if (roll.total > targetRoll) {
                          console.log('Fright Check FAIL')
                          fearMod = roll.total - targetRoll

                          //let frightEntry = fearMod + rollMod.total;

                          // Draw results using a custom roll formula
                          let table = game.tables.entities.find(t => t.name === tblname)
                          let tableRoll = new Roll('3d6 + @rollvar', { rollvar: fearMod })
                          if (!!table) table.draw({ roll: tableRoll })

                          chatContent = `<div class='roll-result'><div class='roll-detail'><p>Fright Check is ${WILLVar}${tm} = ${targetRoll}</p>
                      ${g13}
                      <span><span class='fa fa-dice' />&nbsp;<span class='fa fa-long-arrow-alt-right' />
                      ${roll.total}</span>
                      <span class='failure'>Failed Final Fright Check by ${fearMod}</span></div></div>`
                        } else {
                          console.log('Fright Check SUCCESS')
                          chatContent = `<div class='roll-result'><div class='roll-detail'><p>Fright Check is ${WILLVar}${tm} = ${targetRoll}</p>
                      ${g13}
                      <span><span class='fa fa-dice' />&nbsp;<span class='fa fa-long-arrow-alt-right' />
                      ${roll.total}</span>
                      <span class='success'>Fright Check SUCCESS!</span></div></div>`
                        }
                        ChatMessage.create({
                          type: CHAT_MESSAGE_TYPES.ROLL,
                          speaker: {
                            alias: actor.name,
                          },
                          content: chatContent,
                          roll: roll,
                          rollMode: game.settings.get('core', 'rollMode'),
                        })
                      },
                    },
                    close: {
                      label: 'Close',
                    },
                  },
                },
                { width: 500 }
              ).render(true)
            )
            return
          }

          // It isn't one of our commands...
          if (line.trim().startsWith('/')) {
            // immediately flush our stored msgs, and execute the slash command using the default parser
            send(msgs)
            GURPS.ChatCommandsInProcess.push(line) // Remember which chat message we are running, so we don't run it again!
            ui.chat.processMessage(line).catch(err => {
              ui.notifications.error(err)
              console.error(err)
            })
            handled = true
          } else pub(line, msgs) // If not handled, must just be public text
        }) // end split
      if (handled) {
        // If we handled 'some' messages, then send the remaining messages, and return false (so the default handler doesn't try)
        send(msgs)
        return false // Don't display this chat message, since we have handled it with others
      } else return true
    })

    // Look for blind messages with .message-results and remove them
    /*  Hooks.on("renderChatMessage", (log, content, data) => {
      if (!!data.message.blind) {
          if (data.author?.isSelf && !data.author.isGm) {   // We are rendering the chat message for the sender (and they are not the GM)
            $(content).find(".gurps-results").html("...");  // Replace gurps-results with "...".  Does nothing if not there.
          }
        }
      });  */

    // Add the "for" attribute to a collapsible panel label. This is needed
    // because the server in 0.7.8 strips the "for" attribute in an attempt
    // to guard against weird security hacks. When "for" is whitelisted as
    // a valid attribute (future) we can remove this.
    Hooks.on('renderChatMessage', (app, html, msg) => {
      // this is a fucking hack
      let wrapper = html.find('.collapsible-wrapper')
      if (wrapper.length > 0) {
        console.log($(wrapper).html())
        let input = $(wrapper).find('input.toggle')[0]
        let label = $(input).siblings('label.label-toggle')[0]
        let id = input.id
        let labelFor = $(label).attr('for')
        if (labelFor !== id) {
          $(label).attr('for', id)
        }
        console.log($(wrapper).html())
      }
    })

    // Look for RESULTS from a RollTable.   RollTables do not generate regular chat messages
    Hooks.on('preCreateChatMessage', (data, options, userId) => {
      let c = data.content
      try {
        let html = $(c)
        let rt = html.find('.result-text') // Ugly hack to find results of a roll table to see if an OtF should be "rolled" /r /roll
        let re = /^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/
        let t = rt[0]?.innerText
        if (!!t) {
          t.split('\n').forEach(e => {
            let m = e.match(re)
            if (!!m && !!m[2]) {
              let action = parselink(m[2])
              if (!!action.action) {
                GURPS.performAction(action.action, GURPS.LastActor, {
                  shiftKey: e.startsWith('/pr'),
                })
                //          return false; // Return false if we don't want the rolltable chat message displayed.  But I think we want to display the rolltable result.
              }
            }
          })
        }
      } catch (e) {} // a dangerous game... but limited to GURPs /roll OtF
      data.content = game.GURPS.gurpslink(c)
    })

    Hooks.on('renderChatMessage', (app, html, msg) => {
      GURPS.hookupGurps(html)
      html.find('[data-otf]').each((_, li) => {
      li.setAttribute('draggable', true)
      li.addEventListener('dragstart', ev => {
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            otf: li.getAttribute('data-otf')
          })
        )
      })
    })

    })
  }) // End of "ready"
}
