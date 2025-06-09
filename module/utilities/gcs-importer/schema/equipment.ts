import fields = foundry.data.fields
import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'
import { GcsEquipmentModifier } from './equipment-modifier.js'
import { GcsWeapon } from './weapon.js'

class GcsEquipment extends GcsItem<EquipmentData> {
  static override metadata = {
    childClass: GcsEquipment,
    modifierClass: GcsEquipmentModifier,
  }

  /* ---------------------------------------- */

  static override defineSchema(): EquipmentData {
    return {
      ...sourcedIdSchema(),
      ...equipmentData(),
    }
  }
}

/* ---------------------------------------- */

const equipmentData = () => {
  return {
    // START: EquipmentData
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: EquipmentData
    // START: EquipmentEditData
    vtt_note: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    modifiers: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    rated_strength: new fields.NumberField({ required: true, nullable: true }),
    quantity: new fields.NumberField({ required: true, nullable: true }),
    level: new fields.NumberField({ required: true, nullable: false }),
    uses: new fields.NumberField({ required: true, nullable: true }),
    equipped: new fields.BooleanField({ required: true, nullable: true }),
    // END: EquipmentEditData
    // START: EquipmentSyncData
    description: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tech_level: new fields.StringField({ required: true, nullable: true }),
    legality_class: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    base_value: new fields.StringField({ required: true, nullable: true }),
    base_weight: new fields.StringField({ required: true, nullable: true }),
    max_uses: new fields.NumberField({ required: true, nullable: true }),
    // STUB: prereqs is not yet supported
    prereqs: new fields.ObjectField({ required: true, nullable: true }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    ignore_weight_for_skills: new fields.BooleanField({ required: true, nullable: true }),
    // END: EquipmentSyncData
    // START: calc
    calc: new fields.SchemaField(
      {
        value: new fields.NumberField({ required: true, nullable: false }),
        extended_value: new fields.NumberField({ required: true, nullable: false }),
        weight: new fields.StringField({ required: true, nullable: false }),
        extended_weight: new fields.StringField({ required: true, nullable: false }),
        extended_weight_for_skills: new fields.StringField({ required: true, nullable: true }),
        resolved_notes: new fields.StringField({ required: true, nullable: true }),
        unsatisfied_reason: new fields.StringField({ required: true, nullable: true }),
      },
      { required: true, nullable: true }
    ),
    // END: calc
  }
}

type EquipmentData = SourcedIdSchema & ReturnType<typeof equipmentData>

/* ---------------------------------------- */

export { GcsEquipment, equipmentData }
