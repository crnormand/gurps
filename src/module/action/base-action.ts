import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { parselink } from '@util/parselink.js'
import { AnyObject } from 'fvtt-types/utils'

import { type PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '../pseudo-document/typed-pseudo-document.js'

import { BaseAttackComponent } from './component.ts'
import { ActionType } from './types.ts'

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

  override prepareBaseData(): void {
    super.prepareBaseData()
    this.#prepareLevelsFromOtf()
  }

  /* ---------------------------------------- */

  /**
   * Prepare the level of this skill based on an OTF formula.
   */
  #prepareLevelsFromOtf(): void {
    // Do not prepare levels if the item is not owned
    if (!this.item.isOwned) return

    const hasComponent = (obj: unknown): obj is { component: BaseAttackComponent } =>
      this.isOfType(ActionType.MeleeAttack, ActionType.RangedAttack)

    if (!hasComponent(this)) return

    let otf = this.component.otf

    if (otf === '') {
      this.component.level = this.component.import

      return
    }

    // Remove extraneous brackets
    otf = otf.match(/^\s*\[(.*)\]\s*$/)?.[1].trim() ?? otf

    // If the OTF is just a number, Set the level directly
    if (otf.match(/^\d+$/)) {
      this.component.import = parseInt(otf)
      this.component.level = this.component.import

      return
    }

    // If the OTF is not a number, parse it using the OTF parser.
    const action = parselink(otf)

    // If the OTF does not return an action, we cannot set the level.
    if (!action.action) {
      console.warn(`GURPS | RangedAttackModel: OTF "${otf}" did not return a valid action.`)

      return
    }

    action.action.calcOnly = true
    // TODO: verify that target is of type "number" (or replace this whole thing)
    GURPS.performAction(action.action, this.actor).then(
      (result: boolean | { target: number; thing: any } | undefined) => {
        if (result && typeof result === 'object') {
          this.component.level = result.target
        }
      }
    )
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

export { BaseAction }
