import { GcsBaseItemModel } from '../../item/data/gcs-base.ts'
import { DataModel, fields } from '../../types/foundry/index.ts'
import { IPrereqs } from '../mixins/prereqs.ts'

enum PrereqType {
  List = 'prereqList',
  Trait = 'traitPrereq',
  Attribute = 'attributePrereq',
  ContainedQuantity = 'containedQuantityPrereq',
  ContainedWeight = 'containedWeightPrereq',
  EquippedEquipment = 'equippedEquipment',
  Skill = 'skillPrereq',
  Spell = 'spellPrereq',
  Script = 'scriptPrereq',
}

/* ---------------------------------------- */

class BasePrereq<Schema extends BasePrereqSchema> extends DataModel<Schema, GcsBaseItemModel & IPrereqs> {
  static override defineSchema(): BasePrereqSchema {
    // Defualt to Trait Prereq
    return basePrereqSchema({ type: PrereqType.Trait })
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

  get isSatisfied(): boolean {
    throw new Error(
      'Method "isSatisfied" is not implemented in the base class BasePrereqModel. It must be overridden in subclasses.'
    )
  }
}

/* ---------------------------------------- */

const basePrereqSchema = (options: { type: PrereqType }) => {
  return {
    // The unique ID of this prerequisite
    id: new fields.DocumentIdField({
      required: true,
      nullable: false,
      blank: false,
      initial: () => foundry.utils.randomID(),
    }),
    // The ID of the parent container, if any. A value of `null` means the prereq is at the top level,
    // which applies only to the top-level prerequisite list of an item.
    containerId: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
    type: new fields.StringField({
      required: true,
      nullable: false,
      blank: false,
      choices: Object.values(PrereqType),
      initial: options.type,
    }),
  }
}

type BasePrereqSchema = ReturnType<typeof basePrereqSchema>

/* ---------------------------------------- */

export { BasePrereq, basePrereqSchema, type BasePrereqSchema, PrereqType }
