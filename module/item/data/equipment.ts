import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'

import fields = foundry.data.fields

import { ItemComponent, ItemComponentSchema } from './component.js'

import { AnyObject } from 'fvtt-types/utils'

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
    return this.equipped && this.carried
  }

  /* ---------------------------------------- */

  get equipped(): boolean {
    return this.component.equipped
  }

  /* ---------------------------------------- */

  get carried(): boolean {
    return this.component.carried
  }

  /* ---------------------------------------- */

  override async toggleEnabled(enabled: boolean | null = null): Promise<this['parent'] | undefined> {
    const currentEnabled = this.equipped

    // NOTE: do I really need to assert Item.UpdateData here?
    return this.parent.update({
      system: { eqt: { equipped: enabled === null ? !currentEnabled : enabled } },
    } as Item.UpdateData)
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override getGlobalBonuses(): AnyObject[] {
    if (!this.component.equipped) return []

    return super.getGlobalBonuses()
  }
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
    lastUpdate: new fields.StringField({ required: false, nullable: true }),
  }
}

type EquipmentComponentSchema = ItemComponentSchema & ReturnType<typeof equipmentComponentSchema>

/* ---------------------------------------- */

export { EquipmentModel, type EquipmentSchema, type EquipmentComponentSchema, EquipmentComponent }
