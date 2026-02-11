import { CharacterModel, GcsCharacterModel } from '@module/actor/data/index.js'
import type { GurpsActorV2 } from '@module/actor/gurps-actor.js'
import type { ActorV1Model } from '@module/actor/legacy/actorv1-interface.js'
import type { GurpsCombatant } from '@module/combat/combatant.js'
import { MapField } from '@module/data/fields/map-field.js'
import type GurpsActiveEffect from '@module/effects/active-effect.js'
import type {
  EquipmentModel,
  GcsEquipmentModel,
  GcsEquipmentModifierModel,
  GcsNoteModel,
  GcsSkillModel,
  GcsSpellModel,
  GcsTraitModel,
  GcsTraitModifierModel,
  SkillModel,
  SpellModel,
  TraitModel,
} from '@module/item/data/index.js'
import type { GurpsItemV2 } from '@module/item/gurps-item.js'
import type { Equipment, Feature, Skill, Spell } from '@module/item/legacy/itemv1-interface.js'
import type { ResourceTrackerManager } from '@module/resource-tracker/resource-tracker-manager.js'
import type { ResourceTrackerTemplate } from '@module/resource-tracker/resource-tracker.js'
import type { TaggedModifiersSettings } from '@module/tagged-modifiers/index.js'
import type { GurpsToken } from '@module/token/gurps-token.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

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

  /* ---------------------------------------- */

  interface ConfiguredActor<SubType extends Actor.SubType> {
    document: GurpsActorV2<SubType>
  }

  /* ---------------------------------------- */

  interface FlagConfig {
    ActiveEffect: {
      gurps: GurpsEffectFlags
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
      gcsCharacter: typeof GcsCharacterModel
    }
    Item: {
      equipment: Equipment
      feature: Feature
      skill: Skill
      spell: Spell
      equipmentV2: typeof EquipmentModel
      featureV2: typeof TraitModel
      skillV2: typeof SkillModel
      spellV2: typeof SpellModel
      gcsEquipment: typeof GcsEquipmentModel
      gcsEquipmentModifier: typeof GcsEquipmentModifierModel
      gcsTrait: typeof GcsTraitModel
      gcsTraitModifier: typeof GcsTraitModifierModel
      gcsSkill: typeof GcsSkillModel
      gcsSpell: typeof GcsSpellModel
      gcsNote: typeof GcsNoteModel
    }
  }

  /* ---------------------------------------- */

  interface PlaceableObjectClassConfig {
    Token: typeof GurpsToken
  }

  /* ---------------------------------------- */

  namespace Hooks {
    interface HookConfig {
      dropCanvasData: (canvas: Canvas, dropData: any) => void
      applyActiveEffect: (actor: Actor.Implementation, change: any, options: any, user: User.Implementation) => void
    }
  }

  /* ---------------------------------------- */

  interface SettingConfig {
    'gurps.bucket-position': 'left' | 'right'
    'gurps.damage.apply-divisor': foundry.data.fields.BooleanField
    'gurps.damage.blunt-trauma': foundry.data.fields.BooleanField
    'gurps.damage.body-hits': foundry.data.fields.BooleanField
    'gurps.damage.default-action': 'apply' | 'quiet' | 'target'
    'gurps.damage.default-hitlocation': 'Torso' | 'Random'
    'gurps.damage.location-modifiers': foundry.data.fields.BooleanField
    'gurps.damage.only-gms-open-add': foundry.data.fields.BooleanField
    'gurps.damage.simple-add': foundry.data.fields.BooleanField
    'gurps.damage.show-the-math': foundry.data.fields.BooleanField
    'gurps.importer.auto-ignore-qty': foundry.data.fields.BooleanField
    'gurps.importer.display-preserve-qty-flag': foundry.data.fields.BooleanField
    'gurps.importer.import-extended-values-gcs': foundry.data.fields.BooleanField
    'gurps.importer.import-file-encoding': foundry.data.fields.StringField<{
      choices: { Latin1: string; UTF8: string }
    }>
    'gurps.importer.only-trusted-import': foundry.data.fields.BooleanField
    'gurps.importer.overwrite-bodyplan': foundry.data.fields.StringField<{
      choices: { overwrite: string; keep: string; ask: string }
    }>
    'gurps.importer.overwrite-hp-fp': foundry.data.fields.StringField<{
      choices: { overwrite: string; keep: string; ask: string }
    }>
    'gurps.importer.overwrite-name': foundry.data.fields.BooleanField
    'gurps.importer.overwrite-portraits': foundry.data.fields.BooleanField<{ initial: true }>
    'gurps.importer.use-browser-importer': foundry.data.fields.BooleanField
    'gurps.modify-dice-plus-adds': boolean
    'gurps.pdf.basicset': 'Combined' | 'Separate'
    'gurps.pdf.open-first': boolean
    'gurps.portrait-path': 'global' | 'world'
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
    'gurps.resource-tracker.manager': new (options?: any) => ResourceTrackerManager
    'gurps.resource-tracker.templates': Record<string, ResourceTrackerTemplate>
    'gurps.show-confirmation-roll-dialog': boolean
    'gurps.use-quick-rolls': AnyMutableObject
    'gurps.portrait-hp-tinting': boolean
    'gurps.scripting.globalResolverCache': MapField<
      foundry.data.fields.StringField<{ required: true; nullable: false }>,
      MapField<
        foundry.data.fields.StringField<{ required: true; nullable: false }>,
        foundry.data.fields.StringField<{ required: true; nullable: false }>,
        { required: true; nullable: false }
      >,
      { required: true; nullable: false }
    >
    'gurps.developerMode': boolean

    // NOTE: These settings will be deprecated in the future, but their updated equivalents do not yet exist.
    'gurps.allow-after-max-actions': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-roll-based-on-maneuver': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-rolls-before-combat-start': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-targeted-rolls': 'Allow' | 'Warn' | 'Forbid'
    'gurps.automatic-onethird': boolean
    'gurps.check-equipped': boolean
    'gurps.convert-ranged': boolean
    'gurps.maneuver-detail': 'Full' | 'NoFeint' | 'General'
    'gurps.maneuver-updates-move': boolean
    'gurps.maneuver-visibility': 'NoOne' | 'GMAndOwner' | 'Everyone'
    'gurps.show-chat-reeling-tired': boolean
    'gurps.use-max-actions': 'Disable' | 'AllCombatant' | 'AllTokens'
    'gurps.use-quintessence': boolean
    'gurps.use-tagged-modifiers': TaggedModifiersSettings

    'gurps.use-foundry-items': boolean
    // TODO: Deprecated settings.
    'gurps.auto-ignore-qty': boolean
    'gurps.basicsetpdf': string
    'gurps.block-import': boolean
    'gurps.combat-apply-divisor': boolean
    'gurps.combat-blunt-trauma': boolean
    'gurps.combat-body-hits': boolean
    'gurps.combat-location-modifiers': boolean
    'gurps.combat-simple-damage': boolean
    'gurps.default-add-action': 'apply' | 'quiet' | 'target'
    'gurps.default-hitlocation': 'Torso' | 'Random'
    'gurps.ignore_import_name': boolean
    'gurps.ignoreImportQty': boolean
    'gurps.import-file-encoding': 0 | 1
    'gurps.import_bodyplan': number
    'gurps.import_extended_values_gcs': boolean
    'gurps.import_hp_fp': number
    'gurps.only-gms-open-add': boolean
    'gurps.overwrite-portraitsk': boolean
    'gurps.pdf-open-first': boolean
    'gurps.show-the-math': boolean
    'gurps.tracker-templates': new (options?: any) => Record<string, ResourceTrackerTemplate>
    'gurps.use-browser-importer': boolean
    'gurps.use-size-modifier-difference-in-melee': boolean
    'gurps.automatic-encumbrance': boolean
  }
}
