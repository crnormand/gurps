import { fields } from '../types/foundry/index.ts'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { FeatureType } from './types.ts'

class CostReduction extends BaseFeature<CostReductionSchema> {
  static override defineSchema(): CostReductionSchema {
    return Object.assign(super.defineSchema(), costReductionSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.CostReduction
  }
}

/* ---------------------------------------- */

const costReductionSchema = () => {
  return {
    attribute: new fields.StringField({ required: true, nullable: false }),
    percentage: new fields.NumberField({ required: true, nullable: false }),
  }
}

type CostReductionSchema = BaseFeatureSchema & ReturnType<typeof costReductionSchema>

/* ---------------------------------------- */

export { CostReduction }
