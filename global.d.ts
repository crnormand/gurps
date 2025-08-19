import { AnyMutableObject } from 'fvtt-types/utils'
import { ResourceTrackerTemplate } from 'module/resource-tracker/types.ts'
import { GurpsCombatant } from './module/combat/combatant.ts'
import { GurpsItem } from './module/item.js'
import { GurpsToken } from './module/token/gurps-token.ts'
import { CharacterModel } from 'module/actor/data/character.ts'
import { GurpsActorV2 } from 'module/actor/gurps-actor.ts'

export {}

declare global {
  var GURPS: any

  type PreCreate<T extends SourceFromSchema<DataSchema>> = T extends { type: string }
    ? Omit<DeepPartial<T>, 'type'> & { _id?: Maybe<string>; type: T['type'] }
    : DeepPartial<T>

  interface DocumentClassConfig {
    Actor: typeof GurpsActorV2
    Item: typeof GurpsItem
    Combatant: typeof GurpsCombatant
  }

  interface PlaceableObjectClassConfig {
    Token: typeof GurpsToken
  }

  interface DataModelConfig {
    Actor: {
      character: any
      characterV2: typeof CharacterModel
      enemy: typeof CharacterModel
    }
  }

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
    'gurps.automatic-encumbrance': boolean
    'gurps.allow-targeted-rolls': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-roll-based-on-maneuver': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-after-max-actions': 'Allow' | 'Warn' | 'Forbid'
    'gurps.use-max-actions': 'Disable' | 'AllCombatant' | 'AllTokens'
    'gurps.allow-rolls-before-combat-start': 'Allow' | 'Warn' | 'Forbid'
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
