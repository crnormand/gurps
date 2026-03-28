import { INameableFiller } from '@module/data/mixins/nameable.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'

import { IFeatures } from '../data/mixins/features.js'
import { GcsBaseItemModel } from '../item/data/gcs-base.js'
import { TypedPseudoDocument } from '../pseudo-document/typed-pseudo-document.js'

import { FeatureType } from './types.js'

/* ---------------------------------------- */

class BaseFeature<Schema extends BaseFeature.Schema>
  extends TypedPseudoDocument<'Feature', Schema, GcsBaseItemModel & IFeatures>
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
    return this.parent?.item || null
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent?.actor || null
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
