import type { CharacterModel, GcsCharacterModel } from '@module/actor/data/index.js'
import type { GurpsActorV2 } from '@module/actor/gurps-actor.js'
import { ActorType } from '@module/actor/types.js'
import type { GurpsCombatant } from '@module/combat/combatant.js'
import type { MapField } from '@module/data/fields/map-field.js'
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
import { ItemType } from '@module/item/types.js'
import type { IResourceTrackerTemplate, ResourceTrackerManagerV2 } from '@module/resource-tracker/index.js'
import type { TaggedModifiersSettings } from '@module/tagged-modifiers/index.js'
import type { GurpsToken } from '@module/token/gurps-token.js'
import type { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

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
      [ActorType.Character]: typeof CharacterModel
      [ActorType.GcsCharacter]: typeof GcsCharacterModel
    }
    Item: {
      [ItemType.Equipment]: typeof EquipmentModel
      [ItemType.Trait]: typeof TraitModel
      [ItemType.Skill]: typeof SkillModel
      [ItemType.Spell]: typeof SpellModel
      [ItemType.GcsEquipment]: typeof GcsEquipmentModel
      [ItemType.GcsEquipmentModifier]: typeof GcsEquipmentModifierModel
      [ItemType.GcsTrait]: typeof GcsTraitModel
      [ItemType.GcsTraitModifier]: typeof GcsTraitModifierModel
      [ItemType.GcsSkill]: typeof GcsSkillModel
      [ItemType.GcsSpell]: typeof GcsSpellModel
      [ItemType.GcsNote]: typeof GcsNoteModel
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
    /** Bucket */
    'gurps.bucket-position': 'left' | 'right'

    /** Damage */
    'gurps.damage.apply-divisor': foundry.data.fields.BooleanField
    'gurps.damage.blunt-trauma': foundry.data.fields.BooleanField
    'gurps.damage.body-hits': foundry.data.fields.BooleanField
    'gurps.damage.default-action': 'apply' | 'quiet' | 'target'
    'gurps.damage.default-hitlocation': 'Torso' | 'Random'
    'gurps.damage.location-modifiers': foundry.data.fields.BooleanField
    'gurps.damage.only-gms-open-add': foundry.data.fields.BooleanField
    'gurps.damage.simple-add': foundry.data.fields.BooleanField
    'gurps.damage.show-the-math': foundry.data.fields.BooleanField

    /** Importer */
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

    /** PDF */
    'gurps.pdf.basicset': 'Combined' | 'Separate'
    'gurps.pdf.open-first': boolean

    /** Resource Tracker */
    'gurps.resource-tracker.manager': new (options?: any) => ResourceTrackerManagerV2
    'gurps.resource-tracker.templates': Record<string, IResourceTrackerTemplate>

    /** Developer */
    'gurps.dev.enableNonProductionDocumentTypes': foundry.data.fields.BooleanField
    'gurps.dev.showDebugInfo': foundry.data.fields.BooleanField

    /** Scripting */
    'gurps.scripting.globalResolverCache': MapField<
      foundry.data.fields.StringField<{ required: true; nullable: false }>,
      MapField<
        foundry.data.fields.StringField<{ required: true; nullable: false }>,
        foundry.data.fields.StringField<{ required: true; nullable: false }>,
        { required: true; nullable: false }
      >,
      { required: true; nullable: false }
    >

    /** Unsorted */
    'gurps.modify-dice-plus-adds': boolean
    'gurps.portrait-path': 'global' | 'world'
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
    'gurps.show-confirmation-roll-dialog': boolean
    'gurps.use-quick-rolls': AnyMutableObject
    'gurps.portrait-hp-tinting': boolean
    'gurps.migration-version': string
    'gurps.shift-click-blind': boolean

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
    'gurps.useConditionalInjury': boolean

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
    'gurps.tracker-templates': new (options?: any) => Record<string, IResourceTrackerTemplate>
    'gurps.use-browser-importer': boolean
    'gurps.use-size-modifier-difference-in-melee': boolean
    'gurps.automatic-encumbrance': boolean
  }
}
