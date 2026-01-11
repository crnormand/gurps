import { AnyObject } from 'fvtt-types/utils'

import { parselink } from '../../../lib/parselink.js'
import { makeRegexPatternFrom } from '../../../lib/utilities.js'
import { fields } from '../../types/foundry/index.js'

import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'
import { ItemComponent, ItemComponentSchema } from './component.js'

class SkillModel extends BaseItemModel<SkillSchema> {
  static override defineSchema(): SkillSchema {
    return {
      ...super.defineSchema(),
      ...skillSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return {
      embedded: {},
      type: 'skillV2',
      invalidActorTypes: [],
      actions: {
        // level: this.#rollLevel,
      },
      childTypes: ['skillV2'],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */

  get component(): SkillComponent {
    return this.ski
  }

  /* ---------------------------------------- */

  // static async #rollLevel(this: SkillModel, options: ItemUseOptions): Promise<void> {
  //   const target = this.component.level
  //   const modifiers: GurpsBaseRoll.RollModifier[] = GURPS.ModifierBucket.modifierStack.modifierList.map((mod: any) => {
  //     return {
  //       comment: mod.desc,
  //       value: mod.modint,
  //     }
  //   })
  //   const actorId = this.actor?.id
  //   const itemId = this.parent.id
  //
  //   console.log(target, modifiers, actorId, itemId)
  //
  //   const roll = new SuccessRoll('3d6', { target, modifiers, actorId, itemId })
  //   await roll.toMessage()
  // }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()
    this.#prepareLevelsFromOtf()
  }

  /* ---------------------------------------- */

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

  // TODO: Replace AnyObject with a more specific type
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

const skillSchema = () => {
  return {
    ski: new fields.EmbeddedDataField(SkillComponent, { required: true, nullable: false }),
  }
}

type SkillSchema = BaseItemModelSchema & ReturnType<typeof skillSchema>

/* ---------------------------------------- */

class SkillComponent extends ItemComponent<SkillComponentSchema> {
  static override defineSchema(): SkillComponentSchema {
    return {
      ...super.defineSchema(),
      ...skillComponentSchema(),
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

const skillComponentSchema = () => {
  return {
    points: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: change from previous schema where this was a string
    import: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: no longer persistent data, always derived from import value
    // level: new fields.NumberField({ required: true, nullable: false }),
    type: new fields.StringField({ required: true, nullable: false }),
    relativelevel: new fields.StringField({ required: true, nullable: false }),
    otf: new fields.StringField({ required: true, nullable: false }),
    specialization: new fields.StringField({ required: true, nullable: true, initial: null }),
    techlevel: new fields.StringField({ required: true, nullable: true, initial: null }),
  }
}

type SkillComponentSchema = ItemComponentSchema & ReturnType<typeof skillComponentSchema>

/* ---------------------------------------- */

export { SkillModel, type SkillSchema, type SkillComponentSchema, SkillComponent }
