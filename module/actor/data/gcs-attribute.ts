import { fields, DataModel } from '../../types/foundry/index.ts'

import { GcsAttributeDefinition } from './gcs-attribute-definition.ts'
import { type GcsCharacterModel } from './gcs-character.ts'

/* ---------------------------------------- */

class GcsAttribute extends DataModel<GcsAttributeSchema, GcsCharacterModel> {
  private _definition: GcsAttributeDefinition | null = null

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

    this._definition = actor?.system?.attributeDefinitions?.get(this.id) || null
  }

  /* ---------------------------------------- */

  get definition(): GcsAttributeDefinition | null {
    if (this._definition) return this._definition

    const definition = this.actor?.system?.settings?._attributes?.find(e => e.id === this.id)

    if (!definition) return null

    this._definition = definition

    return definition
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent?.parent || null
  }

  /* ---------------------------------------- */

  get bonus(): number {
    return 0
  }

  /* ---------------------------------------- */

  get max(): number {
    if (!this.definition || this.definition.isSeparator) return 0

    let maximum = this.definition.baseValue(this) + this.adj + this.bonus

    if (!this.definition.allowsDecimal) maximum = Math.floor(maximum)

    return maximum
  }

  /* ---------------------------------------- */

  get current(): number {
    if (!this._definition) return 0

    return 0
    // return this.#definition.base + this.adj - this.damage
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
