import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'
import fields = foundry.data.fields
import { ItemComponent, ItemComponentSchema } from './component.js'

class EquipmentModel extends BaseItemModel<EquipmentSchema> {
  static override defineSchema(): EquipmentSchema {
    return {
      ...super.defineSchema(),
      ...equipmentSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return {
      embedded: {},
      type: 'equipment',
      invalidActorTypes: [],
      actions: {},
      childTypes: ['equipment'],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */

  get component(): EquipmentComponent {
    return this.eqt
  }

  /* ---------------------------------------- */

  override get enabled(): boolean {
    return this.component.equipped
  }

  get equipped(): boolean {
    return this.component.equipped
  }

  /* ---------------------------------------- */

  get carried(): boolean {
    return this.component.carried
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */
}

class EquipmentComponent extends ItemComponent<EquipmentComponentSchema> {
  static override defineSchema(): EquipmentComponentSchema {
    return {
      ...super.defineSchema(),
      ...equipmentComponentSchema(),
    }
  }
}

/* ---------------------------------------- */

const equipmentSchema = () => {
  return {
    eqt: new fields.EmbeddedDataField(EquipmentComponent, { required: true, nullable: false }),
  }
}

type EquipmentSchema = BaseItemModelSchema & ReturnType<typeof equipmentSchema>

/* ---------------------------------------- */

// Change from previous schema. "last_import" is not present as it is never used.
const equipmentComponentSchema = () => {
  return {
    count: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    weight: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    cost: new fields.NumberField({ required: true, nullable: false }),
    location: new fields.StringField({ required: true, nullable: false }),
    carried: new fields.BooleanField({ required: true, nullable: false }),
    equipped: new fields.BooleanField({ required: true, nullable: false }),
    techlevel: new fields.StringField({ required: true, nullable: false }),
    categories: new fields.StringField({ required: true, nullable: false }),
    legalityclass: new fields.StringField({ required: true, nullable: false }),
    costsum: new fields.NumberField({ required: true, nullable: false }),
    weightsum: new fields.StringField({ required: true, nullable: false }),
    // NOTE: Change from previous schema, where this was a string
    uses: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: Change from previous schema, where this was a string
    maxuses: new fields.NumberField({ required: true, nullable: false }),
    originalCount: new fields.StringField({ required: true, nullable: false }),
    ignoreImportQty: new fields.BooleanField({ required: true, nullable: false }),
  }
}

type EquipmentComponentSchema = ItemComponentSchema & ReturnType<typeof equipmentComponentSchema>

/* ---------------------------------------- */

export { EquipmentModel, type EquipmentSchema, type EquipmentComponentSchema }
