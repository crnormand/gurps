import { defineGetterProperties } from '../../utilities/object-utils.js'
import { arrayToObject } from '../../../lib/utilities.js'
import { GurpsItemV2 } from '../gurps-item.js'

// Make selected prototype getters enumerable own properties so Object.values() includes them.
const getterKeys = [
  'addToQuickRoll',
  'collapsed',
  'contains',
  'cr',
  'disabled',
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

class TraitV1 {
  private _contains: Record<string, TraitV1>

  constructor(traitV2: GurpsItemV2<'featureV2'>) {
    this.traitV2 = traitV2

    defineGetterProperties(this, getterKeys)

    // Get contained items.
    const containedItems: GurpsItemV2<'featureV2'>[] = this.traitV2.sortedContents.map(
      it => it as GurpsItemV2<'featureV2'>
    )
    this._contains = arrayToObject(
      containedItems?.map(item => new TraitV1(item)),
      5
    )

    this.save = false
  }

  traitV2: GurpsItemV2<'featureV2'>
  save: boolean

  get addToQuickRoll(): boolean {
    return this.traitV2.addToQuickRoll
  }

  get contains(): Record<string, TraitV1> {
    return this.traitV2.system.open ? this._contains : {}
  }

  get collapsed(): Record<string, TraitV1> {
    return this.traitV2.system.open ? {} : this._contains
  }

  get cr(): number | null {
    return this.traitV2.fea!.cr
  }

  get disabled(): boolean {
    return this.traitV2.disabled
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
    return this.traitV2.system.modifierTags ?? ''
  }

  get name(): string {
    return this.level ? `${this.traitV2.name} ${this.level}` : this.traitV2.name
  }

  get notes(): string {
    const notes = [
      this.cr ? `[${game.i18n!.localize('GURPS.CR' + this.cr)}: ${this.traitV2.name}]` : '',
      this.traitV2.fea!.notes ?? '',
      this.traitV2.fea!.vtt_notes ?? '',
    ]
      .filter(it => it)
      .join('<br>')
      .trim()
    return notes
  }

  get originalName(): string {
    return this.traitV2.name
  }

  get pageref(): string {
    return this.traitV2.fea!.pageref
  }

  get parentuuid(): string | null {
    return this.traitV2.containedBy || null
  }

  get points(): number {
    return this.traitV2.fea!.points
  }

  get uuid(): string {
    return this.traitV2.uuid ?? ''
  }

  toggleOpen(expandOnly: boolean = false) {
    return this.traitV2.toggleOpen(expandOnly)
  }

  static getUpdateData(newData: Partial<TraitV1>, traitv1?: TraitV1): Record<string, any> {
    const updateData: Record<string, any> = {}

    // For each property in newData, map to traitV2 system properties.
    for (const key of Object.keys(newData) as (keyof TraitV1)[]) {
      switch (key) {
        case 'cr':
        case 'level':
        case 'points':
          updateData.fea = updateData.fea || {}
          updateData.fea[key] = typeof newData[key] === 'string' ? parseInt(newData[key]) : newData[key]
          break

        case 'collapsed':
          updateData['open'] = false
          break

        case 'contains':
          updateData['open'] = true
          break

        case 'name':
        case 'notes':
          // Handled after the loop.
          break

        case 'pageref':
          updateData.fea = updateData.fea || {}
          updateData.fea['pageref'] = newData.pageref
          break

        case 'parentuuid':
          updateData['containedBy'] = newData.parentuuid
          break

        // Add more mappings as needed.
        case 'addToQuickRoll':
        case 'disabled':
        case 'itemModifiers':
        case 'modifierTags':
        default:
          updateData[key] = (newData as any)[key]
          break
      }
    }

    // if newData contains 'name', process it after all other properties.
    if (Object.keys(newData).includes('name')) {
      const level = newData.level ?? traitv1?.level ?? null
      const nameWithoutLevel = newData.name!.replace(new RegExp(`\\s${level}$`), '')
      updateData['name'] = nameWithoutLevel
    }

    if (Object.keys(newData).includes('notes')) {
      const cr = newData.cr ?? traitv1?.cr ?? null
      const crText = game.i18n!.localize('GURPS.CR' + cr)
      // Escape special regex characters in crText (parentheses, etc.)
      const escapedCrText = crText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      let notesWithoutCR = newData.notes!.replace(new RegExp(`^\\[${escapedCrText}:.*?\\]`), '')
      if (notesWithoutCR.startsWith('<br/>')) notesWithoutCR = notesWithoutCR.substring(5)

      updateData.fea['notes'] = notesWithoutCR
      updateData.fea['vtt_notes'] = ''
    }

    return updateData
  }
}

export { TraitV1 }
