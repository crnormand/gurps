import { fields } from '../../types/foundry/index.ts'
import { Study } from '../study.ts'

const studiesSchema = () => {
  return {
    study: new fields.ArrayField(new fields.EmbeddedDataField(Study)),
    studyHoursNeeded: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

/* ---------------------------------------- */

interface IStudies {
  // List of study entries contained within this item
  study: Study[]

  studyHoursNeeded: number
}

/* ---------------------------------------- */

export { studiesSchema, type IStudies }
