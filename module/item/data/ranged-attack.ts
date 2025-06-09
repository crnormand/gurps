import { BaseItemData, ItemComponent, ItemComponentSchema } from './base.js'
import fields = foundry.data.fields

class RangedAttackData extends BaseItemData<RangedAttackSchema> {
  static override defineSchema(): RangedAttackSchema {
    return {
      ...super.defineSchema(),
      ...rangedAttackSchema,
    }
  }

  /* ---------------------------------------- */

  get component(): RangedAttackComponent {
    return this.rng
  }
}

/* ---------------------------------------- */

class RangedAttackComponent extends ItemComponent<RangedAttackComponentSchema> {
  static override defineSchema(): RangedAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...rangedAttackComponentSchema,
    }
  }
}

/* ---------------------------------------- */

const rangedAttackSchema = {
  rng: new fields.EmbeddedDataField(RangedAttackComponent, { required: true, nullable: false }),
}

type RangedAttackSchema = typeof rangedAttackSchema

/* ---------------------------------------- */

const rangedAttackComponentSchema = {
  import: new fields.StringField({ required: true, nullable: false }),
  damage: new fields.StringField({ required: true, nullable: false }),
  st: new fields.StringField({ required: true, nullable: false }),
  mode: new fields.StringField({ required: true, nullable: false }),
  level: new fields.NumberField({ required: true, nullable: false }),
  bulk: new fields.StringField({ required: true, nullable: false }),
  legalityclass: new fields.StringField({ required: true, nullable: false }),
  ammo: new fields.StringField({ required: true, nullable: false }),
  acc: new fields.StringField({ required: true, nullable: false }),
  range: new fields.StringField({ required: true, nullable: false }),
  shots: new fields.StringField({ required: true, nullable: false }),
  rcl: new fields.StringField({ required: true, nullable: false }),
  halfd: new fields.StringField({ required: true, nullable: false }),
  max: new fields.StringField({ required: true, nullable: false }),
  otf: new fields.StringField({ required: true, nullable: false }),
  modifierTags: new fields.StringField({ required: true, nullable: false }),
  extraAttacks: new fields.NumberField({ required: true, nullable: false }),
  consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),
}

type RangedAttackComponentSchema = ItemComponentSchema & typeof rangedAttackComponentSchema

/* ---------------------------------------- */

export { RangedAttackData, type RangedAttackSchema }
