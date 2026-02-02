import { fields } from '../types/foundry/index.ts'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { FeatureType } from './types.ts'

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
