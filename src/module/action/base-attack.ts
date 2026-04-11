import { fields } from '@gurps-types/foundry/index.js'
import { BaseDisplayAttack } from '@gurps-types/gurps/display-item.js'
import { parselink } from '@util/parselink.js'

import { BaseAction } from './base-action.js'

class BaseAttack<Schema extends BaseAttack.Schema = BaseAttack.Schema> extends BaseAction<Schema> {
  static override defineSchema(): BaseAttack.Schema {
    return {
      ...super.defineSchema(),
      ...baseAttackSchema(),
    }
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = [...super.LOCALIZATION_PREFIXES, 'GURPS.action.baseAttack']

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareDerivedData(): void {
    super.prepareDerivedData()
    this.#prepareLevelsFromOtf()

    if (Object.getOwnPropertyDescriptor(this, 'name') === undefined) {
      Object.defineProperty(this, 'name', {
        // Bind this property to the underlying name property, which may be overridden by legacy actions to return the name of the item.
        get: () => this._displayName,
        enumerable: true,
        configurable: true,
      })
    }
  }

  /* ---------------------------------------- */

  /**
   * Prepare the level of this skill based on an OTF formula.
   */
  #prepareLevelsFromOtf(): void {
    // Do not prepare levels if the item is not owned
    if (!this.item.isOwned) return

    let otf = this.otf

    if (otf === '') {
      this.level = this.import

      return
    }

    // Remove extraneous brackets
    otf = otf.match(/^\s*\[(.*)\]\s*$/)?.[1].trim() ?? otf

    // If the OTF is just a number, Set the level directly
    if (otf.match(/^\d+$/)) {
      this.import = parseInt(otf)
      this.level = this.import

      return
    }

    // If the OTF is not a number, parse it using the OTF parser.
    const action = parselink(otf)

    // If the OTF does not return an action, we cannot set the level.
    if (!action.action) {
      console.warn(`GURPS | ${this.documentName}: OTF "${otf}" did not return a valid action.`)

      return
    }

    action.action.calcOnly = true
    action.action.suppressWarnings = true
    // TODO: verify that target is of type "number" (or replace this whole thing)
    GURPS.performAction(action.action, this.actor).then(
      (result: boolean | { target: number; thing: any } | undefined) => {
        if (result && typeof result === 'object') {
          this.level = result.target
        }
      }
    )
  }

  /* ---------------------------------------- */

  override toDisplayItem(): BaseDisplayAttack {
    let fullName = this._displayName ?? ''

    if (fullName && this.mode) fullName += ` (${this.mode})`

    return foundry.utils.mergeObject(super.toDisplayItem(), {
      parentId: this.document.id!,
      name: this._displayName ?? '',
      fullName,
      usage: this.mode,
      notes: this.notes,
      hasNotes: this.notes.trim().length > 0,
      notesOpen: this.notesOpen,
      level: this.level,
      damage: this.damage.join(', '),
      st: this.st,
    })
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */
  get _displayName(): string | null {
    return this._source.name ?? (this.item as any)?.name ?? null
  }

  level: number = 0
}

const baseAttackSchema = () => {
  return {
    import: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // NOTE: Damage is an Array of strings to allow for multiple damage types dealing damage in one
    // attack, such as "2d-1cut and 1d+2 ctrl". Most of the time, this array has only one element.
    damage: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
      initial: [],
    }),
    consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    extraAttacks: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    itemModifiers: new fields.StringField({ required: true, nullable: false }),
    mode: new fields.StringField({ required: true, nullable: false }),
    modifierTags: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
    /** A boolean determining whether the Item notes are currently un-collapsed and visible on the character sheet. */
    notesOpen: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    otf: new fields.StringField({ required: true, nullable: false }),
    st: new fields.StringField({ required: true, nullable: false }),
  }
}

/* ---------------------------------------- */

namespace BaseAttack {
  export type Schema = BaseAction.Schema & ReturnType<typeof baseAttackSchema>
}

/* ---------------------------------------- */

export { BaseAttack, baseAttackSchema }
