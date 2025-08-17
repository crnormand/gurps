// add type = 'characterV2' to ActorMetadata
type ActorMetadata = (typeof foundry.documents.BaseActor)['metadata'] & {
  type: 'characterV2'
}

class GurpsActorV2 extends Actor<Actor.SubType> {
  static override get metadata(): ActorMetadata {
    return {
      ...foundry.documents.BaseActor.metadata,
      type: 'characterV2',
    }
  }

  override async update(data: Actor.UpdateData, context: any): Promise<this> {
    console.log('GurpsActorV2.update', { data, context })

    this.#translateLegacyHitlocationData(data)

    // Call the parent class's update method
    await super.update(data, context)

    return this
  }

  #translateLegacyHitlocationData(data: Actor.UpdateData) {
    Object.keys(data)
      .filter(key => key.startsWith('system.hitlocations.'))
      .forEach(key => {
        // A key will be of the form "system.hitlocations.<index>.<field>". Map these to
        // "system.hitlocationsV2.<index>.<field>".
        const index = key.split('.')[2]
        let field = key.split('.').slice(3).join('.')
        let value = data[key as keyof typeof data]

        if (field === 'roll') field = 'rollText' // remap 'roll' to 'rollText'
        if (field === 'dr') field = '_dr' // remap 'dr' to '_dr'

        if (['import', 'penalty', '_dr', 'drMod', 'drItem', 'drCap'].includes(field)) {
          if (typeof value === 'string') {
            value = parseInt(value) || 0
          }
        }
        // @ts-expect-error
        data[`system.hitlocationsV2.${parseInt(index)}.${field}`] = value

        delete data[key as keyof typeof data]
      })
  }

  async internalUpdate(data: Actor.UpdateData, context: any): Promise<this> {
    console.log('GurpsActorV2.internalUpdate', { data, context })
    return await this.update(data, context)
  }

  /**
   * This method is called when "system.conditions.maneuver" changes on the actor (via the update method)
   * @param {string} maneuverText
   */
  async replaceManeuver(maneuverText: string) {
    let tokens = this._findTokens()
    for (const t of tokens) await t.setManeuver(maneuverText)
  }

  _findTokens(): Token.Implementation[] {
    if (this.isToken && this.token?.layer) {
      let token = this.token.object
      return token ? [token] : []
    }
    return this.getActiveTokens()
  }
}

export { GurpsActorV2 }
