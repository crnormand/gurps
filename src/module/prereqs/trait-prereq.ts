import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.js'

class TraitPrereq extends BasePrereq<TraitPrereqSchema> {
  static override defineSchema(): TraitPrereqSchema {
    return Object.assign(super.defineSchema(), traitPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Trait
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter'))
      throw new Error('TraitPrereq: No Actor provided or invalid Actor type.')

    const hasTrait = actor.items.some(item => {
      if (!item.isOfType('gcsTrait')) return false
      if (!this.name.matches(item.name)) return false
      if (!this.level.matches(item.system.currentLevel)) return false

      return this.notes.matches(item.system.localNotesWithReplacements)
    })

    return this.has ? hasTrait : !hasTrait
  }

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    INameable.extract.call(this, this.name.qualifier ?? '', map, existing)
    INameable.extract.call(this, this.notes.qualifier ?? '', map, existing)
  }
}

/* ---------------------------------------- */

const traitPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    level: new NumberCriteriaField({ required: true, nullable: false }),
    notes: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type TraitPrereqSchema = BasePrereqSchema & ReturnType<typeof traitPrereqSchema>

/* ---------------------------------------- */

export { TraitPrereq }
