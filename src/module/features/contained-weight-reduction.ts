import { fields } from '@gurps-types/foundry/index.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { FeatureType } from './types.js'

class ContainedWeightReduction extends BaseFeature<ContainedWeightReductionSchema> {
  static override defineSchema(): ContainedWeightReductionSchema {
    return Object.assign(super.defineSchema(), containedWeightReductionSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.ContainedWeightReduction
  }
}

/* ---------------------------------------- */

const containedWeightReductionSchema = () => {
  return {
    // NOTE: Should render as percentage
    reduction: new fields.NumberField({ required: true, nullable: false }),
  }
}

type ContainedWeightReductionSchema = BaseFeatureSchema & ReturnType<typeof containedWeightReductionSchema>

/* ---------------------------------------- */

export { ContainedWeightReduction }
