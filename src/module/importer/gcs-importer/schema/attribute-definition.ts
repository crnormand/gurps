import { fields } from '@gurps-types/foundry/index.js'

import { GcsElement } from './base.js'

/* ---------------------------------------- */

class GcsAttributeDefinition extends GcsElement<AttributeDefinitionData> {
  static override defineSchema(): AttributeDefinitionData {
    return attributeDefinitionData()
  }

  /* ---------------------------------------- */

  get fullName(): string {
    if (!this.full_name) return this.name

    return this.full_name
  }
}

/* ---------------------------------------- */

const attributeDefinitionData = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    type: new fields.StringField({ required: true, nullable: false }),
    placement: new fields.StringField({ required: true, nullable: false }),
    name: new fields.StringField({ required: true, nullable: false }),
    full_name: new fields.StringField({ required: true, nullable: false }),
    base: new fields.StringField({ required: true, nullable: false }),
    cost_per_point: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    cost_adj_percent_per_sm: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

type AttributeDefinitionData = ReturnType<typeof attributeDefinitionData>

/* ---------------------------------------- */

export { GcsAttributeDefinition, attributeDefinitionData, type AttributeDefinitionData }
