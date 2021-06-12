'use strict'

import ChatProcessor from './chat-processor.js'
import { i18n, i18n_f, locateToken, makeRegexPatternFrom } from '../../lib/utilities.js'

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
  static regex() {
    return /^\/(st|status) +(toggle|t|on|off|\+|-|clear|set|unset|list) *([^\@: ]+)? *(\@self|:\S+)?/i
  }

  help() {
    return '/status on|off|t|clear|list &lt;status&gt;'
  }

  matches(line) {
    this.match = line.match(StatusChatProcessor.regex())
    return !!this.match
  }

  async process(_) {
    let m = this.match

    let commandText = this.match[2].trim().toLowerCase()
    let theCommand = Command[commandText]
    if (theCommand == Command.list) return this.priv(this.list())

    let self = this.match[4] === '@self'
    let tokenName = !self && !!this.match[4] ? this.match[4].replace(/^:(.*)$/, '$1') : null

    let tokens = !!tokenName ? this.getTokensFor(tokenName) : !!self ? this.getSelfTokens() : canvas.tokens.controlled
    if (!tokens || tokens.length === 0) {
      ui.notifications.warn(i18n_f('GURPS.chatSelectSelfOrNameTokens', { self: '@self' }))
      return
    }

    if (theCommand == Command.clear) return await this.clear(tokens)

    let effectText = this.match[3]?.trim()
    let effect = !!effectText ? this.findEffect(effectText) : null
    if (!effect) {
      ui.notifications.warn(i18n('GURPS.chatNoStatusMatched') + " '" + effectText + "'")
      return
    }

    if (theCommand == Command.toggle) return await this.toggle(tokens, effect)
    else if (theCommand == Command.set) return await this.set(tokens, effect)
    else if (theCommand == Command.unset) return await this.unset(tokens, effect)
    else ui.notifications.warn(`Unexpected error: command: ${theCommand} (${this.match})`)
  }

  list() {
    let html = `<table style='font-size: smaller;'><tr><th>${i18n('GURPS.ID')}</th><th>${i18n('GURPS.name')}</th></tr>`
    let sortedEffects = []
    let effectIds = Object.values(CONFIG.statusEffects.map(it => i18n(it.id)))
    effectIds.sort()
    for (const id of effectIds) {
      sortedEffects.push(CONFIG.statusEffects.find(it => it.id === id))
    }

    sortedEffects.forEach(s => {
      html += `<tr><td>${s.id}</td><td>'${i18n(s.label)}'</td></tr>`
    })
    return html + '</table>'
  }

  getTokensFor(name) {
    let matches = locateToken(name)

    if (matches.length !== 1) {
      let msg =
        matches.length === 0 //
          ? i18n_f('GURPS.chatNoTokenFound', { name: name }, 'No Actor/Token found matching {name}')
          : i18n_f('GURPS.chatMultipleTokensFound', { name: name }, 'More than one Token/Actor found matching {name}')
      ui.notifications.warn(msg)
      return null
    }

    return matches
  }

  getSelfTokens() {
    let tokens = canvas.tokens.placeables.filter(it => it.constructor.name === 'Token')
    let list = tokens.filter(it => it.owned)
    if (list.length === 1) return list

    let msg = list.length === 0 ? i18n('GURPS.chatNoOwnedTokenFound') : i18n('GURPS.chatMultipleOwnedFound')
    ui.notifications.warn(msg)
    return null
  }

  findEffect(statusText) {
    let pattern = !statusText ? '.*' : new RegExp(makeRegexPatternFrom(statusText)) // Make string into a RegEx pattern

    let effect = null
    Object.values(CONFIG.statusEffects).forEach(s => {
      if (i18n(s.label).match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
      if (s.id.match(pattern)) effect = s
    })

    return effect
  }

  isEffectActive(token, effect) {
    let actor = token?.actor || game.actors.get(token.actorId)
    return actor.isEffectActive(effect)
    // return actor.effects.map(it => it.getFlag('core', 'statusId')).includes(effect.id)
  }

  async toggleTokenEffect(token, effect, actionText) {
    if (!!effect) {
      await token.toggleEffect(effect)
      // TODO We need to turn this into a single string, instead of multiple i18n strings concatenated.
      // This assumes an English-like word order, which may not apply to another language.
      this.prnt(
        `${i18n(actionText)} [${effect.id}:'${i18n(effect.label)}'] ${i18n('GURPS.for')} ${token.actor.displayname}`
      )
    }
  }

  async toggle(tokens, effect) {
    for (const token of tokens) {
      this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
    }
  }

  async unset(tokens, effect) {
    for (const token of tokens) {
      for (const actorEffect of token.actor.effects) {
        if (effect.id == actorEffect.getFlag('core', 'statusId')) {
          await this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
        }
      }
    }
  }

  async set(tokens, effect) {
    for (const token of tokens) {
      if (!this.isEffectActive(token, effect)) await this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
    }
  }

  async clear(tokens) {
    for (const token of tokens)
      for (const actorEffect of token.actor.effects)
        await this.toggleTokenEffect(token, this.getStatusEffect(actorEffect), 'GURPS.chatClearing')
  }

  getStatusEffect(actorEffect) {
    for (const status of Object.values(CONFIG.statusEffects))
      if (status.id == actorEffect.getFlag('core', 'statusId')) return status

    return null
  }
}
