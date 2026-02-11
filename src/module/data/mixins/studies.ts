import { fields } from '@gurps-types/foundry/index.js'

import { CollectionField } from '../fields/collection-field.js'
import { ModelCollection } from '../model-collection.js'
import { Study } from '../study.js'

const studiesSchema = () => {
  return {
    study: new CollectionField(Study),
    studyHoursNeeded: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

/* ---------------------------------------- */

interface IStudies {
  // List of study entries contained within this item
  study: ModelCollection<Study>

  studyHoursNeeded: number
}

/* ---------------------------------------- */

export { studiesSchema, type IStudies }
