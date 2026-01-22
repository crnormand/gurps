import { arrayToObject } from '../../../lib/utilities.js'
import { defineGetterProperties } from '../../utilities/object-utils.js'
import { GurpsItemV2 } from '../gurps-item.js'

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

  constructor(spellV2: GurpsItemV2<'spellV2'>) {
    this.spellV2 = spellV2

    defineGetterProperties(this, getterKeys)

    // Get contained items.
    const containedItems: GurpsItemV2<'spellV2'>[] = this.spellV2.sortedContents.map(
      item => item as GurpsItemV2<'spellV2'>
    )

    this._contains = arrayToObject(
      containedItems?.map(item => new SpellV1(item)),
      5
    )

    this.save = false
  }

  spellV2: GurpsItemV2<'spellV2'>
  save: boolean

  // For each of the properties in getterKeys, define a getter that proxies to spellV2.system or spellV2 as appropriate.
  get addToQuickRoll(): boolean {
    return this.spellV2.addToQuickRoll
  }

  get casttime(): string | null {
    return this.spellV2.spl?.casttime ?? null
  }

  get collapsed(): Record<string, SpellV1> {
    return this.spellV2.system.open ? {} : this._contains
  }

  get college(): string | null {
    return this.spellV2.spl?.college ?? null
  }

  get consumeAction(): boolean {
    return this.spellV2.spl?.consumeAction ?? false
  }

  get contains(): Record<string, SpellV1> {
    return this.spellV2.system.open ? this._contains : {}
  }

  get cost(): string | null {
    return this.spellV2.spl?.cost ?? null
  }

  get difficulty(): string | null {
    return this.spellV2.spl?.difficulty ?? null
  }

  get duration(): string | null {
    return this.spellV2.spl?.duration ?? null
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
    return this.spellV2.spl?.import ?? 0
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
    return this.spellV2.spl?.level ?? null
  }

  get maintain(): string | null {
    return this.spellV2.spl?.maintain ?? null
  }

  get modifierTags(): string {
    return this.spellV2.system.modifierTags
  }

  get name(): string {
    return this.spellV2.name
  }

  get notes(): string {
    const vttNotes = this.spellV2.system.spl?.vtt_notes
    const notes = this.spellV2.system.spl?.notes

    return [notes, vttNotes]
      .filter(it => !!it)
      .join('<br>')
      .trim()
  }

  get originalName(): string {
    return this.spellV2.name
  }

  get pageref(): string | null {
    return this.spellV2.spl?.pageref ?? null
  }

  get parentuuid(): string | null {
    return this.spellV2.parent?.uuid ?? null
  }

  get points(): number {
    return this.spellV2.spl?.points ?? 0
  }

  get relativelevel(): string {
    return this.spellV2.spl?.relativelevel ?? ''
  }

  get resist(): string | null {
    return this.spellV2.spl?.resist ?? null
  }

  get uuid(): string {
    return this.spellV2.uuid
  }

  toggleOpen(expandOnly: boolean = false) {
    return this.spellV2.toggleOpen(expandOnly)
  }
}

export { SpellV1 }
