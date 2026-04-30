import { Weight } from '@module/data/common/weight.js'
import { defineGetterProperties } from '@util/object-utils.js'
import { arrayToObject } from '@util/utilities.js'

import { EquipmentModel } from '../data/equipment.js'
import { ItemType } from '../types.js'

// Make selected prototype getters enumerable own properties so Object.values() includes them.
const getterKeys = [
  'addToQuickRoll',
  'carried',
  'categories',
  'collapsed',
  'contains',
  'cost',
  'costsum',
  'count',
  'equipped',
  'ignoreImportQty',
  'itemInfo',
  'itemModifiers',
  'itemid',
  'legalityclass',
  'location',
  'maxuses',
  'modifierTags',
  'name',
  'notes',
  'originalCount',
  'originalName',
  'pageref',
  'parentuuid',
  'techlevel',
  'uses',
  'uuid',
  'weight',
  'weightsum',
] as const

class EquipmentV1 {
  private _contains: Record<string, EquipmentV1>

  constructor(equipmentV2: Item.OfType<ItemType.Equipment>) {
    this.equipmentV2 = equipmentV2

    defineGetterProperties(this, getterKeys)

    // Get contained items.
    const containedItems: Item.OfType<ItemType.Equipment>[] = this.equipmentV2.sortedContents.map(
      it => it as Item.OfType<ItemType.Equipment>
    )

    this._contains = arrayToObject(
      containedItems?.map(item => new EquipmentV1(item)),
      5
    )

    this.save = false
  }

  equipmentV2: Item.OfType<ItemType.Equipment>
  save: boolean

  get addToQuickRoll(): boolean {
    return this.equipmentV2.addToQuickRoll
  }

  get carried(): boolean {
    return this.equipmentV2.system.carried
  }

  get categories(): string {
    return [...this.equipmentV2.system.categories].join(', ')
  }

  get collapsed(): Record<string, EquipmentV1> {
    return (this.equipmentV2.system as EquipmentModel).open ? {} : this._contains
  }

  get contains(): Record<string, EquipmentV1> {
    return (this.equipmentV2.system as EquipmentModel).open ? this._contains : {}
  }

  get cost(): number {
    return this.equipmentV2.system.cost
  }

  get costsum(): number {
    return this.equipmentV2.system.totalCost
  }

  get count(): number {
    return this.equipmentV2.system.count
  }

  get equipped(): boolean {
    return this.equipmentV2.system.equipped
  }

  get ignoreImportQty(): boolean {
    return this.equipmentV2.system.ignoreImportQty
  }

  get itemInfo(): {
    id: string | null
    img: string | null
    name: string
  } {
    return {
      id: this.equipmentV2.id,
      img: this.equipmentV2.img ?? null,
      name: this.equipmentV2.name,
    }
  }

  get itemModifiers(): string {
    return (this.equipmentV2.system as EquipmentModel).itemModifiers ?? ''
  }

  get itemid(): string | null {
    return this.equipmentV2.id
  }

  get legalityclass(): string {
    return this.equipmentV2.system.legalityclass
  }

  get location(): string {
    return this.equipmentV2.system.location
  }

  get maxuses(): number | null {
    return this.equipmentV2.system.maxuses
  }

  get modifierTags(): string {
    return [...this.equipmentV2.system.modifierTags].join(', ')
  }

  get name(): string {
    return this.equipmentV2.name
  }

  get notes(): string {
    const notes = [this.equipmentV2.system.notes ?? '', this.equipmentV2.system.vtt_notes ?? '']
      .filter(it => it)
      .join('<br>')
      .trim()

    return notes
  }

  get originalCount(): string {
    return this.equipmentV2.system.originalCount ?? ''
  }

  get originalName(): string {
    return this.equipmentV2.name
  }

  get pageref(): string {
    return this.equipmentV2.system.pageref ?? ''
  }

  get parentuuid(): string | null {
    return this.equipmentV2.system.container?._id ?? null
  }

  get techlevel(): string {
    return this.equipmentV2.system.techlevel
  }

  get uses(): number | null {
    return this.equipmentV2.system.uses
  }

  get uuid(): string {
    return this.equipmentV2.uuid ?? ''
  }

  get weight(): number {
    return this.equipmentV2.system.weight
  }

  get weightsum(): string {
    return Weight.fromPounds(this.equipmentV2.system.totalWeight).toString()
  }

  toggleOpen(expandOnly: boolean = false) {
    return this.equipmentV2.toggleOpen(expandOnly)
  }
}

export { EquipmentV1 }
