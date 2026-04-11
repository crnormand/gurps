import { DataModel } from '@gurps-types/foundry/index.js'
import { INameableFiller } from '@module/data/mixins/nameable.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'

import { TypedPseudoDocument } from '../pseudo-document/typed-pseudo-document.js'

import { FeatureType } from './types.js'

/* ---------------------------------------- */

class BaseFeature<Schema extends BaseFeature.Schema = BaseFeature.Schema>
  extends TypedPseudoDocument<'Feature', Schema, DataModel.Any>
  implements INameableFiller
{
  static override defineSchema(): BaseFeature.Schema {
    return Object.assign(super.defineSchema(), baseFeatureSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'Feature'> {
    return foundry.utils.mergeObject(super.metadata, {
      documentName: 'Feature',
      label: 'DOCUMENT.Feature',
    })
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return super.TYPE as FeatureType
  }

  /* ---------------------------------------- */

  get item(): Item.Implementation | null {
    const doc = this.document

    if (doc instanceof Item) return doc

    return null
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.item?.actor || null
  }

  // NOTE: STUB
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {}
}

/* ---------------------------------------- */

const baseFeatureSchema = () => {
  return {}
}

/* ---------------------------------------- */

namespace BaseFeature {
  export type Schema = TypedPseudoDocument.Schema & ReturnType<typeof baseFeatureSchema>
}

/* ---------------------------------------- */

export { BaseFeature, baseFeatureSchema }
