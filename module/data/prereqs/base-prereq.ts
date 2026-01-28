import { type GcsBaseItemModel } from '../../item/data/gcs-base.ts'
import { DataModel, fields } from '../../types/foundry/index.ts'

enum PrereqType {
  List = 'prereqList',
  Trait = 'traitPrereq',
  Attribute = 'attributePrereq',
  ContainedQuantity = 'containedQuantityPrereq',
  ContainedWeight = 'containedWeightPrereq',
  EquippedEquipment = 'equippedEquipment',
  Skill = 'skillPrereq',
  Spell = 'spellPrereq',
  Script = 'ScriptPrereq',
}

/* ---------------------------------------- */

class BasePrereq<Schema extends BasePrereqSchema> extends DataModel<Schema, GcsBaseItemModel> {
  static override defineSchema(): BasePrereqSchema {
    return basePrereqSchema()
  }

  /* ---------------------------------------- */

  static Type = PrereqType

  /* ---------------------------------------- */

  get item(): Item.Implementation | null {
    return this.parent?.item || null
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent?.actor || null
  }

  /* ---------------------------------------- */

  isSatisfied(): boolean {
    throw new Error(
      'Method "isSatisfied" is not implemented in the base class BasePrereqModel. It must be overridden in subclasses.'
    )
  }
}

/* ---------------------------------------- */

const basePrereqSchema = () => {
  return {
    type: new fields.StringField({ required: true, nullable: false, choices: PrereqType }),
  }
}

type BasePrereqSchema = ReturnType<typeof basePrereqSchema>

/* ---------------------------------------- */

export { BasePrereq, type BasePrereqSchema }
