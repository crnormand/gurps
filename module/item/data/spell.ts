import { CommonItemData, CommonItemDataSchema, ItemComponent, ItemComponentSchema } from './base.js'
import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'
import { makeRegexPatternFrom } from '../../../lib/utilities.js'

class SpellData extends CommonItemData<SpellSchema> {
  static override defineSchema(): SpellSchema {
    return {
      ...super.defineSchema(),
      ...spellSchema,
    }
  }

  /* ---------------------------------------- */

  get component(): SpellComponent {
    return this.spl
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()
    this.component.level = this.component.import
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
    for (const bonus of bonuses) {
      // Skills are affected by their base attribute changes
      if (bonus.type === 'attribute') {
        if (this.component.relativelevel.toUpperCase().startsWith((bonus.attrkey as string).toUpperCase())) {
          this.component.level += bonus.mod as number
        }
      }

      if (bonus.type === 'skill-spell' && bonus.isRanged) {
        if (this.component.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.component.level += bonus.mod as number
        }
      }
    }
  }
}

/* ---------------------------------------- */

class SpellComponent extends ItemComponent<SpellComponentSchema> {
  static override defineSchema(): SpellComponentSchema {
    return {
      ...super.defineSchema(),
      ...spellComponentSchema,
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

const spellSchema = {
  spl: new fields.EmbeddedDataField(SpellComponent, { required: true, nullable: false }),
}

type SpellSchema = CommonItemDataSchema & typeof spellSchema

/* ---------------------------------------- */

const spellComponentSchema = {
  points: new fields.NumberField({ required: true, nullable: false }),
  // NOTE: change from previous schema where this was a string
  import: new fields.NumberField({ required: true, nullable: false }),
  // NOTE: no longer persistent data, always derived from import value
  // level: new fields.NumberField({ required: true, nullable: false }),
  class: new fields.StringField({ required: true, nullable: false }),
  college: new fields.StringField({ required: true, nullable: false }),
  cost: new fields.StringField({ required: true, nullable: false }),
  maintain: new fields.StringField({ required: true, nullable: false }),
  duration: new fields.StringField({ required: true, nullable: false }),
  resist: new fields.StringField({ required: true, nullable: false }),
  casttime: new fields.StringField({ required: true, nullable: false }),
  difficulty: new fields.StringField({ required: true, nullable: false }),
  relativelevel: new fields.StringField({ required: true, nullable: false }),
  otf: new fields.StringField({ required: true, nullable: false }),
}

type SpellComponentSchema = ItemComponentSchema & typeof spellComponentSchema

/* ---------------------------------------- */

export { SpellData, type SpellSchema }
