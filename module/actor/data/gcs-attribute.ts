import { fields, DataModel } from '../../types/foundry/index.ts'

import { GcsAttributeDefinition } from './gcs-attribute-definition.ts'
import { type GcsCharacterModel } from './gcs-character.ts'

class GcsAttribute extends DataModel<GcsAttributeSchema, GcsCharacterModel> {
  #definition: GcsAttributeDefinition | null = null

  /* ---------------------------------------- */

  static override defineSchema(): GcsAttributeSchema {
    return gcsAttributeSchema()
  }

  /* ---------------------------------------- */

  protected override _initialize(options?: DataModel.InitializeOptions | undefined): void {
    super._initialize(options)
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter')) {
      console.error('GcsAttribute: No Actor provided or invalid Actor type.')

      return
    }

    this.#definition = actor?.system.attributeDefinitions.get(this.id) || null
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent?.parent || null
  }

  /* ---------------------------------------- */

  get max(): number {
    if (!this.#definition) return 0

    return this.#definition.base + this.adj
  }

  /* ---------------------------------------- */

  get current(): number {
    if (!this.#definition) return 0

    return this.#definition.base + this.adj - this.damage
  }
}

const gcsAttributeSchema = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    adj: new fields.NumberField({ required: true, nullable: false }),
    damage: new fields.NumberField({ required: true, nullable: true }),
  }
}

type GcsAttributeSchema = ReturnType<typeof gcsAttributeSchema>

/* ---------------------------------------- */

export { GcsAttribute }
