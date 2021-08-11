'use strict'

import ChatProcessor from './chat-processor.js'
import { i18n, i18n_f, locateToken, makeRegexPatternFrom } from '../../lib/utilities.js'
import { GurpsActor } from '../actor/actor.js'

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

/** @typedef {{id: string, label: string, icon: string}} EffectData */

export default class StatusChatProcessor extends ChatProcessor {
  static regex() {
    return /^\/(st|status) +(?<command>toggle|t|on|off|\+|-|clear|set|unset|list) *(?<name>[^\@: ]+)? *(?<target>\@self|:\S+)? *(?<data>\{.*\})?/i
  }

  help() {
    return '/status on|off|t|clear|list &lt;status&gt; (@self|:name) ({ turns: x })'
  }

  /**
   * @param {string} line
   * @returns
   */
  matches(line) {
    this.match = line.match(StatusChatProcessor.regex())
    return !!this.match
  }

  /**
   * @param {string} _
   */
  async process(_) {
    if (!this.match) throw new Error('match does not exist! Did you call ChatProcessor.matches()?')

    let commandText = this.match.groups?.command
    // @ts-ignore
    let theCommand = Command[commandText]
    if (theCommand == Command.list) return this.priv(this.list())

    let self = this.match.groups?.target /* this.match[4] */ === '@self'
    let tokenName = !self && !!this.match.groups?.target ? this.match.groups.target.replace(/^:(.*)$/, '$1') : null

    let tokens = !!tokenName
      ? this.getTokensFor(tokenName)
      : !!self
      ? this.getSelfTokens()
      : _canvas().tokens?.controlled

    if (!tokens || tokens.length === 0) {
      _ui().notifications.warn(i18n_f('GURPS.chatSelectSelfOrNameTokens', { self: '@self' }))
      return
    }

    if (theCommand == Command.clear) return await this.clear(tokens)

    let effectText = this.match.groups?.name?.trim() //this.match[3]?.trim()
    let effect = !!effectText ? this.findEffect(effectText) : null
    if (!effect) {
      _ui().notifications.warn(i18n('GURPS.chatNoStatusMatched') + " '" + effectText + "'")
      return
    }

    if (this.match.groups?.data) {
      let data = JSON.parse(this.match.groups.data)
      data.duration.combat = _game().combats?.active?.id
      mergeObject(effect, data)
    }

    if (theCommand == Command.toggle) return await this.toggle(tokens, effect)
    else if (theCommand == Command.set) return await this.set(tokens, effect)
    else if (theCommand == Command.unset) return await this.unset(tokens, effect)
    else _ui().notifications.warn(`Unexpected error: command: ${theCommand} (${this.match})`)
  }

  /**
   * @returns {string} a string containing an HTML fragment that represents a table of possible statuses
   */
  list() {
    let html = `<table style='font-size: smaller;'><tr><th>${i18n('GURPS.ID')}</th><th>${i18n('GURPS.name')}</th></tr>`
    /** @type {EffectData[]} */
    let sortedEffects = []
    let effectIds = Object.values(CONFIG.statusEffects.map(it => i18n(it.id)))
    effectIds.sort()
    for (const id of effectIds) {
      let effect = CONFIG.statusEffects.find(it => it.id === id)
      if (effect) sortedEffects.push(effect)
    }

    sortedEffects.forEach(s => {
      html += `<tr><td>${s.id}</td><td>'${i18n(s.label)}'</td></tr>`
    })
    return html + '</table>'
  }

  /**
   * @param {string} name
   */
  getTokensFor(name) {
    let matches = locateToken(name)

    if (matches.length !== 1) {
      let msg =
        matches.length === 0 //
          ? i18n_f('GURPS.chatNoTokenFound', { name: name }, 'No Actor/Token found matching {name}')
          : i18n_f('GURPS.chatMultipleTokensFound', { name: name }, 'More than one Token/Actor found matching {name}')
      _ui().notifications.warn(msg)
      return null
    }

    return matches
  }

  getSelfTokens() {
    let list = _canvas().tokens?.placeables.filter(it => it.owner)
    if (list && list.length === 1) return list

    let msg = list && list.length === 0 ? i18n('GURPS.chatNoOwnedTokenFound') : i18n('GURPS.chatMultipleOwnedFound')
    _ui().notifications.warn(msg)
    return null
  }

  /**
   * @param {string} statusText
   * @returns {EffectData|null}
   */
  findEffect(statusText) {
    let pattern = !statusText ? '.*' : new RegExp(makeRegexPatternFrom(statusText)) // Make string into a RegEx pattern

    let effect = null
    Object.values(CONFIG.statusEffects).forEach(s => {
      if (i18n(s.label).match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
      if (s.id.match(pattern)) effect = s
    })

    return effect
  }

  /**
   * @param {Token} token
   * @param {EffectData} effect
   * @returns {boolean}
   */
  isEffectActive(token, effect) {
    /** @type {GurpsActor} */
    // @ts-ignore
    let actor = token?.actor || _game().actors?.get(token.data.actorId)
    return actor.isEffectActive(effect)
    // return actor.effects.map(it => it.getFlag('core', 'statusId')).includes(effect.id)
  }

  /**
   *
   * @param {Token} token
   * @param {EffectData|null} effect
   * @param {string} actionText
   */
  async toggleTokenEffect(token, effect, actionText) {
    if (!!effect) {
      await token.toggleEffect(effect)
      let actor = /** @type {GurpsActor} */ (token.actor)
      // TODO We need to turn this into a single string, instead of multiple i18n strings concatenated.
      // This assumes an English-like word order, which may not apply to another language.
      this.prnt(`${i18n(actionText)} [${effect.id}:'${i18n(effect.label)}'] ${i18n('GURPS.for')} ${actor.displayname}`)
    }
  }

  /**
   * @param {Token[]} tokens
   * @param {EffectData} effect
   */
  async toggle(tokens, effect) {
    for (const token of tokens) {
      this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
    }
  }

  /**
   * @param {Token[]} tokens
   * @param {EffectData} effect
   */
  async unset(tokens, effect) {
    for (const token of tokens) {
      for (const actorEffect of token.actor?.effects || []) {
        if (effect.id == actorEffect.getFlag('core', 'statusId')) {
          await this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
        }
      }
    }
  }

  /**
   * @param {Token[]} tokens
   * @param {EffectData} effect
   */
  async set(tokens, effect) {
    for (const token of tokens) {
      if (!this.isEffectActive(token, effect)) await this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
    }
  }

  /**
   * @param {Token[]} tokens
   */
  async clear(tokens) {
    for (const token of tokens)
      for (const actorEffect of token.actor?.effects || [])
        await this.toggleTokenEffect(token, this.getStatusEffect(actorEffect), 'GURPS.chatClearing')
  }

  /**
   * @param {ActiveEffect} actorEffect
   * @returns {EffectData|null}
   */
  getStatusEffect(actorEffect) {
    for (const status of Object.values(CONFIG.statusEffects))
      if (status.id == actorEffect.getFlag('core', 'statusId')) return status

    return null
  }
}

// ---------------

/**
 *
 * @returns {{notifications: Notifications}}
 */
function _ui() {
  // @ts-ignore
  if (!!globalThis.ui) return ui
  throw new Error('ui is not in the global namespace yet!')
}

/**
 * @returns {Canvas}
 */
function _canvas() {
  if (canvas instanceof Canvas) return canvas
  throw new Error('Canvas not initialized yet!')
}

/**
 * @returns {Game}
 */
function _game() {
  if (game instanceof Game) return game
  throw new Error('Game not initialized yet!')
}
