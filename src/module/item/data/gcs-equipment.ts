import { fields } from '@gurps-types/foundry/index.js'
import { Weight } from '@module/data/common/weight.js'
import { featuresSchema, IFeatures } from '@module/data/mixins/features.js'
import { INameable, INameableApplier, nameableSchema } from '@module/data/mixins/nameable.js'
import { IPrereqs, IPrereqsBaseData, preparePrereqs, prereqsSchema } from '@module/data/mixins/prereqs.js'
import { ScriptEquipment } from '@module/scripting/adapters/equipment.js'
import { ScriptResolver } from '@module/scripting/resolver.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.js'

type EquipmentBaseData = INameable.AccesserBaseData & IPrereqsBaseData

class GcsEquipmentModel
  extends GcsBaseItemModel<GcsEquipmentSchema, EquipmentBaseData>
  implements IFeatures, IPrereqs, INameableApplier
{
  nameWithReplacements: string = ''
  localNotesWithReplacements: string = ''
  baseValueWithReplacements: string = ''
  baseWeightWithReplacements: string = ''

  /* ---------------------------------------- */

  static override defineSchema(): GcsEquipmentSchema {
    return gcsEquipmentSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Prereq: 'system._prereqs', Feature: 'system.features' },
      type: 'gcsEquipment',
      invalidActorTypes: [],
      actions: {},
      childTypes: [],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */

  override prepareBaseData(): void {
    preparePrereqs.call(this)

    this.fillWithNameableKeys(new Map())
    this.applyNameableKeys()
  }

  /* ---------------------------------------- */

  fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    existing ??= new Map(Object.entries(this.replacements))

    INameable.extract.call(this, this.parent.name, map, existing)
    INameable.extract.call(this, this.localNotes, map, existing)
    INameable.extract.call(this, this.baseValue, map, existing)
    INameable.extract.call(this, this.baseWeight, map, existing)

    this._prereqs.forEach(prereq => prereq.fillWithNameableKeys(map, existing))

    this.nameableReplacements = map
  }

  /* ---------------------------------------- */

  applyNameableKeys(): void {
    this.nameWithReplacements = INameable.apply.call(this, this.parent.name)
    this.localNotesWithReplacements = INameable.apply.call(this, this.localNotes)
    this.baseValueWithReplacements = INameable.apply.call(this, this.baseValue)
    this.baseWeightWithReplacements = INameable.apply.call(this, this.baseWeight)
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  applyBonuses(): void {}

  /* ---------------------------------------- */

  // NOTE: Placeholder
  processPrereqs(): void {}

  /* ---------------------------------------- */

  applyReplacements(): void {}

  /* ---------------------------------------- */

  get weight(): Weight {
    return ScriptResolver.resolveToWeight(
      this.actor,
      ScriptEquipment.newProvider(this),
      this.baseWeightWithReplacements
    )
  }

  /* ---------------------------------------- */

  get extendedWeight(): Weight {
    if (!this.isContainer) return this.weight

    return Weight.sum(
      this.weight,
      ...this.children.filter(child => child.isOfType('gcsEquipment')).map(child => child.system.weight)
    )
  }
}

const gcsEquipmentSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),
    ...prereqsSchema(),
    ...nameableSchema(),

    carried: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    ratedStrength: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    quantity: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
    level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    uses: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    equipped: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    techLevel: new fields.StringField({ required: true, nullable: false }),
    legalityClass: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false })),
    baseValue: new fields.StringField({ required: true, nullable: false }),
    baseWeight: new fields.StringField({ required: true, nullable: false }),
    maxUses: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    ignoreWeightForSkills: new fields.BooleanField({ required: true, nullable: false }),
  }
}

type GcsEquipmentSchema = ReturnType<typeof gcsEquipmentSchema>

/* ---------------------------------------- */

export { GcsEquipmentModel }
