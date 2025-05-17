import { GurpsActor } from './module/actor/actor.js'
import { GurpsItem } from './module/item.js'
import { CombatantGURPS } from './module/combat/combatant.ts'
import { TokenGURPS } from './module/token/object.ts'

export {}

declare global {
  var GURPS: any

  interface DocumentClassConfig {
    Actor: typeof GurpsActor
    Item: typeof GurpsItem
    Combatant: typeof CombatantGURPS
  }

  interface PlaceableObjectClassConfig {
    Token: typeof TokenGURPS
  }

  interface SettingConfig {
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
  }
}
