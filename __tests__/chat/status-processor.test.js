import { describe, expect, test } from '@jest/globals'
// import { jest } from '@jest/globals'
// import { StatusProcessor } from '../../module/chat/chat-processors.js'

describe('Status Processor', () => {
  //const status = new StatusProcessor()

  test('Foo', () => {
    expect(true).not.toBe(false)
  })
})

/*

export class StatusProcessor extends ChatProcessor {
  help() {
    return '/status on|off|t|clear|list &lt;status&gt;'
  }

  matches(line) {
    this.match = line.match(/^\/(st|status) +(t|toggle|on|off|\+|-|clear|set|unset|list) *([^\@ ]+)? *(\@self)?/i)
    return !!this.match
  }

  list() {
    let html = `<table style='font-size: smaller;'><tr><th>${i18n('GURPS.ID')}</th><th>${i18n('GURPS.name')}</th></tr>`
    Object.values(CONFIG.statusEffects).forEach(s => {
      html += `<tr><td>${s.id}</td><td>'${i18n(s.label)}'</td></tr>`
    })
    return html + '</table>'
  }

  findEffect(statusText) {
    let pattern = !statusText
      ? '.*'
      : new RegExp('^' + statusText.split('*').join('.*?').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + '$') // Make string into a RegEx pattern

    let effect = null
    Object.values(CONFIG.statusEffects).forEach(s => {
      if (i18n(s.label).match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
      if (s.id.match(pattern)) effect = s
    })

    return effect
  }

  async applyToSelf(set, toggle, clear) {
    let tokens = !!GURPS.LastActor.token ? [GURPS.LastActor.token] : GURPS.LastActor.getActiveTokens()
    if (tokens.length == 0) {
      ui.notifications.warn(i18n('GURPS.chatNoTokens'))
      return
    }

    for (const actorEffect of GURPS.LastActor.effects) {
      if (clear) {
        for (const statusEffect of Object.values(CONFIG.statusEffects)) {
          if (statusEffect.id == actorEffect.getFlag('core', 'statusId')) {
            await tokens[0].toggleEffect(statusEffect)
            // TODO You need to turn this into a single string, instead of multiple i18n strings concatenated.
            // This assumes an English-like word order, which may not apply to another language.
            this.prnt(
              `${i18n('GURPS.chatClearing')} ${statusEffect.id}:'${actorEffect.data.label}' ${i18n('GURPS.for')} ${
                GURPS.LastActor.displayname
              }`
            )
          }
        }
      } else if (actorEffect.id == actorEffect.getFlag('core', 'statusId')) on = true
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

  async process(line) {
    let m = this.match
    let command = m[2].trim().toLowerCase()
    let statusText = m[3]?.trim()
    let self = !!m[4]

    if (command == 'list') return this.priv(this.list())

    let effect = this.findEffect(statusText)
    if (!effect) {
      ui.notifications.warn(i18n('GURPS.chatNoStatusMatched', 'No status matched') + " '" + pattern + "'")
      return
    }

    let any = false
    let on = false

    let set = ['on', '+', 'set'].includes(command)
    let toggle = ['t', 'toggle'].includes(command)
    let clear = command == 'clear'

    var msg

    if (self && !GURPS.LastActor) {
      // TODO You need to turn this into a single string, instead of two i18n strings concatenated.
      // This assumes an English-like word order, which may not apply to another language.
      ui.notifications.warn(i18n('chatYouMustHaveACharacterSelected') + ' ' + i18n('GURPS.chatToApplyEffects'))
      return
    }

    if (self) {
      this.applyToSelf(set, toggle, clear)
      return
    }

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
          `${i18n('GURPS.chatToggling')} ${effect.id}:'${game.i18n.localize(effect.label)}' for ${t.actor.displayname}`
        )
        await t.toggleEffect(effect)
      }
    }
    if (!any) ui.notifications.warn(msg)
  }
}


*/
