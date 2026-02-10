import { fields } from '@gurps-types/foundry/index.js'
import { INameableFiller } from '@module/data/mixins/nameable.js'

import { IFeatures } from '../data/mixins/features.js'
import { GcsBaseItemModel } from '../item/data/gcs-base.js'
import { PseudoDocumentMetadata } from '../pseudo-document/pseudo-document.js'
import { TypedPseudoDocument, TypedPseudoDocumentSchema } from '../pseudo-document/typed-pseudo-document.js'

import { FeatureType } from './types.js'

/* ---------------------------------------- */

class BaseFeature<Schema extends BaseFeatureSchema>
  extends TypedPseudoDocument<Schema, GcsBaseItemModel & IFeatures>
  implements INameableFiller
{
  static override defineSchema(): BaseFeatureSchema {
    return Object.assign(super.defineSchema(), baseFeatureSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'Feature',
      label: '',
      icon: '',
      embedded: {},
    }
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
  return {
    amount: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
    perLevel: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

type BaseFeatureSchema = TypedPseudoDocumentSchema & ReturnType<typeof baseFeatureSchema>

/* ---------------------------------------- */

export { BaseFeature, baseFeatureSchema, type BaseFeatureSchema }
