import { fields } from '../../types/foundry/index.js'

import { BasePrereq, basePrereqSchema, PrereqType } from './base-prereq.ts'

class ScriptPrereq extends BasePrereq<ScriptPrereqSchema> {
  static override defineSchema(): ScriptPrereqSchema {
    return scriptPrereqSchema()
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter')) {
      console.error('ScriptPrereq: No Actor provided or invalid Actor type.')

      return false
    }

    // NOTE: temporary
    return true
  }
}

/* ---------------------------------------- */

const scriptPrereqSchema = () => {
  return {
    ...basePrereqSchema({ type: PrereqType.Script }),
    script: new fields.JavaScriptField({ required: true, nullable: false }),
  }
}

type ScriptPrereqSchema = ReturnType<typeof scriptPrereqSchema>

/* ---------------------------------------- */

export { ScriptPrereq }
