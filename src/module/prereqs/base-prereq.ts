import { fields } from '@gurps-types/foundry/index.js'
import { INameableFiller } from '@module/data/mixins/nameable.js'

import { IPrereqs } from '../data/mixins/prereqs.js'
import { GcsBaseItemModel } from '../item/data/gcs-base.js'
import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '../pseudo-document/typed-pseudo-document.js'

/* ---------------------------------------- */

class BasePrereq<Schema extends BasePrereq.Schema>
  extends TypedPseudoDocument<'Prereq', Schema, GcsBaseItemModel & IPrereqs>
  implements INameableFiller
{
  static override defineSchema(): BasePrereq.Schema {
    return Object.assign(super.defineSchema(), basePrereqSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'Prereq'> {
    return {
      documentName: 'Prereq',
      label: 'DOCUMENT.Prereq',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  get item(): Item.Implementation | null {
    return this.parent?.item || null
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent?.actor || null
  }

  /* ---------------------------------------- */

  get isSatisfied(): boolean {
    throw new Error(
      'Method "isSatisfied" is not implemented in the base class BasePrereq. It must be overridden in subclasses.'
    )
  }

  /* ---------------------------------------- */

  get unsatisfiedMessage(): string {
    throw new Error(
      'Method "unsatisfiedMessage" is not implemented in the base class BasePrereq. It must be overridden in subclasses.'
    )
  }

  /* ---------------------------------------- */

  // NOTE: STUB
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {}
}

/* ---------------------------------------- */

const basePrereqSchema = () => {
  return {
    containerId: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
  }
}

namespace BasePrereq {
  export type Schema = TypedPseudoDocument.Schema & ReturnType<typeof basePrereqSchema>
}

/* ---------------------------------------- */

export { BasePrereq, basePrereqSchema }
