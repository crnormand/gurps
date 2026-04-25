import { fields } from '@gurps-types/foundry/index.js'
import { DisplayTrait } from '@gurps-types/gurps/display-item.js'
import { getGame } from '@module/util/guards.js'
import { AnyMutableObject } from 'fvtt-types/utils'

import { ItemType } from '../types.js'

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
      type: ItemType.Trait,
      icon: 'fa-solid fa-theater-masks',
      childTypes: [ItemType.Trait],
      sortKeys: {
        points: 'system.points',
      },
      detailsPartial: ['item.partials.details-trait', 'item.partials.details-base'],
    })
  }

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static override getDefaultArtwork(itemData?: foundry.documents.BaseItem.CreateData): Item.GetDefaultArtworkReturn {
    return { img: 'icons/svg/book.svg' }
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, `GURPS.item.${this.metadata.type}`]

  /* ---------------------------------------- */

  /** Returns the cr value as a select-safe string key: '' for null, or the numeric string otherwise. */
  get crKey(): string {
    return this.cr?.toString() ?? ''
  }

  /* ---------------------------------------- */

  get selfControlNote(): string {
    if (this.cr === null) return ''

    return '[' + getGame().i18n.localize('GURPS.CR' + this.cr.toString()) + ': ' + this.parent.name + ']'
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
      cr: this.cr !== null ? `GURPS.CR${this.cr}` : null,
      enabled: this.enabled,
      otf: {
        cr: this.selfControlNote,
      },
    })
  }
}

/* ---------------------------------------- */

const traitSchema = () => {
  const crChoices = Object.fromEntries(
    ['', 0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(key => [
      key,
      `GURPS.item.feature.crChoices.${key === '' ? 'none' : key}`,
    ])
  )

  return {
    /** The level of the trait, which may be null if the trait is not leveled */
    level: new fields.NumberField({ required: true, nullable: true, initial: null }),

    /** The user description of this trait */
    userdesc: new fields.StringField({ required: true, nullable: false }),

    /** The total points spent on this trait */
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The Control Roll value for this trait, which may be null if not applicable */
    cr: new fields.NumberField({ required: true, nullable: true, initial: null, choices: crChoices }),
  }
}

type TraitSchema = BaseItemModelSchema & ReturnType<typeof traitSchema>

export { TraitModel, type TraitSchema }
