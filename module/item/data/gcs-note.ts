import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { fields } from '../../types/foundry/index.ts'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsNoteModel extends GcsBaseItemModel<GcsNoteSchema> implements IReplaceable {
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
    ...replaceableSchema(),
    //  type NoteSyncData struct
    // MarkDown         string `json:"markdown,omitzero"`
    // PageRef          string `json:"reference,omitzero"`
    // PageRefHighlight string `json:"reference_highlight,omitzero"`
    //  type NoteEditData struct
    // NoteSyncData
    // Replacements map[string]string `json:"replacements,omitzero"`
    // type NoteData struct
    // SourcedID
    // NoteEditData
    // ThirdParty map[string]any `json:"third_party,omitzero"`
    // Children   []*Note        `json:"children,omitzero"` // Only for containers
    // parent     *Note
    // NOTE: May need to be replaced with another field type later, as this should
    // produce a markdown editor in the UI, and support inline JS like GCS does.
    markdown: new fields.StringField({ required: true, nullable: false }),
  }
}

type GcsNoteSchema = ReturnType<typeof gcsNoteSchema>

/* ---------------------------------------- */

export { GcsNoteModel }
