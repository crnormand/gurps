import { fields } from '@gurps-types/foundry/index.js'
import { ItemComponent, ItemComponentSchema } from '@module/item/data/component.js'

const baseAttackComponentSchema = () => {
  return {
    // NOTE: change from previous schema where this was a string
    import: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // NOTE: Damage is an Array of strings to allow for multiple damage types dealing damage in one
    // attack, such as "2d-1cut and 1d+2 ctrl". Most of the time, this array has only one element.
    damage: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
      initial: [],
    }),
    st: new fields.StringField({ required: true, nullable: false }),
    mode: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
    cost: new fields.StringField({ required: true, nullable: false }),
    otf: new fields.StringField({ required: true, nullable: false }),
    itemModifiers: new fields.StringField({ required: true, nullable: false }),
    modifierTags: new fields.StringField({ required: true, nullable: false }),
    extraAttacks: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),
  }
}

type BaseAttackComponentSchema = ItemComponentSchema & ReturnType<typeof baseAttackComponentSchema>

/* ---------------------------------------- */

class BaseAttackComponent<
  Schema extends BaseAttackComponentSchema = BaseAttackComponentSchema,
> extends ItemComponent<Schema> {
  declare name: string
  declare otf: string
  declare import: number
  static override defineSchema(): BaseAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...baseAttackComponentSchema(),
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

export { BaseAttackComponent, type BaseAttackComponentSchema, baseAttackComponentSchema }
