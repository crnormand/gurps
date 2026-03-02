import { fields } from '@gurps-types/foundry/index.js'
import { featuresSchema, IFeatures } from '@module/data/mixins/features.js'
import { INameable, INameableApplier, nameableSchema } from '@module/data/mixins/nameable.js'
import { IPrereqs, IPrereqsBaseData, preparePrereqs, prereqsSchema } from '@module/data/mixins/prereqs.js'
import { IStudies, studiesSchema } from '@module/data/mixins/studies.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.js'

type TraitBaseData = INameable.AccesserBaseData & IPrereqsBaseData

class GcsTraitModel
  extends GcsBaseItemModel<GcsTraitSchema, TraitBaseData>
  implements IFeatures, IPrereqs, INameableApplier, IStudies
{
  nameWithReplacements: string = ''
  localNotesWithReplacements: string = ''
  userDescWithReplacements: string = ''

  /* ---------------------------------------- */

  static override defineSchema(): GcsTraitSchema {
    return gcsTraitSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Prereq: 'system._prereqs', Feature: 'system.features', Study: 'system.study' },
      type: 'gcsTrait',
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
    INameable.extract.call(this, this.userDesc, map, existing)

    this.nameableReplacements = map
  }

  /* ---------------------------------------- */

  applyNameableKeys(): void {
    this.nameWithReplacements = INameable.apply.call(this, this.parent.name)
    this.localNotesWithReplacements = INameable.apply.call(this, this.localNotes)
    this.userDescWithReplacements = INameable.apply.call(this, this.userDesc)
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  get currentLevel(): number {
    return this.canLevel ? this.levels : 0
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  applyBonuses(): void {}

  /* ---------------------------------------- */

  // NOTE: Placeholder
  processPrereqs(): void {}
}

const gcsTraitSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),
    ...prereqsSchema(),
    ...nameableSchema(),
    ...studiesSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    userDesc: new fields.StringField({ required: true, nullable: false }),
    cr: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    frequency: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    levels: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    crAdj: new fields.StringField({ required: true, nullable: false, initial: 0 }),
    basePoints: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    pointsPerLevel: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    roundDown: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    canLevel: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    ancestry: new fields.StringField({ required: true, nullable: true }),
    // NOTE: STUB, currently unused.
    // templatePicker: new fields.SchemaField({},{ required: true, nullable: true }),
    containerType: new fields.StringField({ required: true, nullable: true }),
  }
}

type GcsTraitSchema = ReturnType<typeof gcsTraitSchema>

/* ---------------------------------------- */

export { GcsTraitModel }
