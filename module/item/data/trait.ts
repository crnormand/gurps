import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'
import { ItemComponent, ItemComponentSchema } from './component.js'
import fields = foundry.data.fields
import { AnyMutableObject } from 'fvtt-types/utils'

class TraitModel extends BaseItemModel<TraitSchema> {
  static override defineSchema(): TraitSchema {
    return {
      ...super.defineSchema(),
      ...traitSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return {
      embedded: {},
      type: 'featureV2',
      invalidActorTypes: [],
      actions: {},
      childTypes: ['featureV2'],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */

  get component(): TraitComponent {
    return this.fea
  }

  /* ---------------------------------------- */

  get selfControlNote(): string {
    if (this.component.cr === null) return ''
    return '[' + game.i18n?.localize('GURPS.CR' + this.component.cr.toString()) + ': ' + this.parent.name + ']'
  }

  /* ---------------------------------------- */

  static override migrateData(source: AnyMutableObject): AnyMutableObject {
    super.migrateData(source)
    if (source.import) source.level ??= source.import || null

    return source
  }
}
/* ---------------------------------------- */

class TraitComponent extends ItemComponent<TraitComponentSchema> {
  static override defineSchema(): TraitComponentSchema {
    return {
      ...super.defineSchema(),
      ...traitComponentSchema(),
    }
  }
}

/* ---------------------------------------- */

const traitSchema = () => {
  return {
    fea: new fields.EmbeddedDataField(TraitComponent, { required: true, nullable: false }),
  }
}
type TraitSchema = BaseItemModelSchema & ReturnType<typeof traitSchema>

/* ---------------------------------------- */

const traitComponentSchema = () => {
  return {
    level: new fields.NumberField({ required: true, nullable: true }),

    // NOTE: Change from previous schema. "note" is no longer used, and userdesc and notes are kept separate.
    userdesc: new fields.StringField({ required: true, nullable: false }),

    points: new fields.NumberField({ required: true, nullable: false }),
    cr: new fields.NumberField({ required: true, nullable: true, initial: null }),
  }
}
type TraitComponentSchema = ItemComponentSchema & ReturnType<typeof traitComponentSchema>

/* ---------------------------------------- */

export { TraitModel, type TraitSchema, TraitComponent, type TraitComponentSchema }
