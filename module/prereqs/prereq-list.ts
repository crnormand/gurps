import { NumberCriteriaField } from '../data/criteria/number-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class PrereqList extends BasePrereq<PrereqListSchema> {
  static override defineSchema(): PrereqListSchema {
    return Object.assign(super.defineSchema(), prereqListSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.List
  }

  /* ---------------------------------------- */

  get children(): BasePrereq<any>[] {
    return Object.values(this.parent?.prereqs).filter(e => e.containerId === this._id) ?? []
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    if (this.all) {
      return this.children.every(prereq => prereq.isSatisfied)
    }

    return this.children.some(prereq => prereq.isSatisfied)
  }
}

/* ---------------------------------------- */

const prereqListSchema = () => {
  return {
    all: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    whenTl: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type PrereqListSchema = BasePrereqSchema & ReturnType<typeof prereqListSchema>

/* ---------------------------------------- */

export { PrereqList }
