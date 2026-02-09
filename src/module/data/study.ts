import { DataModel, fields } from '@gurps-types/foundry/index.js'

class Study extends DataModel<StudySchema> {
  static override defineSchema(): StudySchema {
    return studySchema()
  }
}

/* ---------------------------------------- */

const studySchema = () => {
  return {
    // Type  study.Type `json:"type"`
    // Hours fxp.Int    `json:"hours"`
    // Note  string     `json:"note,omitzero"`
    type: new fields.StringField({ required: true, nullable: false }),
    hours: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    note: new fields.StringField({ required: true, nullable: false }),
  }
}

type StudySchema = ReturnType<typeof studySchema>

/* ---------------------------------------- */

export { Study, studySchema, type StudySchema }
