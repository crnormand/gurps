import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'
import { ItemComponent, ItemComponentSchema } from './component.js'
import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'
import { makeRegexPatternFrom } from '../../../lib/utilities.js'
import { parselink } from '../../../lib/parselink.js'

class SpellModel extends BaseItemModel<SpellSchema> {
  static override defineSchema(): SpellSchema {
    return {
      ...super.defineSchema(),
      ...spellSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return {
      embedded: {},
      type: 'spell',
      invalidActorTypes: [],
      actions: {},
      childTypes: ['spell'],
      modifierTypes: [],
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
    this.#prepareLevelsFromOtf()
  }

  /**
   * Prepare the level of this skill based on an OTF formula.
   */
  #prepareLevelsFromOtf(): void {
    let otf = this.component.otf
    if (otf === '') {
      this.component.level = this.component.import
      return
    }

    // Remove extraneous brackets
    otf = otf.match(/^\s*\[(.*)\]\s*$/)?.[1].trim() ?? otf

    // If the OTF is just a number, Set the level directly
    if (otf.match(/^\d+$/)) {
      this.component.import = parseInt(otf)
      this.component.level = this.component.import
      return
    }

    // If the OTF is not a number, parse it using the OTF parser.
    const action = parselink(otf)
    // If the OTF does not return an action, we cannot set the level.
    if (!action.action) return

    action.action.calcOnly = true
    // TODO: verify that target is of type "number" (or replace this whole thing)
    GURPS.performAction(action.action, this.actor).then(
      (result: boolean | { target: number; thing: any } | undefined) => {
        if (result && typeof result === 'object') {
          this.component.level = result.target
        }
      }
    )
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
    super.applyBonuses(bonuses)

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
      ...spellComponentSchema(),
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

const spellSchema = () => {
  return {
    spl: new fields.EmbeddedDataField(SpellComponent, { required: true, nullable: false }),
  }
}

type SpellSchema = BaseItemModelSchema & ReturnType<typeof spellSchema>

/* ---------------------------------------- */

const spellComponentSchema = () => {
  return {
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
}

type SpellComponentSchema = ItemComponentSchema & ReturnType<typeof spellComponentSchema>

/* ---------------------------------------- */

export { SpellModel, type SpellSchema, type SpellComponentSchema }
