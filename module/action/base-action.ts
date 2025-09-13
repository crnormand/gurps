import { PseudoDocumentMetadata } from '../pseudo-document/pseudo-document.js'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel
import { TypedPseudoDocument, TypedPseudoDocumentSchema } from '../pseudo-document/typed-pseudo-document.js'
import { AnyObject } from 'fvtt-types/utils'

class BaseAction<
  Schema extends BaseActionSchema = BaseActionSchema,
  Parent extends DataModel.Any = DataModel.Any,
> extends TypedPseudoDocument<Schema, Parent> {
  static override defineSchema(): BaseActionSchema {
    return Object.assign(super.defineSchema(), baseActionSchema())
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'Action',
      label: '',
      icon: '',
      embedded: {},
    }
  }

  get item(): Item.Implementation {
    return this.parent.parent
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
  }
}

type BaseActionSchema = TypedPseudoDocumentSchema & ReturnType<typeof baseActionSchema>

/* ---------------------------------------- */

export { BaseAction, type BaseActionSchema }
