import { GurpsActor } from './module/actor/actor.js'
import { GurpsItem } from './module/item.js'
import { GurpsCombatant } from './module/combat/combatant.ts'
import { GurpsToken } from './module/token/gurps-token.ts'
import { AnyMutableObject } from 'fvtt-types/utils'

export {}

declare global {
  var GURPS: any

  interface DocumentClassConfig {
    Actor: typeof GurpsActor
    Item: typeof GurpsItem
    Combatant: typeof GurpsCombatant
  }

  interface PlaceableObjectClassConfig {
    Token: typeof GurpsToken
  }

  interface SettingConfig {
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
    'gurps.bucket-position': 'left' | 'right'
    'gurps.use-quick-rolls': AnyMutableObject
  }
}
