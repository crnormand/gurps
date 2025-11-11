import { defineGetterProperties } from '../../utilities/object-utils.js'
import { NoteV2 } from '../data/note.js'
import { arrayToObject } from '../../../lib/utilities.js'
import { CharacterModel } from '../data/character.js'

const getterKeys = [
  'uuid',
  'contains',
  'parentuuid',
  'notes',
  'pageref',
  'isCollapsed',
  'collapsed',
  'contains',
  'title',
  'markdown',
] as const

class NoteV1 {
  private _contains: Record<string, NoteV1> = {}
  private get model(): CharacterModel {
    return this.noteV2.parent! as CharacterModel
  }

  constructor(noteV2: NoteV2) {
    this.noteV2 = noteV2

    defineGetterProperties(this, getterKeys)

    const containedItems: NoteV2[] = this.model.allNotes.filter(n => n.containedBy === this.noteV2.id)
    this._contains = arrayToObject(
      containedItems?.map(item => new NoteV1(item)),
      5
    )

    this.save = false
  }

  noteV2: NoteV2
  save: boolean

  // Getter properties to map NoteV2 structure to legacy Note structure
  get uuid(): string {
    return this.noteV2.id
  }

  get contains(): Record<string, NoteV1> {
    return this.noteV2.open ? this._contains : {}
  }

  get collapsed(): Record<string, NoteV1> {
    return this.noteV2.open ? {} : this._contains
  }

  get parentuuid(): string {
    return this.noteV2.containedBy || ''
  }

  get notes(): string | null {
    return this.noteV2.resolvedContent
  }

  get markdown(): string | null {
    return this.noteV2.markdown
  }

  get pageref(): string {
    return this.noteV2.reference
  }

  get title(): string {
    return this.noteV2.title
  }
}

export { NoteV1 }
