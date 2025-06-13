import { AnyMutableObject } from 'fvtt-types/utils'
import { ResourceTrackerTemplate } from 'module/resource-tracker/types.ts'
// import { GurpsActor } from './module/actor/actor.js'
import { GurpsCombatant } from './module/combat/combatant.ts'
// import { GurpsItem } from './module/item.js'
import { GurpsToken } from './module/token/gurps-token.ts'
import { GurpsItemV2 } from 'module/item/gurps-item.ts'
import { GurpsActorV2 } from 'module/actor/gurps-actor.ts'
import { EquipmentData } from 'module/item/data/equipment.ts'
import { TraitData } from 'module/item/data/trait.ts'
import { SpellData } from 'module/item/data/spell.ts'
import { SkillData } from 'module/item/data/skill.ts'
import { MeleeAttackData } from 'module/item/data/melee-attack.ts'
import { RangedAttackData } from 'module/item/data/ranged-attack.ts'
import { ResourceTrackerManager } from 'module/resource-tracker/resource-tracker-manager.js'

export { }

declare global {
  var GURPS: any

  /* ---------------------------------------- */

  interface DocumentClassConfig {
    Actor: typeof GurpsActorV2
    Item: typeof GurpsItemV2
    Combatant: typeof GurpsCombatant
  }

  /* ---------------------------------------- */

  interface ConfiguredItem<SubType extends Item.SubType> {
    document: GurpsItemV2<SubType>
  }

  interface ConfiguredActor<SubType extends Actor.SubType> {
    document: GurpsActorV2<SubType>
  }

  /* ---------------------------------------- */

  interface DataModelConfig {
    Item: {
      equipment: typeof EquipmentData
      feature: typeof TraitData
      skill: typeof SkillData
      spell: typeof SpellData
      meleeAtk: typeof MeleeAttackData
      rangedAtk: typeof RangedAttackData
    }
  }

  /* ---------------------------------------- */

  interface PlaceableObjectClassConfig {
    Token: typeof GurpsToken
  }

  /* ---------------------------------------- */

  interface SettingConfig {
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
    'gurps.bucket-position': 'left' | 'right'
    'gurps.resource-tracker.manager': new (options?: any) => ResourceTrackerManager
    'gurps.resource-tracker.templates': Record<string, ResourceTrackerTemplate>
    'gurps.use-quick-rolls': AnyMutableObject
    'gurps.show-confirmation-roll-dialog': boolean
    'gurps.modify-dice-plus-adds': boolean
    'gurps.pdf.basicset': 'Combined' | 'Separate'
    'gurps.pdf.open-first': boolean
    'gurps.damage.default-hitlocation': 'Torso' | 'Random'
    'gurps.damage.simple-add': foundry.data.fields.BooleanField
    'gurps.damage.apply-divisor': foundry.data.fields.BooleanField
    'gurps.damage.blunt-trauma': foundry.data.fields.BooleanField
    'gurps.damage.body-hits': foundry.data.fields.BooleanField
    'gurps.damage.location-modifiers': foundry.data.fields.BooleanField
    'gurps.damage.only-gms-open-add': foundry.data.fields.BooleanField
    'gurps.damage.show-the-math': foundry.data.fields.BooleanField
    'gurps.damage.default-action': 'apply' | 'quiet' | 'target'

    // TODO: Deprecated settings.
    'gurps.tracker-templates': new (options?: any) => Record<string, ResourceTrackerTemplate>
    'gurps.basicsetpdf': String
    'gurps.pdf-open-first': boolean
    'gurps.only-gms-open-add': boolean
    'gurps.combat-simple-damage': boolean
    'gurps.default-hitlocation': 'Torso' | 'Random'
    'gurps.combat-apply-divisor': boolean
    'gurps.combat-blunt-trauma': boolean
    'gurps.combat-body-hits': boolean
    'gurps.combat-location-modifiers': boolean
    'gurps.show-the-math': boolean
    'gurps.default-add-action': 'apply' | 'quiet' | 'target'
  }
}
