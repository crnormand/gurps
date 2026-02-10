import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType, WeaponBonusSelectionType, WeaponSwitchType } from './types.js'

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

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    if (this.specialization) INameable.extract.call(this, this.specialization.qualifier ?? '', map, existing)

    if (this.selectionType === WeaponBonusSelectionType.ThisWeapon) {
      if (this.name) INameable.extract.call(this, this.name.qualifier ?? '', map, existing)
      if (this.usage) INameable.extract.call(this, this.usage.qualifier ?? '', map, existing)
      if (this.tags) INameable.extract.call(this, this.tags.qualifier ?? '', map, existing)
    }
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

/**
 * The below classes are essentially stubs but need to be declared due to the TypedPseudoDocument data validation
 * requiring a match in the TYPE accessor for each class.
 */

class WeaponAccBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponAccBonus
  }
}

/* ---------------------------------------- */

class WeaponScopeAccBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponScopeAccBonus
  }
}

/* ---------------------------------------- */

class WeaponDRDivisorBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponDRDivisorBonus
  }
}

/* ---------------------------------------- */

class WeaponEffectiveSTBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponEffectiveSTBonus
  }
}

/* ---------------------------------------- */

class WeaponMinSTBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponMinSTBonus
  }
}

/* ---------------------------------------- */

class WeaponMinReachBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponMinReachBonus
  }
}

/* ---------------------------------------- */

class WeaponMaxReachBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponMaxReachBonus
  }
}

/* ---------------------------------------- */

class WeaponHalfDamageRangeBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponHalfDamageRangeBonus
  }
}

/* ---------------------------------------- */

class WeaponMinRangeBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponMinRangeBonus
  }
}

/* ---------------------------------------- */

class WeaponMaxRangeBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponMaxRangeBonus
  }
}

/* ---------------------------------------- */

class WeaponRecoilBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponRecoilBonus
  }
}

/* ---------------------------------------- */

class WeaponBulkBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponBulkBonus
  }
}

/* ---------------------------------------- */

class WeaponParryBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponParryBonus
  }
}

/* ---------------------------------------- */

class WeaponBlockBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponBlockBonus
  }
}

/* ---------------------------------------- */

class WeaponRofMode1ShotsBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponRofMode1ShotsBonus
  }
}

/* ---------------------------------------- */

class WeaponRofMode1SecondaryBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponRofMode1SecondaryBonus
  }
}

/* ---------------------------------------- */

class WeaponRofMode2ShotsBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponRofMode2ShotsBonus
  }
}

/* ---------------------------------------- */

class WeaponRofMode2SecondaryBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponRofMode2SecondaryBonus
  }
}

/* ---------------------------------------- */

class WeaponNonChamberShotsBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponNonChamberShotsBonus
  }
}

/* ---------------------------------------- */

class WeaponChamberShotsBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponChamberShotsBonus
  }
}

/* ---------------------------------------- */

class WeaponShotDurationBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponShotDurationBonus
  }
}

/* ---------------------------------------- */

class WeaponReloadTimeBonus extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponReloadTimeBonus
  }
}

/* ---------------------------------------- */

class WeaponSwitch extends WeaponBonus {
  static override get TYPE(): FeatureType {
    return FeatureType.WeaponSwitch
  }
}

export {
  WeaponBonus,
  WeaponAccBonus,
  WeaponScopeAccBonus,
  WeaponDRDivisorBonus,
  WeaponEffectiveSTBonus,
  WeaponMinSTBonus,
  WeaponMinReachBonus,
  WeaponMaxReachBonus,
  WeaponHalfDamageRangeBonus,
  WeaponMinRangeBonus,
  WeaponMaxRangeBonus,
  WeaponRecoilBonus,
  WeaponBulkBonus,
  WeaponParryBonus,
  WeaponBlockBonus,
  WeaponRofMode1ShotsBonus,
  WeaponRofMode1SecondaryBonus,
  WeaponRofMode2ShotsBonus,
  WeaponRofMode2SecondaryBonus,
  WeaponNonChamberShotsBonus,
  WeaponChamberShotsBonus,
  WeaponShotDurationBonus,
  WeaponReloadTimeBonus,
  WeaponSwitch,
}
