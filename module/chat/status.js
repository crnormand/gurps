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

  usagematches(line) {
    return line.match(/^[\/\?](st|status)$/i)
  }

  usage() {
    return i18n('GURPS.chatHelpStatus')
  }

  /**
   * @param {string} _
   */
  async process(_) {
    if (!this.match) throw new Error('match does not exist! Did you call ChatProcessor.matches()?')

    let commandText = this.match.groups?.command

    let theCommand = Command[commandText]
    if (theCommand === Command.list) return this.priv(this.list())

    let self = this.match.groups?.target /* this.match[4] */ === '@self'
    let tokenName = !self && !!this.match.groups?.target ? this.match.groups.target.replace(/^:(.*)$/, '$1') : null

    let tokens = !!tokenName ? this.getTokensFor(tokenName) : !!self ? this.getSelfTokens() : canvas.tokens?.controlled

    if (!tokens || tokens.length === 0) {
      ui.notifications.warn(i18n_f('GURPS.chatSelectSelfOrNameTokens', { self: '@self' }))
      return
    }

    if (theCommand === Command.clear) return await this.clear(tokens)

    let effectText = this.match.groups?.name?.trim() //this.match[3]?.trim()
    let effect = !!effectText ? this.findEffect(effectText) : null
    let isStanding = false
    if (!effect) {
      if (!effectText) {
        ui.notifications.warn(i18n('GURPS.chatNoStatusMatched'))
        return
      } else if (
        !effectText.match(new RegExp(makeRegexPatternFrom(GURPS.StatusEffectStanding), 'i')) &&
        !effectText.match(new RegExp(makeRegexPatternFrom(i18n(GURPS.StatusEffectStandingLabel)), 'i'))
      ) {
        ui.notifications.warn(i18n('GURPS.chatNoStatusMatched') + " '" + effectText + "'")
        return
      }
      isStanding = true
    }
    if (this.match.groups?.data) {
      let data = JSON.parse(this.match.groups.data)
      data.duration.combat = game.combats?.active?.id
      foundry.utils.mergeObject(effect, data)
    }

    if (isStanding) {
      if (theCommand == Command.set)
        for (const pid in GURPS.StatusEffect.getAllPostures()) {
          await this.unset(tokens, this.findEffect(pid))
        }
      return // can't toggle or unset standing
    }
    if (theCommand == Command.toggle) return await this.toggle(tokens, effect)
    else if (theCommand == Command.set) return await this.set(tokens, effect)
    else if (theCommand == Command.unset) return await this.unset(tokens, effect)
    else ui.notifications.warn(`Unexpected error: command: ${theCommand} (${this.match})`)
  }

  /**
   * @returns {string} a string containing an HTML fragment that represents a table of possible statuses
   */
  list() {
    let html = `<table style='font-size: smaller;'><tr><th>${i18n('GURPS.ID')}</th><th>${i18n('GURPS.name')}</th></tr>`
    /** @type {EffectData[]} */
    let sortedEffects = []
    let effectIds = Object.values(CONFIG.statusEffects.map(it => i18n(it.id)))
    effectIds.push(GURPS.StatusEffectStanding)
    effectIds.sort()
    for (const id of effectIds) {
      let effect = CONFIG.statusEffects.find(it => it.id === id)
      if (effect) {
        effect.posture = !!GURPS.StatusEffect.getAllPostures()[id] || id == GURPS.StatusEffectStanding
        sortedEffects.push(effect)
      } else if (id == GURPS.StatusEffectStanding)
        sortedEffects.push({ id: id, label: GURPS.StatusEffectStandingLabel, posture: true })
    }

    sortedEffects.forEach(s => {
      let p = s.posture ? ' *' : ''
      html += `<tr><td>${s.id}</td><td>'${i18n(s.label)}'${p}</td></tr>`
    })
    html += `<tr><td></td><td>* => ${i18n('GURPS.modifierPosture')}</td></tr>`
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
      ui.notifications.warn(msg)
      return null
    }

    return matches
  }

  getSelfTokens() {
    let list = canvas.tokens?.placeables.filter(it => it.owner)
    if (list && list.length === 1) return list

    list = canvas.tokens?.placeables.filter(it => it.actor == GURPS.LastActor)
    if (list && list.length === 1) return list

    let msg = list && list.length === 0 ? i18n('GURPS.chatNoOwnedTokenFound') : i18n('GURPS.chatMultipleOwnedFound')
    ui.notifications.warn(msg)
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
      if (i18n(s.name).match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
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
    let actor = token?.actor || game.actors?.get(token?.document.actorId)
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
      this.prnt(
        `${i18n(actionText)} <i>${effect.id}:'${i18n(effect.label)}'</i> ${i18n('GURPS.for')} ${actor.displayname}`
      )
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
        if (actorEffect.statuses.has(effect.id)) {
          await this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
        }

        // if (effect.id == actorEffect.getFlag('core', 'statusId')) {
        //   await this.toggleTokenEffect(token, effect, 'GURPS.chatToggling')
        // }
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
    for (const status of Object.values(CONFIG.statusEffects)) if (actorEffect.statuses.has(status.id)) return status
    // if (status.id == actorEffect.getFlag('core', 'statusId')) return status

    return null
  }
}

// ---------------
