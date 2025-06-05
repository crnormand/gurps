import { AnyMutableObject } from 'fvtt-types/utils'
import { TrackerInstance } from 'module/resource-tracker/types.ts'
import { GurpsActor } from './module/actor/actor.js'
import { GurpsCombatant } from './module/combat/combatant.ts'
import { GurpsItem } from './module/item.js'
import { GurpsToken } from './module/token/gurps-token.ts'

export { }

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
    'gurps.resource-tracker.manager': new (options?: any) => ResourceTracker.TemplateManager
    'gurps.resource-tracker.templates': Record<string, TrackerInstance>
    // TODO: Remove this when the setting is removed.
    'gurps.tracker-templates': new (options?: any) => ResourceTracker.TrackerEditor
    'gurps.use-quick-rolls': AnyMutableObject
    'gurps.show-confirmation-roll-dialog': boolean
    'gurps.modify-dice-plus-adds': boolean
  }
}
