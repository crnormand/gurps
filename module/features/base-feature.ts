import { IFeatures } from '../data/mixins/features.ts'
import { GcsBaseItemModel } from '../item/data/gcs-base.ts'
import { TypedPseudoDocument, TypedPseudoDocumentSchema } from '../pseudo-document/typed-pseudo-document.ts'
import { fields } from '../types/foundry/index.ts'

import { FeatureType } from './types.ts'

/* ---------------------------------------- */

class BaseFeature<Schema extends BaseFeatureSchema> extends TypedPseudoDocument<Schema, GcsBaseItemModel & IFeatures> {
  static override defineSchema(): BaseFeatureSchema {
    return Object.assign(super.defineSchema(), baseFeatureSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return super.TYPE as FeatureType
  }
}

/* ---------------------------------------- */

const baseFeatureSchema = () => {
  return {
    amount: new fields.NumberField({ required: true, nullable: false, default: 1 }),
    perLevel: new fields.BooleanField({ required: true, nullable: false, default: false }),
  }
}

type BaseFeatureSchema = TypedPseudoDocumentSchema & ReturnType<typeof baseFeatureSchema>

/* ---------------------------------------- */

export { BaseFeature, baseFeatureSchema, type BaseFeatureSchema }
