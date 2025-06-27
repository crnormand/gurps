import { AnyMutableObject } from 'fvtt-types/utils'
// import { GurpsActor } from './module/actor/actor.js'
import { GurpsCombatant } from 'module/combat/combatant.ts'
// import { GurpsItem } from './module/item.js'
import { GurpsToken } from 'module/token/gurps-token.ts'
import { GurpsItemV2 } from 'module/item/gurps-item.ts'
import { GurpsActorV2 } from 'module/actor/gurps-actor.ts'
import { EquipmentModel } from 'module/item/data/equipment.ts'
import { TraitModel } from 'module/item/data/trait.ts'
import { SpellModel } from 'module/item/data/spell.ts'
import { SkillModel } from 'module/item/data/skill.ts'
import { ResourceTrackerManager } from 'module/resource-tracker/resource-tracker-manager.js'
import { BaseAction } from 'module/action/base-action.ts'
import { ResourceTrackerTemplate } from 'module/resource-tracker/resource-tracker.ts'
import { CharacterModel } from 'module/actor/data/character.ts'
import { GurpsActiveEffect } from 'module/active-effect/gurps-active-effect.ts'

export {}

declare global {
  var GURPS: {
    SYSTEM_NAME: 'gurps'
    CONFIG: {
      Action: Record<
        string,
        {
          label: string
          documentClass: typeof BaseAction
        }
      >
      // HACK: to get rid of later. just used for TypedPseudoDocument.TYPES at the moment
      [key: string]: unknown
    }
  } & any

  /* ---------------------------------------- */
}

declare module 'fvtt-types/configuration' {
  interface DocumentClassConfig {
    Actor: typeof GurpsActorV2<Actor.SubType>
    Item: typeof GurpsItemV2<Item.SubType>
    Combatant: typeof GurpsCombatant<Combatant.SubType>
    ActiveEffect: typeof GurpsActiveEffect<ActiveEffect.SubType>
  }

  /* ---------------------------------------- */

  /* ---------------------------------------- */

  interface ConfiguredItem<SubType extends Item.SubType> {
    document: GurpsItemV2<SubType>
  }

  interface ConfiguredActor<SubType extends Actor.SubType> {
    document: GurpsActorV2<SubType>
  }

  /* ---------------------------------------- */

  interface FlagConfig {
    ActiveEffect: {
      gurps: {
        name: string
        alt: string
        effect: {
          type: string
        }
      }
    }
  }

  /* ---------------------------------------- */

  interface DataModelConfig {
    Actor: {
      character: typeof CharacterModel
      enemy: typeof CharacterModel
    }
    Item: {
      equipment: typeof EquipmentModel
      feature: typeof TraitModel
      skill: typeof SkillModel
      spell: typeof SpellModel
      // meleeAtk: typeof MeleeAttackData
      // rangedAtk: typeof RangedAttackData
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
    'gurps.pdf.basicset': String
    'gurps.pdf.open-first': boolean
    // TODO: Deprecated settings.
    'gurps.tracker-templates': new (options?: any) => Record<string, ResourceTrackerTemplate>
    'gurps.basicsetpdf': String
    'gurps.pdf-open-first': boolean
    'gurps.convert-ranged': boolean
    'gurps.check-equipped': boolean
    'gurps.automatic-encumbrance': boolean
    'gurps.allow-targeted-rolls': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-roll-based-on-maneuver': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-after-max-actions': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-rolls-before-combat-start': 'Allow' | 'Warn' | 'Forbid'
    'gurps.use-max-actions': 'Disable' | 'AllCombatant' | 'AllTokens'
    'gurps.maneuver-updates-move': boolean
    'gurps.automatic-onethird': boolean
    'gurps.show-chat-reeling-tired': boolean
    'gurps.default-hitlocation': string
    'gurps.maneuver-visibility': 'NoOne' | 'GMAndOwner' | 'Everyone'
    'gurps.maneuver-detail': 'Full' | 'NoFeint' | 'General'
    'gurps.auto-ignore-qty': boolean
    'gurps.use-quintessence': boolean
    'gurps.use-tagged-modifiers': {
      autoAdd: boolean
      checkConditionals: boolean
      checkReactions: boolean
      useSpellCollegeAsTag: boolean
      allRolls: string
      allAttributesRolls: string
      allSkillRolls: string
      allSpellRolls: string
      allDamageRolls: string
      allAttackRolls: string
      allRangedRolls: string
      allMeleeRolls: string
      allDefenseRolls: string
      allDODGERolls: string
      allParryRolls: string
      allBlockRolls: string
      allPERRolls: string
      allWILLRolls: string
      allSTRolls: string
      allDXRolls: string
      allIQRolls: string
      allHTRolls: string
      allFRIGHTCHECKRolls: string
      allVISIONRolls: string
      allTASTESMELLRolls: string
      allHEARINGRolls: string
      allTOUCHRolls: string
      allCRRolls: string
      combatOnlyTag: string
      nonCombatOnlyTag: string
      combatTempTag: string
    }
  }
}
