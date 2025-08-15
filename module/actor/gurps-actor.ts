import { GurpsActor } from './actor.js'

// add type = 'characterV2' to ActorMetadata
type ActorMetadata = (typeof foundry.documents.BaseActor)['metadata'] & {
  type: 'characterV2'
}

class GurpsActorV2 extends GurpsActor {
  static override get metadata(): ActorMetadata {
    return {
      ...foundry.documents.BaseActor.metadata,
      type: 'characterV2',
    }
  }

  override async update(data: Partial<GurpsActorV2>, context: any): Promise<this> {
    console.log('GurpsActorV2.update', { data, context })

    this.#translateLegacyHitlocationData(data)

    // Call the parent class's update method
    await super.update(data, context)

    return this
  }

  #translateLegacyHitlocationData(data: Partial<GurpsActorV2>) {
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
}

export { GurpsActorV2 }
