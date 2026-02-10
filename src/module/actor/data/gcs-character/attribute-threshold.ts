import { fields } from '@gurps-types/foundry/index.js'
import {
  PseudoDocument,
  PseudoDocumentMetadata,
  pseudoDocumentSchema,
} from '@module/pseudo-document/pseudo-document.js'

import { GcsCharacterModel } from './gcs-character.ts'
import { GcsThresholdOp } from './types.ts'

class AttributeThreshold extends PseudoDocument<AttributeThresholdSchema, GcsCharacterModel> {
  static OPS = GcsThresholdOp

  /* ---------------------------------------- */

  static override defineSchema(): AttributeThresholdSchema {
    return attributeThresholdSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'AttributeThreshold',
      label: '',
      icon: '',
      embedded: {},
    }
  }
}

/* ---------------------------------------- */

const attributeThresholdSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    sort: new fields.IntegerSortField({ required: true, nullable: false, initial: 0 }),
    state: new fields.StringField({ required: true, nullable: false }),
    value: new fields.StringField({ required: true, nullable: false }),
    explanation: new fields.StringField({ required: true, nullable: false }),
    // NOTE: STUB. This field is used to store operation names (as strings) which correspond to
    // halving values like ST, Move, etc. at the given threshold. There may be a better way of
    // storing this information.
    ops: new fields.SetField(
      new fields.StringField({ required: true, nullable: false, choices: Object.values(GcsThresholdOp) }),
      { required: true, nullable: false }
    ),
  }
}

type AttributeThresholdSchema = ReturnType<typeof attributeThresholdSchema>

/* ---------------------------------------- */

export { AttributeThreshold }
