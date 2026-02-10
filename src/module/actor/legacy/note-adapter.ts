import { arrayToObject } from '@util/utilities.js'

import { defineGetterProperties } from '../../util/object-utils.js'
import { CharacterModel } from '../data/character.js'
import { NoteV2 } from '../data/note.js'

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
  static updateNoteV2(notev2: any, changes: any) {
    const keys = Object.keys(changes)

    for (const key of keys) {
      switch (key) {
        case 'pageref':
          notev2.reference = changes[key]
          break
        case 'notes':
          notev2.text = changes[key]
          break
        default:
          notev2[key] = changes[key]
          break
      }
    }
  }

  private _contains: Record<string, NoteV1> = {}
  private get model(): CharacterModel {
    return this.noteV2.parent! as CharacterModel
  }

  constructor(noteV2: NoteV2) {
    this.noteV2 = noteV2

    defineGetterProperties(this, getterKeys)

    const containedItems: NoteV2[] = this.model.allNotes.filter(note => note.containedBy === this.noteV2.id)

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

  get title(): string {
    return this.noteV2.title
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

  toggleOpen(expandOnly: boolean = false) {
    return this.noteV2.toggleOpen(expandOnly)
  }

  update(noteV2: NoteV2) {
    noteV2.title = this.title
    noteV2.reference = this.pageref
    noteV2.markdown = this.markdown
    noteV2.text = this.notes
  }

  updateProperty(noteV2: NoteV2, property: string) {
    switch (property) {
      case 'title':
        noteV2.title = this.title
        break
      case 'pageref':
        noteV2.reference = this.pageref
        break
      case 'markdown':
        noteV2.markdown = this.markdown
        break
      case 'notes':
        noteV2.text = this.notes
        break
      default:
        console.warn(`NoteV1.updateProperty: Unknown property "${property}"`)
    }
  }
}

export { NoteV1 }
