import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

import { PseudoDocumentMetadata } from '../pseudo-document/pseudo-document.js'
import { TypedPseudoDocument, TypedPseudoDocumentSchema } from '../pseudo-document/typed-pseudo-document.js'

enum ActionType {
  MeleeAttack = 'meleeAttack',
  RangedAttack = 'rangedAttack',
}

/* ---------------------------------------- */

class BaseAction<
  Schema extends BaseActionSchema = BaseActionSchema,
  Parent extends DataModel.Any = DataModel.Any,
> extends TypedPseudoDocument<Schema, Parent> {
  declare parent: Parent
  static override defineSchema(): BaseActionSchema {
    return Object.assign(super.defineSchema(), baseActionSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata<'Action'> {
    return {
      documentName: 'Action',
      label: '',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  get item(): Item.Implementation {
    return this.parent.parent as Item.Implementation
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.item.parent
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  prepareSheetContext(): this {
    return this
  }

  /* ---------------------------------------- */

  applyBonuses(_bonuses: AnyObject[]): void {}
}

/* ---------------------------------------- */

const baseActionSchema = () => {
  return {
    name: new fields.StringField({ initial: undefined }),
    img: new fields.FilePathField({ initial: undefined, categories: ['IMAGE'], base64: false }),
    sort: new fields.IntegerSortField(),

    // Added to allow disabling from containing Trait.
    containedBy: new fields.StringField({ required: true, nullable: false }),
    // Added to support QuickRoll menu.
    addToQuickRoll: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

type BaseActionSchema = TypedPseudoDocumentSchema & ReturnType<typeof baseActionSchema>

/* ---------------------------------------- */

export { ActionType, BaseAction, type BaseActionSchema }
