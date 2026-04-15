import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

import { type PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '../pseudo-document/typed-pseudo-document.js'

/* ---------------------------------------- */

class BaseAction<
  Schema extends BaseAction.Schema = BaseAction.Schema,
  Parent extends DataModel.Any = DataModel.Any,
> extends TypedPseudoDocument<'Action', Schema, Parent> {
  static override defineSchema(): BaseAction.Schema {
    return Object.assign(super.defineSchema(), baseActionSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'Action'> {
    return foundry.utils.mergeObject(super.metadata, {
      documentName: 'Action',
      label: 'DOCUMENT.Action',
      sheetClass: GURPS.CONFIG.PseudoDocument.Sheets.Action,
    })
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = [...super.LOCALIZATION_PREFIXES, 'GURPS.action.baseAction']

  /* ---------------------------------------- */

  get item(): Item.Implementation {
    return this.parent.parent as Item.Implementation
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.item.parent
  }

  prepareSheetContext(): this {
    return this
  }

  /* ---------------------------------------- */

  applyBonuses(_bonuses: AnyObject[]): void {}
}

/* ---------------------------------------- */

const baseActionSchema = () => {
  return {
    /** Any images associated with this action. */
    img: new fields.FilePathField({
      categories: ['IMAGE'],
      base64: false,
      initial: () => 'icons/svg/sword.svg',
    }),

    /** Should this Action show up in the quick roll menu in the combat tracker? */
    addToQuickRoll: new fields.BooleanField({ required: true, nullable: false, initial: false }),

    /** Whether this Action is disabled. Disabled Actions are not shown in the UI. */
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

/* ---------------------------------------- */

namespace BaseAction {
  export type Schema = TypedPseudoDocument.Schema & ReturnType<typeof baseActionSchema>
}

/* ---------------------------------------- */

export { BaseAction, baseActionSchema }
