import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { AnyObject } from 'fvtt-types/utils'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.js'

class PrereqList extends BasePrereq<PrereqListSchema> {
  children: BasePrereq<any>[] = []

  /* ---------------------------------------- */

  static override defineSchema(): PrereqListSchema {
    return Object.assign(super.defineSchema(), prereqListSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.List
  }

  /* ---------------------------------------- */

  override prepareBaseData(): void {
    this.children = this.parent?._prereqs?.filter(prereq => prereq.containerId === this._id) ?? []
  }

  /* ---------------------------------------- */

  /**
   * Create a child directly under this prereq list.
   * @param type The type of prereq to create.
   * @param data Additional data to set on the prereq.
   * @returns The Prereq ModelCollection instance
   */
  async createChild({ type, ...data }: { type: PrereqType } & AnyObject) {
    return BasePrereq.create(
      // @ts-expect-error - We know this is correct, but the type system doesn't
      { _id: foundry.utils.randomID(), type, containerId: this._id, ...data },
      { parent: this.item }
    )
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
