import { arrayToObject } from '../../../lib/utilities.js'
import { defineGetterProperties } from '../../utilities/object-utils.js'
import { GurpsItemV2 } from '../gurps-item.js'

const getterKeys = [
  'addToQuickRoll',
  'collapsed',
  'consumeAction',
  'contains',
  'fromItem',
  'hasContains',
  'hasCollapsed',
  'import',
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
  'relativelevel',
  'save',
  'type',
  'uuid',
] as const

class SkillV1 {
  private _contains: Record<string, SkillV1>

  constructor(skillV2: GurpsItemV2<'skillV2'>) {
    this.skillV2 = skillV2

    defineGetterProperties(this, getterKeys)

    // Get contained items.
    const containedItems: GurpsItemV2<'skillV2'>[] =
      this.skillV2.actor?.items
        .filter(item => item.type === 'skillV2')
        .filter(item => item.containedBy === this.skillV2.id)
        .map(item => item as GurpsItemV2<'skillV2'>) || []
    this._contains = arrayToObject(
      containedItems?.map(item => new SkillV1(item)),
      5
    )
    this.save = false
  }

  skillV2: GurpsItemV2<'skillV2'>
  save: boolean

  // For each of the properties in getterKeys, define a getter that proxies to skillV2.system or skillV2 as appropriate.
  get addToQuickRoll(): boolean {
    return this.skillV2.addToQuickRoll
  }

  get collapsed(): Record<string, SkillV1> {
    return this.skillV2.system.open ? {} : this._contains
  }

  get consumeAction(): boolean {
    return this.skillV2.ski!.consumeAction
  }

  get contains(): Record<string, SkillV1> {
    return this.skillV2.system.open ? this._contains : {}
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
    return this.skillV2.ski?.import ?? 0
  }

  get itemInfo(): {
    id: string | null
    img: string | null
    name: string
  } {
    return {
      id: this.skillV2.id,
      img: this.skillV2.img ?? null,
      name: this.skillV2.name,
    }
  }

  get itemModifiers(): string {
    return this.skillV2.system.itemModifiers
  }

  get itemid(): string | null {
    return this.skillV2.id
  }

  get level(): number | null {
    return this.skillV2.ski?.level ?? null
  }

  get modifierTags(): string {
    return this.skillV2.system.modifierTags
  }

  get name(): string {
    const techlevel = this.skillV2.ski?.techlevel ? '/TL' + this.skillV2.ski.techlevel : ''
    const specialization = this.skillV2.ski?.specialization ? ' (' + this.skillV2.ski.specialization + ')' : ''
    return `${this.skillV2.name}${techlevel}${specialization}`
  }

  get notes(): string {
    const vttNotes = this.skillV2.system.ski?.vtt_notes
    const notes = this.skillV2.ski?.notes
    return [notes, vttNotes]
      .filter(it => !!it)
      .join('<br>')
      .trim()
  }

  get originalName(): string {
    return this.skillV2.ski?.originalName ?? this.skillV2.name
  }

  get pageref(): string {
    return this.skillV2.ski?.pageref ?? ''
  }

  get parentuuid(): string | null {
    return this.skillV2.ski?.parentuuid ?? null
  }

  get points(): number {
    return this.skillV2.ski?.points ?? 0
  }

  get relativelevel(): string {
    return this.skillV2.ski?.relativelevel ?? ''
  }

  get type(): string {
    return this.skillV2.type
  }

  get uuid(): string {
    return this.skillV2.uuid
  }
}
export { SkillV1 }
