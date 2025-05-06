import { GurpsActor } from './module/actor/actor.js'
import { GurpsItem } from './module/item.js'

export {}

declare global {
  var GURPS: any

  interface SettingConfig {
    'gurps.sheet-navigation': boolean
    'gurps.use-quintessence': boolean
    'gurps.use-foundry-items': boolean
    'gurps.automatic-encumbrance': boolean
    'gurps.enhanced-numeric-input': boolean
    'gurps.tracker-templates': Record<string, any>
    'gurps.alt-sheet': string
    'gurps.block-import': boolean
  }

  /* ---------------------------------------- */

  interface DocumentClassConfig {
    Item: typeof GurpsItem
    Actor: typeof GurpsActor
  }

  /* ---------------------------------------- */

  interface DataModelConfig {
    Actor: {
      character: foundry.abstract.DataModel.AnyConstructor
    }
  }

  /* ---------------------------------------- */

  interface FlagConfig {
    Actor: {
      core: {
        sheetClass: string
      }
      gurps: {
        qnotes: boolean
      }
    }

    Token: {
      gurps: {
        lastUpdate: string
      }
    }
  }
}
