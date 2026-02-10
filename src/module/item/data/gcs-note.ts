import { fields } from '@gurps-types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.js'

class GcsNoteModel extends GcsBaseItemModel<GcsNoteSchema> {
  static override defineSchema(): GcsNoteSchema {
    return gcsNoteSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: {},
      type: 'gcsNote',
      invalidActorTypes: [],
      actions: {},
      childTypes: [],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */
}

const gcsNoteSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    // NOTE: May need to be replaced with another field type later, as this field should
    // produce a markdown editor in the UI, and support inline JS code like GCS does.
    markdown: new fields.StringField({ required: true, nullable: false }),
  }
}

type GcsNoteSchema = ReturnType<typeof gcsNoteSchema>

/* ---------------------------------------- */

export { GcsNoteModel }
