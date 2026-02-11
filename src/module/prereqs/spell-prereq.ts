import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.js'
import { SpellPrereqSubType } from './types.js'

class SpellPrereq extends BasePrereq<SpellPrereqSchema> {
  static override defineSchema(): SpellPrereqSchema {
    return Object.assign(super.defineSchema(), spellPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Spell
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter'))
      throw new Error('SpellPrereq: No Actor provided or invalid Actor type.')

    let matchCount: number

    const spells = actor.itemTypes['gcsSpell'].filter(item => !item.system.isContainer)

    switch (this.subType) {
      case SpellPrereqSubType.Any:
        matchCount = spells.length
        break
      case SpellPrereqSubType.Name:
        matchCount = spells.filter(spell => this.qualifier.matches(spell.name)).length
        break
      case SpellPrereqSubType.Tag:
        matchCount = spells.filter(spell => this.qualifier.matches(spell.system.tags)).length
        break
      case SpellPrereqSubType.College:
        matchCount = spells.filter(spell => this.qualifier.matches(spell.system.college)).length
        break
      case SpellPrereqSubType.CollegeCount: {
        const colleges = new Set<string>()

        for (const spell of spells) spell.system.college.forEach(colleges.add, colleges)
        matchCount = colleges.size
        break
      }

      default:
        matchCount = 0
    }

    const matches = this.quantity.matches(matchCount)

    return this.has ? matches : !matches
  }

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    if (
      this.subType === SpellPrereqSubType.Name ||
      this.subType === SpellPrereqSubType.Tag ||
      this.subType === SpellPrereqSubType.College
    ) {
      INameable.extract.call(this, this.qualifier.qualifier ?? '', map, existing)
    }
  }
}

/* ---------------------------------------- */

const spellPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    subType: new fields.StringField({
      required: false,
      nullable: true,
      choices: Object.values(SpellPrereqSubType),
      initial: SpellPrereqSubType.Name,
    }),
    qualifier: new StringCriteriaField({ required: true, nullable: false }),
    quantity: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type SpellPrereqSchema = BasePrereqSchema & ReturnType<typeof spellPrereqSchema>

/* ---------------------------------------- */

export { SpellPrereq }
