import { fields } from '../../../types/foundry/index.js'

import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'
import { GcsEquipmentModifier } from './equipment-modifier.js'
import { GcsWeapon } from './weapon.js'

class GcsEquipment extends GcsItem<EquipmentModel> {
  static override metadata = {
    childClass: GcsEquipment,
    modifierClass: GcsEquipmentModifier,
    weaponClass: GcsWeapon,
  }

  /* ---------------------------------------- */

  static override defineSchema(): EquipmentModel {
    return {
      ...sourcedIdSchema(),
      ...equipmentData(),
    }
  }

  /* ---------------------------------------- */

  protected static override _importField(
    data: any,
    field: fields.DataField.Any,
    name: string,
    replacements: Record<string, string>
  ): any {
    switch (name) {
      case 'description':
      case 'local_notes':
        return this.processReplacements(data, replacements) ?? field.getInitialValue()
      default:
        return super._importField(data, field, name, replacements)
    }
  }

  /* ---------------------------------------- */

  override get isContainer(): boolean {
    return this.id.startsWith('E')
  }

  /* ---------------------------------------- */

  /** @abstract */
  override get isEnabled(): boolean {
    return this.equipped ?? false
  }

  /* ---------------------------------------- */

  get name(): string | null {
    return this.description
  }
}

/* ---------------------------------------- */

const equipmentData = () => {
  return {
    // START: EquipmentModel
    // third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    vtt_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: EquipmentModel

    // START: EquipmentEditData
    modifiers: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    // rated_strength: new fields.NumberField({ required: true, nullable: true, initial: null }),
    quantity: new fields.NumberField({ required: true, nullable: true, initial: null }),
    // level: new fields.NumberField({ required: true, nullable: true, initial: null }),
    uses: new fields.NumberField({ required: true, nullable: true, initial: null }),
    equipped: new fields.BooleanField({ required: true, nullable: true, initial: null }),
    // END: EquipmentEditData

    // START: EquipmentSyncData
    description: new fields.StringField({ required: true, nullable: true, initial: null }),
    reference: new fields.StringField({ required: true, nullable: true, initial: null }),
    // reference_highlight: new fields.StringField({ required: true, nullable: true, initial: null }),
    local_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    tech_level: new fields.StringField({ required: true, nullable: true, initial: null }),
    // legality_class: new fields.StringField({ required: true, nullable: true, initial: null }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    // base_value: new fields.StringField({ required: true, nullable: true, initial: null }),
    // base_weight: new fields.StringField({ required: true, nullable: true, initial: null }),
    max_uses: new fields.NumberField({ required: true, nullable: true }),
    // STUB: prereqs is not yet supported
    // prereqs: new fields.ObjectField({ required: true, nullable: true }),
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    // ignore_weight_for_skills: new fields.BooleanField({ required: true, nullable: true }),
    // END: EquipmentSyncData

    // START: calc
    calc: new fields.SchemaField(
      {
        value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        extended_value: new fields.NumberField({ required: true, nullable: false }),
        weight: new fields.StringField({ required: true, nullable: false }),
        extended_weight: new fields.StringField({ required: true, nullable: false }),
        // extended_weight_for_skills: new fields.StringField({ required: true, nullable: true }),
        resolved_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
        // unsatisfied_reason: new fields.StringField({ required: true, nullable: true, initial: null }),
      },
      { required: false, nullable: true }
    ),
    // END: calc
  }
}

type EquipmentModel = SourcedIdSchema & ReturnType<typeof equipmentData>

/* ---------------------------------------- */

export { GcsEquipment, equipmentData }
