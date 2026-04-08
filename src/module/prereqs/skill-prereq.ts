import { fields } from '@gurps-types/foundry/index.js'
import { ActorType } from '@module/actor/types.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'
import type { GcsSkillModel } from '@module/item/data/gcs-skill.js'
import { ItemType } from '@module/item/types.js'

import { BasePrereq } from './base-prereq.js'
import { PrereqType } from './types.js'

class SkillPrereq extends BasePrereq<SkillPrereqSchema> {
  static override defineSchema(): SkillPrereqSchema {
    return Object.assign(super.defineSchema(), skillPrereqSchema())
  }
  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Skill
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const actor = this.actor

    if (!actor || !actor.isOfType(ActorType.GcsCharacter))
      throw new Error('SkillPrereq: No Actor provided or invalid Actor type.')

    const hasSkill = actor.items.some(item => {
      if (!item.isOfType(ItemType.GcsSkill)) return false
      if (!this.name.matches(item.name)) return false
      if (!this.level.matches((item.system as GcsSkillModel).level)) return false

      return this.specialization.matches((item.system as GcsSkillModel).specialization)
    })

    return this.has ? hasSkill : !hasSkill
  }

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    INameable.extract.call(this, this.name.qualifier ?? '', map, existing)
    INameable.extract.call(this, this.specialization.qualifier ?? '', map, existing)
  }
}

/* ---------------------------------------- */

const skillPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    level: new NumberCriteriaField({ required: true, nullable: false }),
    specialization: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type SkillPrereqSchema = BasePrereq.Schema & ReturnType<typeof skillPrereqSchema>

/* ---------------------------------------- */

export { SkillPrereq }
