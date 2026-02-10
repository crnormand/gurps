import { fields } from '@gurps-types/foundry/index.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class ScriptPrereq extends BasePrereq<ScriptPrereqSchema> {
  static override defineSchema(): ScriptPrereqSchema {
    return Object.assign(super.defineSchema(), scriptPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Script
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter')) {
      console.error('ScriptPrereq: No Actor provided or invalid Actor type.')

      return false
    }

    // NOTE: Placeholder
    return true
  }

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    INameable.extract.call(this, this.script, map, existing)
  }
}

/* ---------------------------------------- */

const scriptPrereqSchema = () => {
  return {
    script: new fields.JavaScriptField({ required: true, nullable: false }),
  }
}

type ScriptPrereqSchema = BasePrereqSchema & ReturnType<typeof scriptPrereqSchema>

/* ---------------------------------------- */

export { ScriptPrereq }
