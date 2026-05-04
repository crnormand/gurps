import { fields } from '@gurps-types/foundry/index.js'

import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'

/* ---------------------------------------- */

class GcsTraitModifier extends GcsItem<TraitModifierData> {
  static override metadata = {
    childClass: GcsTraitModifier,
    modifierClass: null, // TraitModifiers do not have modifiers
    weaponClass: null, // TraitModifiers do not have weapons
  }

  /* ---------------------------------------- */

  static override defineSchema(): TraitModifierData {
    return {
      ...sourcedIdSchema(),
      ...traitModifierData(),
    }
  }

  /* ---------------------------------------- */

  protected static override _importField(
    data: any,
    field: fields.DataField.Any,
    name: string,
    replacements: Record<string, string> = {}
  ): any {
    switch (name) {
      case 'name':
      case 'local_notes':
        return this.processReplacements(data, replacements) ?? field.getInitialValue()
      default:
        return super._importField(data, field, name, replacements)
    }
  }

  /* ---------------------------------------- */

  override get isContainer(): boolean {
    return this.id.startsWith('M')
  }

  /* ---------------------------------------- */

  override get isEnabled(): boolean {
    return !this.disabled || this.isContainer
  }
}

/* ---------------------------------------- */

const traitModifierData = () => {
  return {
    // START: TraitModifierData
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitModifierData

    // START: TraitModifierEditData
    vtt_notes: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: TraitModifierEditData

    // START: TraitModifierSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitModifierSyncData

    // START: TraitModifierEditDataNonContainerOnly
    levels: new fields.NumberField({ required: true, nullable: true }),
    disabled: new fields.BooleanField({ required: true, nullable: true }),
    // END: TraitModifierEditDataNonContainerOnly

    // START: TraitModifierNonContainerSyncData
    cost: new fields.NumberField({ required: true, nullable: true }),
    cost_type: new fields.StringField({ required: true, nullable: true }),
    use_level_from_trait: new fields.BooleanField({ required: true, nullable: true }),
    show_notes_on_weapon: new fields.BooleanField({ required: true, nullable: true }),
    affects: new fields.StringField({ required: true, nullable: true }),
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    // END: TraitModifierNonContainerSyncData

    // START: calc
    calc: new fields.SchemaField(
      {
        resolved_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
      },
      { required: true, nullable: true, initial: null }
    ),
    // END: calc
  }
}

type TraitModifierData = SourcedIdSchema & ReturnType<typeof traitModifierData>

/* ---------------------------------------- */

export { GcsTraitModifier, type TraitModifierData }
