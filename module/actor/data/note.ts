import { CharacterModel } from './character.js'
import fields = foundry.data.fields

/* ---------------------------------------- */

// TODO: GCS now stores notes as MarkDown. Do we store the markdown text, or the rendered HTML?

/**
 * Data model for character notes in GURPS V2 system.
 * Represents a single note that can contain markdown content and be organized hierarchically.
 */
class NoteV2 extends foundry.abstract.DataModel<NoteV2Schema> {
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

  get contents(): NoteV2[] {
    return (this.parent! as CharacterModel).allNotes.filter(note => note.containedBy === this.id)
  }

  get container(): NoteV2 | null {
    return (this.parent! as CharacterModel).allNotes.find(note => note.id === this.containedBy) ?? null
  }

  get isContained(): boolean {
    return !!this.container
  }

  get containerDepth(): number {
    if (!this.isContained) return 0
    return 1 + this.container!.containerDepth
  }

  /* ---------------------------------------- */

  /**
   * Check if this note is a top-level note (not contained by another note).
   * @returns True if this is a top-level note
   */
  isTopLevel(): boolean {
    return this.containedBy === null
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
    open: new fields.BooleanField({ required: true, nullable: true, initial: true }),
    containedBy: new fields.StringField({ required: true, nullable: true, initial: null }),
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
