import { fields } from '@gurps-types/foundry/index.js'
import { DisplayTrait } from '@gurps-types/gurps/display-item.js'
import { AnyMutableObject } from 'fvtt-types/utils'

import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'

class TraitModel extends BaseItemModel<TraitSchema> {
  static override defineSchema(): TraitSchema {
    return {
      ...super.defineSchema(),
      ...traitSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return foundry.utils.mergeObject(super.metadata, {
      type: 'featureV2',
      childTypes: ['featureV2'],
      sortKeys: {
        points: 'system.points',
      },
    })
  }

  /* ---------------------------------------- */

  get selfControlNote(): string {
    if (this.cr === null) return ''

    return '[' + game.i18n?.localize('GURPS.CR' + this.cr.toString()) + ': ' + this.parent.name + ']'
  }

  /* ---------------------------------------- */

  static override migrateData(source: AnyMutableObject): AnyMutableObject {
    super.migrateData(source)
    if (source.import) source.level ??= source.import || null

    return source
  }

  /* ---------------------------------------- */

  override toDisplayItem(): DisplayTrait {
    const fullName = this.level !== null ? `${this.parent.name} ${this.level}` : this.parent.name

    return foundry.utils.mergeObject(super.toDisplayItem(), {
      level: this.level,
      fullName,
      points: this.points,
      cr: this.cr,
      crOTF: this.selfControlNote,
    })
  }
}

/* ---------------------------------------- */

const traitSchema = () => {
  return {
    /** The level of the trait, which may be null if the trait is not leveled */
    level: new fields.NumberField({ required: true, nullable: true, initial: null }),

    /** The user description of this trait */
    userdesc: new fields.StringField({ required: true, nullable: false }),

    /** The total points spent on this trait */
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The Control Roll value for this trait, which may be null if not applicable */
    cr: new fields.NumberField({ required: true, nullable: true, initial: null }),
  }
}

type TraitSchema = BaseItemModelSchema & ReturnType<typeof traitSchema>

export { TraitModel, type TraitSchema }
