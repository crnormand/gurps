// @ts-nocheck: TODO: Fix typescript errors later

export default class GurpsActiveEffect extends ActiveEffect {
  /**
   * On Actor.applyEffect: Applies only to changes that have mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM.
   */
  static _apply(
    actor: Actor.Implementation | Actor.Implementation,
    change: any,
    _options: any,
    _user: User.Implementation
  ) {
    if (change.key === 'system.conditions.maneuver') actor.replaceManeuver(change.value)
    else if (change.key === 'system.conditions.posture') actor.replacePosture(change)
  }

  chatmessages: string[] = []

  get allUserModKeys() {
    return ['system.conditions.usermods', 'system.conditions.self.modifiers', 'system.conditions.target.modifiers']
  }

  /**
   * Add origin tag to ActiveEffect which affects user mods.
   *
   * Foundry will add/remove automatically the modifiers added in the Actor User Mods array.
   * If we do not correctly identify the effect, it will be duplicated on the usermods list.
   * This method adds an origin tag to the effect, so we can identify it later.
   */
  protected override async _preUpdate(
    changed: ActiveEffect.UpdateData,
    options: ActiveEffect.Database.PreUpdateOptions,
    user: User.Implementation
  ): Promise<boolean | void> {
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

  protected override _onDelete(options: ActiveEffect.Database.OnDeleteOperation, userId: string): void {
    // If ADD is opened for this actor, update the token effect buttons
    const buttonAddClass = `fa-plus-circle`
    const buttonAddedClass = `fa-check-circle`
    for (const status of this._source.statuses) {
      const selector = `span.${status}[data-actor="${this.parent._id}"]`
      const spans = $(selector)
      for (const span of spans) {
        $(span).removeClass(`${buttonAddedClass} green`).addClass(`${buttonAddClass} black`)
        $(span).attr('title', game.i18n?.localize(`GURPS.add${status}Effect`) ?? '')
      }
    }

    super._onDelete(options, userId)
  }

  override _onCreate(data: ActiveEffect.CreateData, options: ActiveEffect.Database.OnCreateOperation, userId: string) {
    super._onCreate(data, options, userId)

    if (game?.users?.get(userId).isSelf) {
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

  static getName(effect: ActiveEffect.Implementation): string {
    return effect.getFlag('gurps', 'name')
  }

  static async clearEffectsOnSelectedToken() {
    const effect = GURPS.LastActor.effects.contents
    for (let i = 0; i < effect.length; i++) {
      let condition = effect[i].name
      let status = effect[i].disabled
      let effect_id = effect[i]._id
      console.debug(`Clear Effect: condition: [${condition}] status: [${status}] effect_id: [${effect_id}]`)
      if (status === false) {
        await GURPS.LastActor.deleteEmbeddedDocuments('ActiveEffect', [effect_id])
      }
    }
  }

  chat(actor: Actor.Implementation, value: any) {
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
    foundry.applications.handlebars
      .renderTemplate('systems/gurps/templates/chat-processing.hbs', { lines: [msg] })
      .then(content => {
        let users = actor.owners
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

  override updateDuration() {
    const value = super.updateDuration()
    if (this.name === 'New Effect') console.log('effective duration', this.id, value)
    return value
  }
}

/* ---------------------------------------- */

export { GurpsActiveEffect }
