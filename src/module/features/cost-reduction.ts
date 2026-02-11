import { fields } from '@gurps-types/foundry/index.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { FeatureType } from './types.js'

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
