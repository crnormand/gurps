import { NumberCriteriaField } from '../data/criteria/number-criteria.ts'
import { StringCriteriaField } from '../data/criteria/string-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType, WeaponBonusSelectionType, WeaponSwitchType } from './types.ts'

class WeaponBonus extends BaseFeature<WeaponBonusSchema> implements ILeveledAmount {
  static override defineSchema(): WeaponBonusSchema {
    return Object.assign(super.defineSchema(), weaponBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.WeaponBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    // NOTE: STUB
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const weaponBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    perDie: new fields.BooleanField({ required: true, nullable: true, initial: null }),
    percent: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    selectionType: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(WeaponBonusSelectionType),
      initial: WeaponBonusSelectionType.WithName,
    }),
    switchType: new fields.StringField({
      required: true,
      nullable: true,
      choices: Object.values(WeaponSwitchType),
      initial: null,
    }),
    switchTypeValue: new fields.BooleanField({ required: false, nullable: true, initial: null }),
    name: new StringCriteriaField({ required: true, nullable: true }),
    specialization: new StringCriteriaField({ required: true, nullable: true }),
    usage: new StringCriteriaField({ required: true, nullable: true }),
    tags: new StringCriteriaField({ required: true, nullable: true }),
    level: new NumberCriteriaField({ required: true, nullable: true }),
  }
}

type WeaponBonusSchema = BaseFeatureSchema & ReturnType<typeof weaponBonusSchema>

/* ---------------------------------------- */

export { WeaponBonus }
