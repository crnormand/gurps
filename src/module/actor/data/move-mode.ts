import { fields } from '@gurps-types/foundry/index.js'
import { PseudoDocument, pseudoDocumentSchema } from '@module/pseudo-document/pseudo-document.js'

class MoveModeV2 extends PseudoDocument<MoveSchema> {
  static override defineSchema(): MoveSchema {
    return moveSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'MoveMode'> {
    return {
      documentName: 'MoveMode',
      icon: '',
      embedded: {},
    }
  }
}

/* ---------------------------------------- */

const moveSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    mode: new fields.StringField({ required: true, nullable: false }),
    basic: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    enhanced: new fields.NumberField({ required: true, nullable: true }),
    default: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

type MoveSchema = ReturnType<typeof moveSchema>

/* ---------------------------------------- */

export { MoveModeV2 }
