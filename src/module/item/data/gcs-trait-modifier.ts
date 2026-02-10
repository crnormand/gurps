import { fields } from '@gurps-types/foundry/index.js'
import { featuresSchema, IFeatures } from '@module/data/mixins/features.js'
import { INameable, INameableAccesser } from '@module/data/mixins/nameable.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.js'

class GcsTraitModifierModel
  extends GcsBaseItemModel<GcsTraitModifierSchema, INameable.AccesserBaseData>
  implements IFeatures, INameableAccesser
{
  replacements: Record<string, string> = {}
  nameWithReplacements: string = ''
  localNotesWithReplacements: string = ''

  static override defineSchema(): GcsTraitModifierSchema {
    return gcsTraitModifierSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Feature: 'system.features' },
      type: 'gcsTraitModifier',
      invalidActorTypes: [],
      actions: {},
      childTypes: [],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */

  get trait(): Item.OfType<'gcsTrait'> | null {
    return this.ancestors.find(item => item.isOfType('gcsTrait')) ?? null
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

    existing ??= this.trait?.system.nameableReplacements
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

const gcsTraitModifierSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    levels: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    costAdj: new fields.StringField({ required: true, nullable: false }),
    useLevelFromTrait: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showNotesOnWeapon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    affects: new fields.StringField({ required: true, nullable: false }),
  }
}

type GcsTraitModifierSchema = ReturnType<typeof gcsTraitModifierSchema>

/* ---------------------------------------- */

export { GcsTraitModifierModel }
