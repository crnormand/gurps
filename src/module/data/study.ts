import { fields } from '@gurps-types/foundry/index.js'
import {
  PseudoDocument,
  PseudoDocumentMetadata,
  pseudoDocumentSchema,
} from '@module/pseudo-document/pseudo-document.js'

class Study extends PseudoDocument<StudySchema> {
  static override defineSchema(): StudySchema {
    return studySchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'Study',
      label: '',
      icon: '',
      embedded: {},
    }
  }
}

/* ---------------------------------------- */

const studySchema = () => {
  return {
    ...pseudoDocumentSchema(),
    type: new fields.StringField({ required: true, nullable: false }),
    hours: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    note: new fields.StringField({ required: true, nullable: false }),
  }
}

type StudySchema = ReturnType<typeof studySchema>

/* ---------------------------------------- */

export { Study, studySchema, type StudySchema }
