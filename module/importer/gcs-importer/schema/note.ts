import { fields } from '../../../types/foundry/index.js'

import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'

class GcsNote extends GcsItem<NoteData> {
  static override metadata = {
    childClass: GcsNote,
    modifierClass: null,
    weaponClass: null,
  }

  /* ---------------------------------------- */

  static override defineSchema(): NoteData {
    return {
      ...sourcedIdSchema(),
      ...noteData(),
    }
  }

  /* ---------------------------------------- */

  override get isContainer(): boolean {
    return this.id.startsWith('N')
  }
}

/* ---------------------------------------- */

const noteData = () => {
  return {
    // START: NoteData
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: NoteData

    // START: NoteEditData
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: NoteEditData

    // START: NoteSyncData
    // NOTE: Older v5 GCS used text field, newer ones use markdown.
    markdown: new fields.StringField({ required: true, nullable: true, initial: null }),
    text: new fields.StringField({ required: true, nullable: true, initial: null }),

    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    // END: NoteSyncData

    // START: calc
    calc: new fields.SchemaField(
      {
        resolved_notes: new fields.StringField({ required: true, nullable: true }),
      },
      { required: true, nullable: true }
    ),
    // END: calc
  }
}

type NoteData = SourcedIdSchema & ReturnType<typeof noteData>

/* ---------------------------------------- */

export { GcsNote, noteData }
