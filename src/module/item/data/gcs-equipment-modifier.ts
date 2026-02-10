import { fields } from '@gurps-types/foundry/index.js'
import { WeightUnit, WeightField } from '@module/data/common/weight.js'
import { featuresSchema, IFeatures } from '@module/data/mixins/features.js'
import { INameable, INameableApplier } from '@module/data/mixins/nameable.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsEquipmentModifierModel
  extends GcsBaseItemModel<GcsEquipmentModifierSchema, INameable.AccesserBaseData>
  implements IFeatures, INameableApplier
{
  nameWithReplacements: string = ''
  localNotesWithReplacements: string = ''

  /* ---------------------------------------- */

  static override defineSchema(): GcsEquipmentModifierSchema {
    return gcsEquipmentModifierSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Feature: 'system.features' },
      type: 'gcsEquipmentModifier',
      invalidActorTypes: [],
      actions: {},
      childTypes: [],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */

  get equipment(): Item.OfType<'gcsEquipment'> | null {
    return this.ancestors.find(item => item.isOfType('gcsEquipment')) ?? null
  }

  get enabled(): boolean {
    // NOTE: STUB
    return !this.disabled
  }

  /* ---------------------------------------- */

  override prepareBaseData(): void {
    this.fillWithNameableKeys(new Map())
    this.applyNameableKeys()
  }

  /* ---------------------------------------- */

  fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    if (!this.enabled) return

    existing ??= this.equipment?.system.nameableReplacements
    existing ??= new Map()

    INameable.extract.call(this, this.parent.name, map, existing)
    INameable.extract.call(this, this.localNotes, map, existing)

    this.nameableReplacements = map
  }

  /* ---------------------------------------- */

  applyNameableKeys(): void {
    this.nameWithReplacements = INameable.apply.call(this, this.parent.name)
    this.localNotesWithReplacements = INameable.apply.call(this, this.localNotes)
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  applyBonuses(): void {}
}

const gcsEquipmentModifierSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    costType: new fields.StringField({ required: true, nullable: false }),
    costIsPerLevel: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    costIsPerPound: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    weightType: new fields.StringField({ required: true, nullable: false }),
    weightIsPerLevel: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showNotesOnWeapon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    techLevel: new fields.StringField({ required: true, nullable: false }),
    costAmount: new fields.StringField({ required: true, nullable: false }),
    weightAmount: new WeightField({ required: true, nullable: false, initial: { unit: WeightUnit.Pound, value: 0 } }),
  }
}

type GcsEquipmentModifierSchema = ReturnType<typeof gcsEquipmentModifierSchema>

/* ---------------------------------------- */

export { GcsEquipmentModifierModel }
