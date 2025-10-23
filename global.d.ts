import { AnyMutableObject } from 'fvtt-types/utils'
import { GurpsCombatant } from 'module/combat/combatant.ts'
import { GurpsToken } from 'module/token/gurps-token.ts'
import { GurpsItemV2 } from 'module/item/gurps-item.ts'
import { GurpsActorV2 } from 'module/actor/gurps-actor.ts'
import { EquipmentModel } from 'module/item/data/equipment.ts'
import { TraitModel } from 'module/item/data/trait.ts'
import { SkillModel } from 'module/item/data/skill.ts'
import { ResourceTrackerManager } from 'module/resource-tracker/resource-tracker-manager.js'
import { ResourceTrackerTemplate } from 'module/resource-tracker/resource-tracker.ts'
import { CharacterModel } from 'module/actor/data/character.ts'
import { GurpsActiveEffect } from 'module/effects/active-effect.js'
import { SpellModel } from 'module/item/data/spell.ts'
import { ActorV1Model } from 'module/actor/legacy/actorv1-interface.ts'
import { Equipment, Feature, Skill, Spell } from 'module/item/legacy/itemv1-interface.ts'

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
}

/* ---------------------------------------- */

// TODO This should be moved to its own module eventually.
export interface TaggedModifiersSettings {
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

/* ---------------------------------------- */

declare module 'fvtt-types/configuration' {
  interface DocumentClassConfig {
    Actor: typeof GurpsActorV2<Actor.SubType>
    Item: typeof GurpsItemV2<Item.SubType>
    Combatant: typeof GurpsCombatant
    ActiveEffect: typeof GurpsActiveEffect
  }

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
        duration: { delaySeconds: number | null }
        endCondition: string
        terminateActions: { type: string; args: string }[]
        statusId: string
        effect: {
          type: string
        }
      }
    }
    ChatMessage: {
      gurps: {
        transfer: AnyObject
      }
    }
  }

  /* ---------------------------------------- */

  interface DataModelConfig {
    Actor: {
      character: ActorV1Model
      characterV2: typeof CharacterModel
      enemy: typeof CharacterModel
    }
    Item: {
      equipment: Equipment
      equipmentV2: typeof EquipmentModel
      feature: Feature
      featureV2: typeof TraitModel
      skill: Skill
      skillV2: typeof SkillModel
      spell: Spell
      spellV2: typeof SpellModel
    }
    ChatMessage: {}
  }

  /* ---------------------------------------- */

  interface PlaceableObjectClassConfig {
    Token: typeof GurpsToken
  }

  /* ---------------------------------------- */

  namespace Hooks {
    interface HookConfig {
      // TODO: Deprecated in FVTT 13. Replace with renderChatMessageHTML or get rid of if no longer needed.
      renderChatMessage: (app: any, html: JQuery<HTMLElement>, message: any) => void
      dropCanvasData: (canvas: Canvas, dropData: any) => void
      applyActiveEffect: (actor: Actor.Implementation, change: any) => void
    }
  }

  /* ---------------------------------------- */

  interface SettingConfig {
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
    'gurps.bucket-position': 'left' | 'right'
    'gurps.resource-tracker.manager': new (options?: any) => ResourceTracker.TemplateManager
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
    'gurps.portrait-path': 'global' | 'world'

    // NOTE: These settings will be deprecated in the future, but their updated equivalents do not yet exist.
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
    'gurps.maneuver-visibility': 'NoOne' | 'GMAndOwner' | 'Everyone'
    'gurps.maneuver-detail': 'Full' | 'NoFeint' | 'General'
    'gurps.auto-ignore-qty': boolean
    'gurps.use-quintessence': boolean
    'gurps.use-tagged-modifiers': TaggedModifiersSettings

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
