import { fields } from '../../types/foundry/index.js'
import { AttributePrereq, Prereq } from '../prereqs/index.ts'

const prereqHolderSchema = () => {
  return {
    prereqs: new fields.ArrayField(new fields.TypedSchemaField({ attributePrereq: AttributePrereq })),
  }
}

/* ---------------------------------------- */

interface IPrereqHolder {
  // List of prereqs contained within this holder
  prereqs: Prereq[]

  // process all contained prereqs
  processPrereqs(): void
}

/* ---------------------------------------- */

class PrereqHolder {}

/* ---------------------------------------- */

export { PrereqHolder, prereqHolderSchema, type IPrereqHolder }
