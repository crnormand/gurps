import { defineGetterProperties } from '@util/object-utils.js'
import { arrayToObject } from '@util/utilities.js'

import { ItemType } from '../types.js'

const getterKeys = [
  'addToQuickRoll',
  'casttime',
  'collapsed',
  'college',
  'consumeAction',
  'contains',
  'cost',
  'difficulty',
  'duration',
  'fromItem',
  'hasContains',
  'hasCollapsed',
  'import',
  'itemInfo',
  'itemModifiers',
  'itemid',
  'level',
  'maintain',
  'modifierTags',
  'name',
  'notes',
  'originalName',
  'pageref',
  'parentuuid',
  'points',
  'relativelevel',
  'resist',
  'save',
  'uuid',
]

class SpellV1 {
  private _contains: Record<string, SpellV1>

  constructor(spellV2: Item.OfType<ItemType.Spell>) {
    this.spellV2 = spellV2

    defineGetterProperties(this, getterKeys)

    // Get contained items.
    const containedItems: Item.OfType<ItemType.Spell>[] = this.spellV2.sortedContents.map(
      item => item as Item.OfType<ItemType.Spell>
    )

    this._contains = arrayToObject(
      containedItems?.map(item => new SpellV1(item)),
      5
    )

    this.save = false
  }

  spellV2: Item.OfType<ItemType.Spell>
  save: boolean

  // For each of the properties in getterKeys, define a getter that proxies to spellV2.system or spellV2 as appropriate.
  get addToQuickRoll(): boolean {
    return this.spellV2.addToQuickRoll
  }

  get casttime(): string | null {
    return this.spellV2.system?.casttime ?? null
  }

  get collapsed(): Record<string, SpellV1> {
    return this.spellV2.system.open ? {} : this._contains
  }

  get college(): string | null {
    return [...this.spellV2.system.college].join(', ')
  }

  get consumeAction(): boolean {
    return this.spellV2.system?.consumeAction ?? false
  }

  get contains(): Record<string, SpellV1> {
    return this.spellV2.system.open ? this._contains : {}
  }

  get cost(): string | null {
    return this.spellV2.system?.cost ?? null
  }

  get difficulty(): string | null {
    return this.spellV2.system?.difficulty ?? null
  }

  get duration(): string | null {
    return this.spellV2.system?.duration ?? null
  }

  get fromItem(): string | null {
    return null
  }

  get hasContains(): boolean {
    return Object.keys(this.contains).length > 0
  }

  get hasCollapsed(): boolean {
    return Object.keys(this.collapsed).length > 0
  }

  get import(): number {
    return this.spellV2.system?.importedLevel ?? 0
  }

  get itemInfo(): {
    id: string | null
    img: string | null
    name: string
  } {
    return {
      id: this.spellV2.id,
      img: this.spellV2.img ?? null,
      name: this.spellV2.name,
    }
  }

  get itemModifiers(): string {
    return this.spellV2.system.itemModifiers
  }

  get itemid(): string | null {
    return this.spellV2.id
  }

  get level(): number | null {
    return this.spellV2.system?.level ?? null
  }

  get maintain(): string | null {
    return this.spellV2.system?.maintain ?? null
  }

  get modifierTags(): string {
    return [...this.spellV2.system.modifierTags].join(', ')
  }

  get name(): string {
    return this.spellV2.name
  }

  get notes(): string {
    const vttNotes = this.spellV2.system.vtt_notes
    const notes = this.spellV2.system.notes

    return [notes, vttNotes]
      .filter(it => !!it)
      .join('<br>')
      .trim()
  }

  get originalName(): string {
    return this.spellV2.name
  }

  get pageref(): string | null {
    return this.spellV2.system?.pageref ?? null
  }

  get parentuuid(): string | null {
    return this.spellV2.parent?.uuid ?? null
  }

  get points(): number {
    return this.spellV2.system.points ?? 0
  }

  get relativelevel(): string {
    return this.spellV2.system?.relativelevel ?? ''
  }

  get resist(): string | null {
    return this.spellV2.system?.resist ?? null
  }

  get uuid(): string | null {
    return this.spellV2.uuid
  }

  toggleOpen(expandOnly: boolean = false) {
    return this.spellV2.toggleOpen(expandOnly)
  }
}

export { SpellV1 }
