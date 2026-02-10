import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

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

    if (!actor || !actor.isOfType('gcsCharacter'))
      throw new Error('SkillPrereq: No Actor provided or invalid Actor type.')

    const hasSkill = actor.items.some(item => {
      if (!item.isOfType('gcsSkill')) return false
      if (!this.name.matches(item.name)) return false
      if (!this.level.matches(item.system.level)) return false

      return this.specialization.matches(item.system.specialization)
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

type SkillPrereqSchema = BasePrereqSchema & ReturnType<typeof skillPrereqSchema>

/* ---------------------------------------- */

export { SkillPrereq }
