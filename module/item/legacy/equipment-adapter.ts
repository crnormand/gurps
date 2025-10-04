import { defineGetterProperties } from '../../utilities/object-utils.js'
import { arrayToObject } from '../../../lib/utilities.js'
import { GurpsItemV2 } from '../gurps-item.js'
import { EquipmentModel } from '../data/equipment.js'

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

  constructor(equipmentV2: GurpsItemV2<'equipmentV2'>) {
    this.equipmentV2 = equipmentV2

    defineGetterProperties(this, getterKeys)

    // Get contained items.
    const containedItems: GurpsItemV2<'equipmentV2'>[] = this.equipmentV2.contains
      .sort((a, b) => a.sort - b.sort)
      .map(it => it as GurpsItemV2<'equipmentV2'>)
    this._contains = arrayToObject(
      containedItems?.map(item => new EquipmentV1(item)),
      5
    )

    this.save = false
  }

  equipmentV2: GurpsItemV2<'equipmentV2'>
  save: boolean

  get addToQuickRoll(): boolean {
    return this.equipmentV2.addToQuickRoll
  }

  get carried(): boolean {
    return this.equipmentV2.eqt!.carried
  }

  get categories(): string {
    return this.equipmentV2.eqt!.categories
  }

  get collapsed(): Record<string, EquipmentV1> {
    return (this.equipmentV2.system as EquipmentModel).open ? {} : this._contains
  }

  get contains(): Record<string, EquipmentV1> {
    return (this.equipmentV2.system as EquipmentModel).open ? this._contains : {}
  }

  get cost(): number {
    return this.equipmentV2.eqt!.cost
  }

  get costsum(): number {
    return this.equipmentV2.eqt!.costsum
  }

  get count(): number {
    return this.equipmentV2.eqt!.count
  }

  get equipped(): boolean {
    return this.equipmentV2.eqt!.equipped
  }

  get ignoreImportQty(): boolean {
    return this.equipmentV2.eqt!.ignoreImportQty
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
    return this.equipmentV2.eqt!.legalityclass
  }

  get location(): string {
    return this.equipmentV2.eqt!.location
  }

  get maxuses(): number | null {
    return this.equipmentV2.eqt!.maxuses
  }

  get modifierTags(): string {
    return (this.equipmentV2.system as EquipmentModel).modifierTags ?? ''
  }

  get name(): string {
    return this.equipmentV2.name
  }

  get notes(): string {
    const notes = [this.equipmentV2.eqt!.notes ?? '', this.equipmentV2.eqt!.vtt_notes ?? '']
      .filter(it => it)
      .join('<br>')
      .trim()
    return notes
  }

  get originalCount(): string {
    return this.equipmentV2.eqt!.originalCount ?? ''
  }

  get originalName(): string {
    return this.equipmentV2.name
  }

  get pageref(): string {
    return this.equipmentV2.eqt!.pageref ?? ''
  }

  get parentuuid(): string | null {
    return this.equipmentV2.eqt!.parentuuid ?? null
  }

  get techlevel(): string {
    return this.equipmentV2.eqt!.techlevel
  }

  get uses(): number | null {
    return this.equipmentV2.eqt!.uses
  }

  get uuid(): string {
    return this.equipmentV2.uuid ?? ''
  }

  get weight(): number {
    return this.equipmentV2.eqt!.weight
  }

  get weightsum(): string {
    return this.equipmentV2.eqt!.weightsum
  }
}

export { EquipmentV1 }
