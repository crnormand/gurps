import { CommonItemData, CommonItemDataSchema, ItemComponent, ItemComponentSchema } from './base.js'
import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'
import { makeRegexPatternFrom } from '../../../lib/utilities.js'

class SkillData extends CommonItemData<SkillSchema> {
  static override defineSchema(): SkillSchema {
    return {
      ...super.defineSchema(),
      ...skillSchema,
    }
  }

  /* ---------------------------------------- */

  get component(): SkillComponent {
    return this.ski
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

class SkillComponent extends ItemComponent<SkillComponentSchema> {
  static override defineSchema(): SkillComponentSchema {
    return {
      ...super.defineSchema(),
      ...skillComponentSchema,
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

const skillSchema = {
  ski: new fields.EmbeddedDataField(SkillComponent, { required: true, nullable: false }),
}

type SkillSchema = CommonItemDataSchema & typeof skillSchema

/* ---------------------------------------- */

const skillComponentSchema = {
  points: new fields.NumberField({ required: true, nullable: false }),
  // NOTE: change from previous schema where this was a string
  import: new fields.NumberField({ required: true, nullable: false }),
  // NOTE: no longer persistent data, always derived from import value
  // level: new fields.NumberField({ required: true, nullable: false }),
  type: new fields.StringField({ required: true, nullable: false }),
  relativelevel: new fields.StringField({ required: true, nullable: false }),
  otf: new fields.StringField({ required: true, nullable: false }),
}

type SkillComponentSchema = ItemComponentSchema & typeof skillComponentSchema

/* ---------------------------------------- */

export { SkillData, type SkillSchema }
