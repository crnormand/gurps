import { fields } from '@gurps-types/foundry/index.js'

import { BaseActorModel } from './base.js'

const GcsLootVersion = 5

/* ---------------------------------------- */

class GcsLootModel extends BaseActorModel<GcsLootSchema> {
  static override defineSchema(): GcsLootSchema {
    return gcsLootSchema()
  }
}

/* ---------------------------------------- */

const gcsLootSchema = () => {
  return {
    version: new fields.NumberField({ required: true, nullable: false, initial: GcsLootVersion }),
    tid: new fields.DocumentIdField({ required: true, nullable: false, initial: foundry.utils.randomID }),
    location: new fields.StringField({ required: true, nullable: false, initial: '' }),
    sessionId: new fields.StringField({ required: true, nullable: false, initial: '' }),
    modifiedOn: new fields.StringField({ required: true, nullable: false }),
  }
}

type GcsLootSchema = ReturnType<typeof gcsLootSchema>

/* ---------------------------------------- */

export { GcsLootModel }
