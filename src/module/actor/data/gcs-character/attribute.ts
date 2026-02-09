import { fields, DataModel } from '../../../types/foundry/index.ts'

import { AttributeType, GcsAttributeDefinition } from './attribute-definition.ts'
import { type GcsCharacterModel } from './gcs-character.ts'

/* ---------------------------------------- */

class GcsAttribute extends DataModel<GcsAttributeSchema, GcsCharacterModel> {
  private _definition: GcsAttributeDefinition | null = null

  /* ---------------------------------------- */

  static override defineSchema(): GcsAttributeSchema {
    return gcsAttributeSchema()
  }

  /* ---------------------------------------- */

  static setFromDefinitions(
    defs:
      | Record<string, GcsAttributeDefinition>
      | Record<string, DataModel.CreateData<DataModel.SchemaOf<GcsAttributeDefinition>>>
  ): Record<string, DataModel.CreateData<DataModel.SchemaOf<GcsAttribute>>> {
    return Object.fromEntries(
      Object.values(defs).map(def => {
        const attribute = this.fromDefinition(def)

        return [attribute._id, attribute]
      })
    )
  }

  /* ---------------------------------------- */

  static fromDefinition(
    def: GcsAttributeDefinition | DataModel.CreateData<DataModel.SchemaOf<GcsAttributeDefinition>>
  ): DataModel.CreateData<DataModel.SchemaOf<GcsAttribute>> {
    const data: DataModel.CreateData<DataModel.SchemaOf<GcsAttribute>> = {
      _id: def._id,
      id: def.id,
      adj: 0,
      damage: null,
    }

    if (def.type === AttributeType.Pool || def.type === AttributeType.PoolRef) data.damage = 0

    return data
  }

  /* ---------------------------------------- */

  protected override _initialize(options?: DataModel.InitializeOptions | undefined): void {
    super._initialize(options)
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter')) {
      console.error('GcsAttribute: No Actor provided or invalid Actor type.')

      return
    }
  }

  /* ---------------------------------------- */

  get definition(): GcsAttributeDefinition | null {
    if (this._definition) return this._definition

    const definition = this.actor?.system?.settings?._attributes?.[this._id]

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

    const max = this.max

    if (!this._definition.isPool) return max

    return max - (this.damage || 0)
  }
}

const gcsAttributeSchema = () => {
  return {
    _id: new fields.StringField({ required: true, nullable: false }),
    id: new fields.StringField({ required: true, nullable: false }),
    adj: new fields.NumberField({ required: true, nullable: false }),
    damage: new fields.NumberField({ required: true, nullable: true }),
  }
}

type GcsAttributeSchema = ReturnType<typeof gcsAttributeSchema>

/* ---------------------------------------- */

export { GcsAttribute }
