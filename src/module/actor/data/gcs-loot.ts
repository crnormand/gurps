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
    // type LootData struct
    // Version    int          `json:"version"`
    // ID         tid.TID      `json:"id"`
    // Name       string       `json:"name,omitzero"`
    // Location   string       `json:"location,omitzero"`
    // Session    string       `json:"session,omitzero"`
    // ModifiedOn jio.Time     `json:"modified_date"`
    // Equipment  []*Equipment `json:"equipment,omitzero"`
    // Notes      []*Note      `json:"notes,omitzero"`
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
