import ChatProcessor from './chat-processor.js'
import { i18n, makeRegexPatternFrom } from '../../lib/utilities.js'

// const GURPS = game.GURPS

export default class StatusProcessor extends ChatProcessor {
  help() {
    return '/status on|off|t|clear|list &lt;status&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/(st|status) +(toggle|t|on|off|\+|-|clear|set|unset|list) *([^\@ ]+)? *(\@self)?/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match
    let pattern = !m[3]
      ? '.*'
      : new RegExp(makeRegexPatternFrom(m[3]))
    let any = false
    let on = false
    let set = m[2].toLowerCase() == 'on' || m[2] == '+' || m[2] == 'set'
    let toggle = m[2].toLowerCase() == 't' || m[2].toLowerCase() == 'toggle'
    let clear = m[2].toLowerCase() == 'clear'
    let list = m[2].toLowerCase() == 'list'
    var effect, msg
    if (!!list) list = '<table><tr><th>ID:</th><th>NAME:</th></tr>'
    Object.values(CONFIG.statusEffects).forEach(s => {
      let nm = game.i18n.localize(s.label)
      if (nm.match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
      if (s.id.match(pattern)) effect = s
      if (!!list) list += `<tr><th>${s.id}</th><th>'${nm}'</th></tr>`
    })
    if (!!list) return this.priv(list + '</table>')
    if (!effect) ui.notifications.warn(i18n('GURPS.chatNoStatusMatched', 'No status matched') + " '" + pattern + "'")
    else if (!!m[4]) {
      if (!!GURPS.LastActor) {
        // TODO I can't find a way to return multiple tokens from this -- multiple selections only return one of the selected tokens
        let tokens = !!GURPS.LastActor.token ? [GURPS.LastActor.token] : GURPS.LastActor.getActiveTokens()
        if (tokens.length == 0) msg = i18n('GURPS.chatNoTokens')
        else {
          any = true
          for (const e of GURPS.LastActor.effects) {
            if (clear)
              for (const s of Object.values(CONFIG.statusEffects)) {
                if (s.id == e.getFlag('core', 'statusId')) {
                  await tokens[0].toggleEffect(s)
                  this.prnt(
                    `${i18n('GURPS.chatClearing')} ${s.id}:'${e.data.label}' ${i18n('GURPS.for')} ${
                      GURPS.LastActor.displayname
                    }`
                  )
                }
              }
            else {
              let effectId = effect.id
              let statusId = e.getFlag('core', 'statusId')
              if (effectId == statusId) {
                on = true
              }
            }
          }
          if (on & !set || (!on && set) || toggle) {
            this.prnt(
              `${i18n('GURPS.chatToggling')} ${effect.id}:'${game.i18n.localize(effect.label)}' ${i18n('GURPS.for')} ${
                GURPS.LastActor.displayname
              }`
            )
            await tokens[0].toggleEffect(effect)
          }
        }
      } else msg = i18n('GURPS.chatYouMustHaveACharacterSelected') + ' ' + i18n('GURPS.chatToApplyEffects')
    } else {
      msg = i18n('GURPS.chatYouMustSelectTokens') + ' @self) ' + i18n('GURPS.chatToApplyEffects')
      for (const t of canvas.tokens.controlled) {
        any = true
        if (!!t.actor)
          for (const e of t.actor.effects) {
            if (clear)
              for (const s of Object.values(CONFIG.statusEffects)) {
                if (s.id == e.getFlag('core', 'statusId')) {
                  await t.toggleEffect(s)
                  this.prnt(`${i18n('GURPS.chatClearing')} ${s.id}: '${e.data.label}' for ${t.actor.displayname}`)
                }
              }
            else if (effect.id == e.getFlag('core', 'statusId')) on = true
          }
        if (on & !set || (!on && set) || toggle) {
          this.prnt(
            `${i18n('GURPS.chatToggling')} ${effect.id}:'${game.i18n.localize(effect.label)}' for ${
              t.actor.displayname
            }`
          )
          await t.toggleEffect(effect)
        }
      }
    }
    if (!any) ui.notifications.warn(msg)
  }
}
