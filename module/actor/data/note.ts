import { CharacterModel } from './character.js'
import { IContainable, containableSchema } from '../../data/mixins/containable.js'
import { ContainerUtils } from '../../data/mixins/container-utils.js'
import fields = foundry.data.fields

/* ---------------------------------------- */

// TODO: GCS now stores notes as MarkDown. Do we store the markdown text, or the rendered HTML?

/**
 * Data model for character notes in GURPS V2 system.
 * Represents a single note that can contain markdown content and be organized hierarchically.
 */
class NoteV2 extends foundry.abstract.DataModel<NoteV2Schema> implements IContainable<NoteV2> {
  static override defineSchema(): NoteV2Schema {
    return noteV2Schema()
  }

  /* ---------------------------------------- */

  /**
   * Create a new NoteV2 instance from a plain object.
   * @param data - The source data for the note
   * @returns A new NoteV2 instance
   */
  static fromObject(data: Partial<fields.SchemaField.SourceData<NoteV2Schema>>): NoteV2 {
    return new NoteV2(data)
  }

  /* ---------------------------------------- */

  /**
   * Convert this note to a plain object suitable for storage.
   * @returns Plain object representation of the note
   */
  override toObject(): fields.SchemaField.SourceData<NoteV2Schema> {
    return super.toObject()
  }

  /* ---------------------------------------- */

  /* ---------------------------------------- */
  /*  IContainable Interface Implementation   */
  /* ---------------------------------------- */

  get container(): NoteV2 | null {
    return (this.parent! as CharacterModel).allNotes.find(note => note.id === this.containedBy) ?? null
  }

  get isContained(): boolean {
    return !!this.container
  }

  get contents(): NoteV2[] {
    return (this.parent! as CharacterModel).allNotes.filter(note => note.containedBy === this.id)
  }

  get allContents(): NoteV2[] {
    return ContainerUtils.getAllContents(this)
  }

  get containerDepth(): number {
    return ContainerUtils.getContainerDepth(this)
  }

  contains(note: NoteV2): boolean {
    return ContainerUtils.contains(this, note)
  }

  get ancestors(): NoteV2[] {
    return ContainerUtils.getAncestors(this)
  }

  getDescendants(filter?: (note: NoteV2) => boolean): NoteV2[] {
    return ContainerUtils.getDescendants(this, filter)
  }

  isContainedBy(container: NoteV2): boolean {
    return ContainerUtils.isContainedBy(this, container)
  }

  /* ---------------------------------------- */

  /**
   * Toggle the open/collapsed state of this note
   * @param expandOnly - If true, only expand (don't collapse)
   */
  async toggleOpen(expandOnly: boolean = false): Promise<void> {
    if (expandOnly && this.open) return

    const newValue = !this.open

    // Notes are embedded in the character, so we need to update through the character
    const character = this.parent! as CharacterModel
    const noteIndex = character.allNotes.findIndex(note => note.id === this.id)
    if (noteIndex === -1) return

    const notes = foundry.utils.deepClone(character._source.allNotes)
    notes[noteIndex].open = newValue
    await character.parent.update({ system: { allNotes: notes } })
  }

  /* ---------------------------------------- */

  /**
   * Legacy method for compatibility - delegates to toggleOpen
   * @param expandOnly - If true, only expand (don't collapse)
   * @deprecated Use toggleOpen instead
   */
  async toggleCollapsed(expandOnly: boolean = false): Promise<void> {
    return this.toggleOpen(expandOnly)
  }

  /* ---------------------------------------- */

  /**
   * Get the resolved markdown content, using the calculated value if available.
   * @returns The resolved markdown content
   */
  get resolvedContent(): string | null {
    return !!this.calc?.resolved_notes ? this.calc.resolved_notes : this.text
  }
}

/* ---------------------------------------- */

const noteV2Schema = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false, initial: () => foundry.utils.randomID() }),
    // NOTE: Change from GCS schema -- Nordlond bestiaries sometimes have a title field.
    title: new fields.StringField({ required: true, nullable: false, initial: '' }),
    text: new fields.StringField({ required: true, nullable: true, initial: null }),
    markdown: new fields.StringField({ required: true, nullable: true, initial: null }),
    reference: new fields.StringField({ required: true, nullable: false, initial: '' }),
    reference_highlight: new fields.StringField({ required: true, nullable: false, initial: '' }),
    ...containableSchema(),
    calc: new fields.SchemaField(
      {
        resolved_notes: new fields.StringField({ required: false, nullable: true, initial: null }),
      },
      { required: false, nullable: true, initial: null }
    ),
  }
}

type NoteV2Schema = ReturnType<typeof noteV2Schema>

/* ---------------------------------------- */

export { NoteV2, noteV2Schema, type NoteV2Schema }
