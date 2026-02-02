import { fields } from '../../types/foundry/index.js'
import { NumberCriteriaField } from '../criteria/number-criteria.ts'

import { BasePrereq, basePrereqSchema, PrereqType } from './base-prereq.ts'

class PrereqList extends BasePrereq<PrereqListSchema> {
  static override defineSchema(): PrereqListSchema {
    return prereqListSchema()
  }

  /* ---------------------------------------- */

  get children(): BasePrereq<any>[] {
    return this.parent?.prereqs.filter(e => e.containerId === this.id) ?? []
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
    ...basePrereqSchema({ type: PrereqType.List }),
    all: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    whenTl: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type PrereqListSchema = ReturnType<typeof prereqListSchema>

/* ---------------------------------------- */

export { PrereqList }
