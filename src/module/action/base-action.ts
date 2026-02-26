import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

import { type PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '../pseudo-document/typed-pseudo-document.js'

enum ActionType {
  MeleeAttack = 'meleeAttack',
  RangedAttack = 'rangedAttack',
}

/* ---------------------------------------- */

class BaseAction<
  Schema extends BaseAction.Schema = BaseAction.Schema,
  Parent extends DataModel.Any = DataModel.Any,
> extends TypedPseudoDocument<Schema, Parent> {
  declare parent: Parent
  static override defineSchema(): BaseAction.Schema {
    return Object.assign(super.defineSchema(), baseActionSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'Action'> {
    return {
      documentName: 'Action',
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

/* ---------------------------------------- */

namespace BaseAction {
  export type Schema = TypedPseudoDocument.Schema & ReturnType<typeof baseActionSchema>
}

/* ---------------------------------------- */

export { ActionType, BaseAction }
