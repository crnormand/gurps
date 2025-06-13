import { BaseItemData, ItemComponent, ItemComponentSchema } from './base.js'
import fields = foundry.data.fields

class MeleeAttackData extends BaseItemData<MeleeAttackSchema> {
  static override defineSchema(): MeleeAttackSchema {
    return {
      ...super.defineSchema(),
      ...meleeAttackSchema,
    }
  }

  /* ---------------------------------------- */

  get component(): MeleeAttackComponent {
    return this.mel
  }
}

/* ---------------------------------------- */

class MeleeAttackComponent extends ItemComponent<MeleeAttackComponentSchema> {
  static override defineSchema(): MeleeAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...meleeAttackComponentSchema,
    }
  }
}

/* ---------------------------------------- */

const meleeAttackSchema = {
  mel: new fields.EmbeddedDataField(MeleeAttackComponent, { required: true, nullable: false }),
}

type MeleeAttackSchema = typeof meleeAttackSchema

/* ---------------------------------------- */

const meleeAttackComponentSchema = {
  import: new fields.StringField({ required: true, nullable: false }),
  damage: new fields.StringField({ required: true, nullable: false }),
  st: new fields.StringField({ required: true, nullable: false }),
  mode: new fields.StringField({ required: true, nullable: false }),
  level: new fields.NumberField({ required: true, nullable: false }),
  weight: new fields.NumberField({ required: true, nullable: false }),
  techlevel: new fields.NumberField({ required: true, nullable: false }),
  cast: new fields.StringField({ required: true, nullable: false }),
  reach: new fields.StringField({ required: true, nullable: false }),
  parry: new fields.StringField({ required: true, nullable: false }),
  baseParryPenalty: new fields.NumberField({ required: true, nullable: false }),
  block: new fields.StringField({ required: true, nullable: false }),
  otf: new fields.StringField({ required: true, nullable: false }),
  modifierTags: new fields.StringField({ required: true, nullable: false }),
  extraAttacks: new fields.NumberField({ required: true, nullable: false }),
  consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),
}

type MeleeAttackComponentSchema = ItemComponentSchema & typeof meleeAttackComponentSchema

/* ---------------------------------------- */

export { MeleeAttackData, type MeleeAttackSchema }
