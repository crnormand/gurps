import { arrayToObject } from '../../../lib/utilities.js'
import { GurpsItemV2 } from '../gurps-item.js'

class TraitV1 {
  constructor(traitV2: GurpsItemV2<'featureV2'>) {
    this.traitV2 = traitV2

    // Make selected prototype getters enumerable own properties so Object.values() includes them.
    const getterKeys = [
      'addToQuickRoll',
      'collapsed',
      'contains',
      'cr',
      'fromItem',
      'hasContains',
      'hasCollapsed',
      'itemInfo',
      'itemModifiers',
      'itemid',
      'level',
      'modifierTags',
      'name',
      'notes',
      'originalName',
      'pageref',
      'parentuuid',
      'points',
      'uuid',
    ] as const

    const proto = Object.getPrototypeOf(this)
    for (const key of getterKeys) {
      if (Object.prototype.hasOwnProperty.call(this, key)) continue // already own

      const desc = Object.getOwnPropertyDescriptor(proto, key)
      if (desc?.get) {
        Object.defineProperty(this, key, {
          get: desc.get.bind(this),
          enumerable: true,
          configurable: true,
        })
      }
    }

    // Get contained items.
    const containedItems: GurpsItemV2<'featureV2'>[] =
      this.traitV2.actor?.items
        .filter(item => item.type === 'featureV2')
        .filter(item => item.containedBy === this.traitV2.id)
        .map(item => item as GurpsItemV2<'featureV2'>) || []
    this._contains = arrayToObject(
      containedItems?.map(item => new TraitV1(item)),
      5
    )

    this.save = false
  }

  traitV2: GurpsItemV2<'featureV2'>
  save: boolean
  _contains: Record<string, TraitV1> = {}

  get addToQuickRoll(): boolean {
    return this.traitV2.addToQuickRoll
  }

  get contains(): Record<string, TraitV1> {
    return this.traitV2.system.collapsed ? {} : this._contains
  }

  get collapsed(): Record<string, TraitV1> {
    return this.traitV2.system.collapsed ? this._contains : {}
  }

  get cr(): number | null {
    return this.traitV2.fea!.cr
  }

  get fromItem(): string | null {
    return null
    // return this.traitV2?.fromItem ?? null
  }

  get hasContains(): boolean {
    return Object.keys(this.contains).length > 0
  }

  get hasCollapsed(): boolean {
    return Object.keys(this.collapsed).length > 0
  }

  get itemInfo(): {
    id: string | null
    img: string | null
    name: string
  } {
    return {
      id: this.traitV2.id,
      img: this.traitV2.img ?? null,
      name: this.traitV2.name,
    }
  }

  get itemModifiers(): string {
    return this.traitV2.system.itemModifiers ?? ''
  }

  get itemid(): string | null {
    return this.traitV2.id
  }

  get level(): number | null {
    return this.traitV2.fea!.level ?? null
  }

  get modifierTags(): string {
    return ''
    // return this.traitV2.system.modifierTags ?? ''
  }

  get name(): string {
    return this.level ? `${this.traitV2.name} ${this.level}` : this.traitV2.name
  }

  get notes(): string {
    return this.cr
      ? `[${game.i18n!.localize('GURPS.CR' + this.cr)}: ${this.traitV2.name}]<br>` + this.traitV2.fea!.notes
      : this.traitV2.fea!.notes
  }

  get originalName(): string {
    return this.traitV2.name
  }

  get pageref(): string {
    return this.traitV2.fea!.pageref
  }

  get parentuuid(): string | null {
    return null
    // return this.traitV2.parentuuid ?? null
  }

  get points(): number {
    return this.traitV2.fea!.points
  }

  get uuid(): string {
    return this.traitV2.uuid ?? ''
  }
}

export { TraitV1 }
