import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { PseudoDocument, pseudoDocumentSchema } from '@module/pseudo-document/pseudo-document.js'

class MoveModeV2 extends PseudoDocument<MoveSchema> {
  static override defineSchema(): MoveSchema {
    return moveSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'MoveMode'> {
    return foundry.utils.mergeObject(super.metadata, {
      documentName: 'MoveMode',
      label: 'DOCUMENT.MoveMode',
    })
  }
}

/* ---------------------------------------- */

const moveSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    /* The name of this move mode */
    mode: new fields.StringField({ required: true, nullable: false }),
    /* The "basic" value of this move mode, this is the normal move value for the mode. */
    basic: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    /* The enhanced move value for this move mode.*/
    enhanced: new fields.NumberField({ required: true, nullable: true }),
  }
}

type MoveSchema = ReturnType<typeof moveSchema>

function groundMoveForBasicMove(move: number): DataModel.CreateData<MoveSchema> {
  return {
    _id: foundry.utils.randomID(),
    name: '',
    mode: 'GURPS.moveModeGround',
    basic: move,
    enhanced: 0,
    sort: 0,
  }
}

/* ---------------------------------------- */

export { MoveModeV2, groundMoveForBasicMove }
