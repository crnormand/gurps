import { IPrereqs } from '../data/mixins/prereqs.ts'
import { GcsBaseItemModel } from '../item/data/gcs-base.ts'
import { PseudoDocumentMetadata } from '../pseudo-document/pseudo-document.ts'
import { TypedPseudoDocument, TypedPseudoDocumentSchema } from '../pseudo-document/typed-pseudo-document.ts'
import { fields } from '../types/foundry/index.ts'

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

class BasePrereq<Schema extends BasePrereqSchema> extends TypedPseudoDocument<Schema, GcsBaseItemModel & IPrereqs> {
  static override defineSchema(): BasePrereqSchema {
    return Object.assign(super.defineSchema(), basePrereqSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'Prereq',
      label: '',
      icon: '',
      embedded: {},
    }
  }

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
      'Method "isSatisfied" is not implemented in the base class BasePrereq. It must be overridden in subclasses.'
    )
  }

  /* ---------------------------------------- */

  get unsatisifedMessage(): string {
    throw new Error(
      'Method "unsatisifedMessage" is not implemented in the base class BasePrereq. It must be overridden in subclasses.'
    )
  }
}

/* ---------------------------------------- */

const basePrereqSchema = () => {
  return {
    containerId: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
  }
}

type BasePrereqSchema = TypedPseudoDocumentSchema & ReturnType<typeof basePrereqSchema>

/* ---------------------------------------- */

export { BasePrereq, basePrereqSchema, type BasePrereqSchema, PrereqType }
