import { fields } from '@gurps-types/foundry/index.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType } from './types.ts'

class ReactionBonus extends BaseFeature<ReactionBonusSchema> implements ILeveledAmount {
  static override defineSchema(): ReactionBonusSchema {
    return Object.assign(super.defineSchema(), reactionBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.ReactionBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    INameable.extract.call(this, this.situation, map, existing)
  }
}

/* ---------------------------------------- */

const reactionBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    situation: new fields.StringField({ required: true, nullable: false }),
  }
}

type ReactionBonusSchema = BaseFeatureSchema & ReturnType<typeof reactionBonusSchema>

/* ---------------------------------------- */

export { ReactionBonus }
