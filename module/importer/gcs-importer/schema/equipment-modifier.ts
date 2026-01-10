const fields = foundry.data.fields

import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'

/* ---------------------------------------- */

class GcsEquipmentModifier extends GcsItem<EquipmentModifierData> {
  static override metadata = {
    childClass: GcsEquipmentModifier,
    modifierClass: null, // EquipmentModifiers do not have modifiers
    weaponClass: null,
  }

  /* ---------------------------------------- */

  static override defineSchema(): EquipmentModifierData {
    return {
      ...sourcedIdSchema(),
      ...equipmentModifierData(),
    }
  }

  /* ---------------------------------------- */

  override get isContainer(): boolean {
    return this.id.startsWith('F')
  }
}

/* ---------------------------------------- */

const equipmentModifierData = () => {
  return {
    // START: EquipmentModifierData
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: EquipmentModifierData

    // START: EquipmentModifierEditData
    vtt_notes: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: EquipmentModifierEditData

    // START: EquipmentModifierEditDataNonContainerOnly
    disabled: new fields.BooleanField({ required: true, nullable: true }),
    // END: EquipmentModifierEditDataNonContainerOnly

    // START: EquipmentModifierSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: EquipmentModifierSyncData

    // START: EquipmentModifierNonContainerSyncData
    cost_type: new fields.StringField({ required: true, nullable: true }),
    cost_is_per_level: new fields.BooleanField({ required: true, nullable: true }),
    weight_type: new fields.StringField({ required: true, nullable: true }),
    weight_is_per_level: new fields.BooleanField({ required: true, nullable: true }),
    show_notes_on_weapon: new fields.BooleanField({ required: true, nullable: true }),
    tech_level: new fields.StringField({ required: true, nullable: true }),
    cost: new fields.StringField({ required: true, nullable: true }),
    weight: new fields.StringField({ required: true, nullable: true }),
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    // END: EquipmentModifierNonContainerSyncData
  }
}

type EquipmentModifierData = SourcedIdSchema & ReturnType<typeof equipmentModifierData>

/* ---------------------------------------- */

export { GcsEquipmentModifier, type EquipmentModifierData }
