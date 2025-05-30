'use strict'

export default class GurpsActiveEffect extends ActiveEffect {
  static init() {
    CONFIG.ActiveEffect.documentClass = GurpsActiveEffect

    // Hooks.on('preCreateActiveEffect', GurpsActiveEffect._preCreate)
    // Hooks.on('createActiveEffect', GurpsActiveEffect._create)
    Hooks.on('applyActiveEffect', GurpsActiveEffect._apply)
    Hooks.on('updateActiveEffect', GurpsActiveEffect._update)
    Hooks.on('deleteActiveEffect', GurpsActiveEffect._delete)
    Hooks.on('updateCombat', GurpsActiveEffect._updateCombat)
  }

  /**
   * On Actor.applyEffect: Applies only to changes that have mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM.
   * @param {Actor|Item} actor
   * @param {ChangeData} change - the change to apply
   * @param {*} _options
   * @param {*} _user
   */
  static _apply(actor, change, _options, _user) {
    if (change.key === 'system.conditions.maneuver') actor.replaceManeuver(change.value)
    else if (change.key === 'system.conditions.posture') actor.replacePosture(change)
  }

  /**
   * When updating an ActiveEffect.
   * @param {ActiveEffect} _effect
   * @param {ActiveEffectData} _data to use to update the effect.
   * @param {*} _options
   * @param {*} _userId
   */
  static _update(_effect, _data, _options, _userId) {
    if (canvas.tokens.controlled.length > 0) {
      canvas.tokens.controlled[0].document.setFlag('gurps', 'lastUpdate', new Date().getTime().toString())
    }
  }

  get allUserModKeys() {
    return ['system.conditions.usermods', 'system.conditions.self.modifiers', 'system.conditions.target.modifiers']
  }

  /**
   * Add origin tag to ActiveEffect which affects user mods.
   *
   * Foundry will add/remove automatically the modifiers added in the Actor User Mods array.
   * If we do not correctly identify the effect, it will be duplicated on the usermods list.
   * This method adds an origin tag to the effect, so we can identify it later.
   *
   * @param changed - changed fields on the ActiveEffect
   * @param options
   * @param user
   * @returns {Promise<boolean|*|undefined>}
   * @private
   */
  async _preUpdate(changed, options, user) {
    const effectIdTag = `@eft:${this._id}`
    changed.changes?.map(effect => {
      if (this.allUserModKeys.includes(effect.key) && !effect.value.includes(effectIdTag)) {
        // If exists a bad reference on the line, like `@bad-dog123`, let's remove it first
        const badRefRegex = /@\S+/g
        effect.value = effect.value.replace(badRefRegex, '')
        effect.value = `${effect.value} ${effectIdTag}`
      }
    })
    return await super._preUpdate(changed, options, user)
  }

  /**
   * When deleting an ActiveEffect.
   * @param {ActiveEffect} _effect
   * @param {ActiveEffectData} _data
   * @param {*} _userId
   */
  static _delete(_effect, _data, _userId) {
    // If ADD is opened for this actor, update the token effect buttons
    const buttonAddClass = `fa-plus-circle`
    const buttonAddedClass = `fa-check-circle`
    for (const status of _effect._source.statuses) {
      const selector = `span.${status}[data-actor="${_data.parent._id}"]`
      const spans = $(selector)
      for (const span of spans) {
        $(span).removeClass(`${buttonAddedClass} green`).addClass(`${buttonAddClass} black`)
        $(span).attr('title', game.i18n.localize(`GURPS.add${status}Effect`))
      }
    }
  }

  /**
   * Called whenever updating a Combat.
   * @param {Combat} combat
   * @param {CombatData} _data
   * @param {*} _options
   * @param {*} _userId
   */
  static async _updateCombat(combat, _data, _options, _userId) {
    let previous = combat.previous
    if (previous.tokenId) {
      let token = canvas.tokens?.get(previous.tokenId)
    }
  }

  /**
   * @param {ActiveEffectData} data
   * @param {any} context
   */
  constructor(data, context) {
    super(data, context)

    this.context = context
    this.chatmessages = []
  }

  /** @inheritDoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId)

    if (game.users.get(userId).isSelf) {
      if (!this.getFlag('gurps', 'duration')) this.setFlag('gurps', 'duration', { delaySeconds: null })
    }

    // If ADD is opened for this actor, update the token effect buttons
    const buttonAddClass = `fa-plus-circle`
    const buttonAddedClass = `fa-check-circle`
    for (const status of data.statuses) {
      const selector = `span.${status}[data-actor="${this.parent._id}"]`
      const spans = $(selector)
      for (const span of spans) {
        $(span).removeClass(`${buttonAddClass} black`).addClass(`${buttonAddedClass} green`)
        $(span).attr('title', game.i18n.localize(`GURPS.remove${status}Effect`))
      }
    }
  }

  get endCondition() {
    return this.getFlag('gurps', 'endCondition')
  }

  set endCondition(otf) {
    this.setFlag('gurps', 'endCondition', otf)
    if (!!otf) {
      // TODO Monitor this -- ActiveEffect.flags.core.status is deprecated
      this.setFlag('core', 'statusId', `${this.name}-endCondition`)
    }
  }

  get isManeuver() {
    return this.getFlag('gurps', 'statusId') === 'maneuver'
  }

  get terminateActions() {
    let data = this.getFlag('gurps', 'terminateActions')
    return data ?? []
  }

  /**
   * @param {ActiveEffect} effect
   */
  static getName(effect) {
    return /** @type {string} */ (effect.getFlag('gurps', 'name'))
  }

  static async clearEffectsOnSelectedToken() {
    const effect = _token.actor.effects.contents
    for (let i = 0; i < effect.length; i++) {
      let condition = effect[i].name
      let status = effect[i].disabled
      let effect_id = effect[i]._id
      console.debug(`Clear Effect: condition: [${condition}] status: [${status}] effect_id: [${effect_id}]`)
      if (status === false) {
        await _token.actor.deleteEmbeddedDocuments('ActiveEffect', [effect_id])
      }
    }
  }

  chat(actor, value) {
    if (!!value?.frequency && value.frequency === 'once') {
      if (this.chatmessages.includes(value.msg)) {
        console.debug(`Message [${value.msg}] already displayed, do nothing`)
        return
      }
    }

    for (const key in value.args) {
      let val = value.args[key]
      if (foundry.utils.getType(val) === 'string' && val.startsWith('@')) {
        value.args[key] = actor[val.slice(1)]
      } else if (foundry.utils.getType(val) === 'string' && val.startsWith('!')) {
        value.args[key] = game.i18n.localize(val.slice(1))
      }
      if (key === 'pdfref') value.args.pdfref = game.i18n.localize(val)
    }

    let msg = !!value.args ? game.i18n.format(value.msg, value.args) : game.i18n.localize(value.msg)

    let self = this
    renderTemplate('systems/gurps/templates/chat-processing.hbs', { lines: [msg] }).then(content => {
      let users = actor.getOwners()
      let ids = users?.map(it => it.id)

      let messageData = {
        content: content,
        whisper: ids || null,
      }
      ChatMessage.create(messageData)
      ui.combat?.render()
      self.chatmessages.push(value.msg)
    })
  }

  updateDuration() {
    const value = super.updateDuration()
    if (this.name === 'New Effect') console.log('effective duration', this.id, value)
    return value
  }

  // TODO Monitor this -- ActiveEffect.flags.core.status is deprecated
  // TODO Any ActiveEffect with a status.core.statusId is by default a temporary effect and will be added as an icon to the token.

  async isExpired() {
    if (this.name === 'New Effect') console.log('duration', this.duration)
    if (this.duration && !!this.duration.duration) {
      if (this.duration.remaining <= 1) {
        return true
      }
    }

    return false
  }
}
