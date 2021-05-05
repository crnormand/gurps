'use strict'

import ChatProcessor from './chat-processor.js'
import { i18n } from '../../lib/utilities.js'

const Command = {
  on: 'set',
  '+': 'set',
  set: 'set',
  t: 'toggle',
  toggle: 'toggle',
  clear: 'clear',
  off: 'unset',
  unset: 'unset',
  '-': 'unset',
  list: 'list',
}

export default class StatusChatProcessor extends ChatProcessor {
  help() {
    return '/status2 on|off|t|clear|list &lt;status&gt;'
  }

  matches(line) {
    this.match = line.match(/^\/(st2|status2) +(toggle|t|on|off|\+|-|clear|set|unset|list) *([^\@ ]+)? *(\@self)?/i)
    return !!this.match
  }

  async process(_) {
    let m = this.match
    let commandText = m[2].trim().toLowerCase()
    let statusText = m[3]?.trim()
    let self = !!m[4]

    let theCommand = Command[commandText]

    if (theCommand == Command.list) return this.priv(this.list())

    let tokens = !!self ? this.getSelfTokens() : canvas.tokens.controlled
    if (!tokens || tokens.length === 0) {
      ui.notifications.warn(i18n('GURPS.chatYouMustSelectTokens') + ' @self) ' + i18n('GURPS.chatToApplyEffects'))
      return
    }

    if (theCommand == Command.clear) return await this.clear(tokens)

    let effect = this.findEffect(statusText)
    if (!effect) {
      ui.notifications.warn(i18n('GURPS.chatNoStatusMatched') + " '" + statusText + "'")
      return
    }

    if (theCommand == Command.toggle) return await this.toggle(tokens, effect)
    if (theCommand == Command.set) return await this.set(tokens, effect)
    if (theCommand == Command.unset) return await this.unset(tokens, effect)
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

  isEffectActive(token, effect) {
    return token.actor.effects.map(it => it.getFlag('core', 'statusId')).includes(effect.id)
  }

  async _toggle(token, effect, actionText) {
    await token.toggleEffect(effect)
    // TODO You need to turn this into a single string, instead of multiple i18n strings concatenated.
    // This assumes an English-like word order, which may not apply to another language.
    this.prnt(
      `${i18n(actionText)} [${effect.id}:'${i18n(effect.label)}'] ${i18n('GURPS.for')} ${token.actor.displayname}`
    )
  }

  async toggle(tokens, effect) {
    for (const token of tokens) {
      this._toggle(token, effect, 'GURPS.chatToggling')
    }
  }

  async unset(tokens, effect) {
    for (const token of tokens) {
      for (const actorEffect of token.actor.effects) {
        if (effect.id == actorEffect.getFlag('core', 'statusId')) {
          await this._toggle(token, effect, 'GURPS.chatToggling')
        }
      }
    }
  }

  async set(tokens, effect) {
    for (const token of tokens) {
      if (!this.isEffectActive(token, effect)) await this._toggle(token, effect, 'GURPS.chatToggling')
    }
  }

  async clear(tokens) {
    for (const token of tokens) {
      for (const actorEffect of token.actor.effects) {
        await this._toggle(token, actorEffect, 'GURPS.chatClearing')
      }
    }
  }

  getSelfTokens() {
    return !!GURPS.LastActor
      ? !!GURPS.LastActor.token
        ? [GURPS.LastActor.token]
        : GURPS.LastActor.getActiveTokens()
      : []
  }
}
