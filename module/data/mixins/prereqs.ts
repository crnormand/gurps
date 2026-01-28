import { fields } from '../../types/foundry/index.ts'
import { AttributePrereq, Prereq, PrereqClass } from '../prereqs/index.ts'

const prereqsSchema = (types: Record<string, PrereqClass> = { attributePrereq: AttributePrereq }) => {
  return {
    prereqs: new fields.ArrayField(new fields.TypedSchemaField(types)),
  }
}

/* ---------------------------------------- */

interface IPrereqs {
  // List of prereqs contained within this item
  prereqs: Prereq[]

  // process all contained prereqs
  processPrereqs(): void
}

/* ---------------------------------------- */

export { prereqsSchema, type IPrereqs }
