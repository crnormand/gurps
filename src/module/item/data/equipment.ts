import { fields } from '@gurps-types/foundry/index.js'
import { DisplayEquipment } from '@gurps-types/gurps/display-item.js'
import { Weight } from '@module/data/common/weight.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'

class EquipmentModel extends BaseItemModel<EquipmentSchema> {
  static override defineSchema(): EquipmentSchema {
    return {
      ...super.defineSchema(),
      ...equipmentSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return foundry.utils.mergeObject(super.metadata, {
      type: 'equipmentV2',
      childTypes: ['equipmentV2'],
      sortKeys: {
        quantity: 'system.count',
        value: 'system.cost',
        extendedValue: 'system.costsum',
        weight: 'system.weight',
        extendedWeight: 'system.weightsum',
      },
    })
  }

  /* ---------------------------------------- */

  get carried(): boolean {
    if (this.isContained) {
      const container = this.container!

      if (!container.isOfType('equipmentV2')) {
        ui.notifications?.error(
          `Expected container of equipment item to be of type "equipmentV2", but got "${container.type}"`
        )

        return this._carried
      }

      return container.system.carried
    }

    return this._carried
  }

  override get enabled(): boolean {
    return this.equipped && this.carried
  }

  /* ---------------------------------------- */

  override async toggleEnabled(enabled: boolean | null = null): Promise<this['parent'] | undefined> {
    const currentEnabled = this.equipped

    return this.parent.update({ system: { equipped: enabled === null ? !currentEnabled : enabled } })
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override getGlobalBonuses(): AnyObject[] {
    if (!this.equipped) return []

    return super.getGlobalBonuses()
  }

  /* ---------------------------------------- */

  override toDisplayItem(): DisplayEquipment {
    return foundry.utils.mergeObject(super.toDisplayItem(), {
      equipped: this.equipped,
      carried: this.carried,
      quantity: this.count,
      techLevel: this.techlevel,
      legalityClass: this.legalityclass,
      value: this.cost,
      extendedValue: this.costsum,
      weight: Weight.from(this.weight, Weight.Unit.Pound, true).toObject(),
      extendedWeight: Weight.from(this.weightsum, Weight.Unit.Pound, true).toObject(),
    })
  }
}

/* ---------------------------------------- */

const equipmentSchema = () => {
  return {
    /** The quantity of this item. */
    count: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The weight of one unit of this item. */
    weight: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The value of one unit of this item. */
    cost: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The stored location of this item, e.g. "Backpack", "Belt Pouch", etc. */
    location: new fields.StringField({ required: true, nullable: false }),

    /**
     * Whether this item is currently being carried by the character.
     * This value is ignored for items that are contained within another item,
     * in which case the container's carried value is used instead.
     */
    _carried: new fields.BooleanField({ required: true, nullable: false, initial: true }),

    /** Whether this item is currently equipped by the character. */
    equipped: new fields.BooleanField({ required: true, nullable: false }),

    /** The Tech Level of this item, e.g. "TL10", "TL12^" */
    techlevel: new fields.StringField({ required: true, nullable: false }),

    /** A comma-separated list of this item's categories, e.g. "Weapon, Ranged, Thrown" */
    categories: new fields.StringField({ required: true, nullable: false }),

    /** The Legality Class of this item, generally numeric. */
    legalityclass: new fields.StringField({ required: true, nullable: false }),

    /** The summed cost of all units of this item and any contained items. */
    costsum: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The summed weight of all units of this item and any contained items. */
    weightsum: new fields.StringField({ required: true, nullable: false }),

    /** The remaining uses of this item, if any. Used for things like ammunition, sips of a potion, etc. */
    uses: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The maximum uses of this item, if any. Used for things like ammunition, sips of a potion, etc. */
    maxuses: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /**
     * The original imported quantity of this item, which is used by the Character importer to check whether to
     * override item quantity on re-import
     * */
    originalCount: new fields.StringField({ required: true, nullable: false }),

    /** Whether the importer should ignore changes to quantity for this item on re-import. */
    ignoreImportQty: new fields.BooleanField({ required: true, nullable: false }),

    /** NOTE: This field does not appear to be used anywhere. */

    // lastUpdate: new fields.StringField({ required: false, nullable: true }),
  }
}

type EquipmentSchema = BaseItemModelSchema & ReturnType<typeof equipmentSchema>

/* ---------------------------------------- */

export { EquipmentModel, type EquipmentSchema }
