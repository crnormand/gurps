import { ActionType, MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'
import { HitLocationEntryV2 } from '@module/actor/data/hit-location-entry.js'
import { MoveModeV2 } from '@module/actor/data/move-mode.js'
import { NoteV2 } from '@module/actor/data/note.js'
import DamageChat from '@module/damage/damagechat.js'
import { AttributeBonus } from '@module/features/attribute-bonus.js'
import { ConditionalModifier } from '@module/features/conditional-modifier.js'
import { ContainedWeightReduction } from '@module/features/contained-weight-reduction.js'
import { CostReduction } from '@module/features/cost-reduction.js'
import { DRBonus } from '@module/features/dr-bonus.js'
import { FeatureType } from '@module/features/index.js'
import { ReactionBonus } from '@module/features/reaction-bonus.js'
import { SkillBonus } from '@module/features/skill-bonus.js'
import { SkillPointBonus } from '@module/features/skill-point-bonus.js'
import { SpellBonus } from '@module/features/spell-bonus.js'
import { SpellPointBonus } from '@module/features/spell-point-bonus.js'
import { TraitBonus } from '@module/features/trait-bonus.js'
import {
  WeaponBonus,
  WeaponAccBonus,
  WeaponScopeAccBonus,
  WeaponDRDivisorBonus,
  WeaponEffectiveSTBonus,
  WeaponMinSTBonus,
  WeaponMinReachBonus,
  WeaponMaxReachBonus,
  WeaponHalfDamageRangeBonus,
  WeaponMinRangeBonus,
  WeaponMaxRangeBonus,
  WeaponRecoilBonus,
  WeaponBulkBonus,
  WeaponParryBonus,
  WeaponBlockBonus,
  WeaponRofMode1ShotsBonus,
  WeaponRofMode1SecondaryBonus,
  WeaponRofMode2ShotsBonus,
  WeaponRofMode2SecondaryBonus,
  WeaponNonChamberShotsBonus,
  WeaponChamberShotsBonus,
  WeaponShotDurationBonus,
  WeaponReloadTimeBonus,
  WeaponSwitch,
} from '@module/features/weapon-bonus.js'
import { Feature } from '@module/item/legacy/itemv1-interface.js'
import { AttributePrereq } from '@module/prereqs/attribute-prereq.js'
import {
  ContainedQuantityPrereq,
  ContainedWeightPrereq,
  EquippedEquipmentPrereq,
  PrereqList,
  PrereqType,
  ScriptPrereq,
  SkillPrereq,
  SpellPrereq,
  TraitPrereq,
} from '@module/prereqs/index.js'
import { TrackerInstance } from '@module/resource-tracker/resource-tracker.js'
import { AnyObject } from 'fvtt-types/utils'

export {}

declare global {
  /**
   * The gurps global type namespace contains system-specific helper types and interfaces which are used throughout the
   * codebase. It does not exist at runtime, but serves to provide type safety and autocompletion for system-specific
   * concepts such as pseudo-documents and their metadata.
   */
  namespace gurps {
    /** Helper type representing a Document or PseudoDocument which can be updated with new data */
    interface UpdatableDocument extends foundry.abstract.Document.Any {
      update(data: AnyObject, options?: AnyObject): Promise<this>
    }

    /* ---------------------------------------- */

    /**
     * Helper type representing any DataModel which contains the static "metadata" property.
     */
    interface MetadataOwner {
      metadata: {
        embedded: Record<string, string>
      }
    }

    /* ---------------------------------------- */

    /**
     * Type configuration for pseudo-documents. This is used to define the expected document class, sheet class (if
     * any), and label
     */
    namespace Pseudo {
      /**
       * Holds the names of all declared pseudo-document types, which are used as keys in the {@link
       * PseudoDocumentConfig.Embeds} configuration object and for PseudoDocument instance
       * and static methods to ensure type safety and autocompletion when working with pseudo-documents.
       */
      type Name =
        | 'Action'
        | 'Attribute'
        | 'AttributeDefinition'
        | 'AttributeThreshold'
        | 'Body'
        | 'ConditionalModifier'
        | 'Feature'
        | 'HitLocation'
        | 'LocationSubTable'
        | 'MoveMode'
        | 'Note'
        | 'Prereq'
        | 'ReactionModifier'
        | 'ResourceTracker'
        | 'Study'

      /* ---------------------------------------- */

      /**
       * Holds the names of all declared pseudo-document types which are "typed", meaning they extends
       * the class TypedPseudoDocument and have a "type" property which causes different types to resolve
       * to different classes.
       */
      type WithTypes = 'Action' | 'Feature' | 'Prereq'

      /* ---------------------------------------- */

      /**
       * Documents which have been configured to hold PseudoDocuments. This is used as a constraint for the parent
       * document when creating new pseudo-documents, ensuring
       */
      type ParentDocument = Actor.Implementation | Item.Implementation

      /* ---------------------------------------- */

      /**
       * The Config entry is used for Typed Pseudo-Documents to define the expected document class, label, and default
       * image for a given pseudo-document type. It is used in the global GURPS.CONFIG object to define the available
       * pseudo-document types and their associated metadata.
       */
      type ConfigEntry<Doc extends foundry.abstract.DataModel.AnyConstructor> = {
        /** Human-readable label. */
        label: string
        /** Default image used by documents of this type. */
        defaultImage?: string
        /** Item types that can hold this pseudo-document type. If empty or undefined, any item type can hold it. */
        itemTypes?: Set<Item.SubType>
        /** The pseudo-document class. */
        documentClass: Doc
      }

      /* ---------------------------------------- */

      /**
       * This is a sort of hacky helper type which infers the default embedded collection name for a given parent
       * document type. This is used specifically for the default embedded collection names of Actors and Items, used
       * in the type {@link EmbeddedCollectionName} below.
       *
       */
      type DefaultEmbeddedCollectionName<Type extends foundry.abstract.Document.Type> = {
        Actor: Actor.Embedded.CollectionName
        Item: Item.Embedded.CollectionName
      }[Type & ('Actor' | 'Item')]

      /* ---------------------------------------- */

      /**
       * Returns the valid embedded collection names for a given parent document type, which can be either the default
       * embedded document types provided by Foundry (e.g. "ActiveEffect", "Item") or any additional pseudo-document
       * collection names defined in the {@link PseudoDocumentConfig.Embeds} configuration object for that parent
       * document type.
       */
      type EmbeddedCollectionName<Type extends foundry.abstract.Document.Type> =
        | DefaultEmbeddedCollectionName<Type>
        | (Type extends keyof PseudoDocumentConfig.Embeds ? keyof PseudoDocumentConfig.Embeds[Type] : never)

      /* ---------------------------------------- */

      /**
       * The return type when accessing an embedded document on a parent document, which can be either a default
       * embedded document type provided by Foundry (e.g. ActiveEffect, Item) or a pseudo-document type defined in the
       * {@link PseudoDocumentConfig.Embeds} configuration object for that parent document type.
       */
      type EmbeddedDocument<
        Type extends foundry.abstract.Document.Type,
        EmbeddedName extends EmbeddedCollectionName<Type>,
      > =
        EmbeddedName extends DefaultEmbeddedCollectionName<Type>
          ? EmbeddedName extends Actor.Embedded.CollectionName
            ? Actor.Embedded.DocumentFor<EmbeddedName> | undefined
            : never
          : EmbeddedName extends keyof PseudoDocumentConfig.Embeds[Type & keyof PseudoDocumentConfig.Embeds]
            ? PseudoDocumentConfig.Embeds[Type & keyof PseudoDocumentConfig.Embeds][EmbeddedName] | undefined
            : never

      /* ---------------------------------------- */

      /**
       * Slight override of Foundry's DatabaseCreateOperation type which requires a "parent" property of the appropriate
       * parent document type when creating new pseudo-documents. This ensures that when creating a new pseudo-document,
       * the parent document is always provided and correctly typed, which is necessary for the pseudo-document to be
       * properly associated with its parent and for the correct embedded collection to be used.
       */
      interface CreateOperation extends foundry.abstract.types.DatabaseCreateOperation {
        parent: Pseudo.ParentDocument
      }
    }
  }

  /* ---------------------------------------- */

  namespace PseudoDocumentConfig {
    /**
     * Embeds holds all PseudoDOcument types which can be stored on "real" Documents as embedded documents. Each entry
     * is keyed by the parent Document type (e.g. Actor, Item) and then by the name of the embedded collection (e.g.
     * "HitLocations", "Notes"). The value of each entry is the expected document class for that pseudo-document type,
     * which is used for type inference when accessing embedded pseudo-documents on real documents.
     */
    interface Embeds {
      Actor: {
        HitLocation: HitLocationEntryV2
        Note: NoteV2
        MoveMode: MoveModeV2
        ResourceTracker: TrackerInstance
      }

      Item: {
        MeleeAttack: MeleeAttackModel
        RangedAttack: RangedAttackModel
      }
    }

    /* ---------------------------------------- */

    /**
     * This is the configuration for Typed Pseudo-Documents, which are pseudo-documents that resolve to multiple
     * different classes based on a `type` property, but share a common parent document type and embedded collection
     * name. Each entry is keyed by the `TYPE` static property of the corresponding class.
     */
    interface Types {
      Action: {
        [ActionType.MeleeAttack]: gurps.Pseudo.ConfigEntry<typeof MeleeAttackModel>
        [ActionType.RangedAttack]: gurps.Pseudo.ConfigEntry<typeof RangedAttackModel>
      }
      Feature: {
        [FeatureType.AttributeBonus]: gurps.Pseudo.ConfigEntry<typeof AttributeBonus>
        [FeatureType.ConditionalModifier]: gurps.Pseudo.ConfigEntry<typeof ConditionalModifier>
        [FeatureType.DRBonus]: gurps.Pseudo.ConfigEntry<typeof DRBonus>
        [FeatureType.ReactionBonus]: gurps.Pseudo.ConfigEntry<typeof ReactionBonus>
        [FeatureType.SkillBonus]: gurps.Pseudo.ConfigEntry<typeof SkillBonus>
        [FeatureType.SkillPointBonus]: gurps.Pseudo.ConfigEntry<typeof SkillPointBonus>
        [FeatureType.SpellBonus]: gurps.Pseudo.ConfigEntry<typeof SpellBonus>
        [FeatureType.SpellPointBonus]: gurps.Pseudo.ConfigEntry<typeof SpellPointBonus>
        [FeatureType.TraitBonus]: gurps.Pseudo.ConfigEntry<typeof TraitBonus>
        [FeatureType.WeaponBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponBonus>
        [FeatureType.WeaponAccBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponAccBonus>
        [FeatureType.WeaponScopeAccBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponScopeAccBonus>
        [FeatureType.WeaponDRDivisorBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponDRDivisorBonus>
        [FeatureType.WeaponEffectiveSTBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponEffectiveSTBonus>
        [FeatureType.WeaponMinSTBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponMinSTBonus>
        [FeatureType.WeaponMinReachBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponMinReachBonus>
        [FeatureType.WeaponMaxReachBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponMaxReachBonus>
        [FeatureType.WeaponHalfDamageRangeBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponHalfDamageRangeBonus>
        [FeatureType.WeaponMinRangeBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponMinRangeBonus>
        [FeatureType.WeaponMaxRangeBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponMaxRangeBonus>
        [FeatureType.WeaponRecoilBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponRecoilBonus>
        [FeatureType.WeaponBulkBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponBulkBonus>
        [FeatureType.WeaponParryBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponParryBonus>
        [FeatureType.WeaponBlockBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponBlockBonus>
        [FeatureType.WeaponRofMode1ShotsBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponRofMode1ShotsBonus>
        [FeatureType.WeaponRofMode1SecondaryBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponRofMode1SecondaryBonus>
        [FeatureType.WeaponRofMode2ShotsBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponRofMode2ShotsBonus>
        [FeatureType.WeaponRofMode2SecondaryBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponRofMode2SecondaryBonus>
        [FeatureType.WeaponNonChamberShotsBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponNonChamberShotsBonus>
        [FeatureType.WeaponChamberShotsBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponChamberShotsBonus>
        [FeatureType.WeaponShotDurationBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponShotDurationBonus>
        [FeatureType.WeaponReloadTimeBonus]: gurps.Pseudo.ConfigEntry<typeof WeaponReloadTimeBonus>
        [FeatureType.WeaponSwitch]: gurps.Pseudo.ConfigEntry<typeof WeaponSwitch>
        [FeatureType.CostReduction]: gurps.Pseudo.ConfigEntry<typeof CostReduction>
        [FeatureType.ContainedWeightReduction]: gurps.Pseudo.ConfigEntry<typeof ContainedWeightReduction>
      }
      Prereq: {
        [PrereqType.List]: gurps.Pseudo.ConfigEntry<typeof PrereqList>
        [PrereqType.Trait]: gurps.Pseudo.ConfigEntry<typeof TraitPrereq>
        [PrereqType.Attribute]: gurps.Pseudo.ConfigEntry<typeof AttributePrereq>
        [PrereqType.ContainedQuantity]: gurps.Pseudo.ConfigEntry<typeof ContainedQuantityPrereq>
        [PrereqType.ContainedWeight]: gurps.Pseudo.ConfigEntry<typeof ContainedWeightPrereq>
        [PrereqType.EquippedEquipment]: gurps.Pseudo.ConfigEntry<typeof EquippedEquipmentPrereq>
        [PrereqType.Skill]: gurps.Pseudo.ConfigEntry<typeof SkillPrereq>
        [PrereqType.Spell]: gurps.Pseudo.ConfigEntry<typeof SpellPrereq>
        [PrereqType.Script]: gurps.Pseudo.ConfigEntry<typeof ScriptPrereq>
      }
    }
  }

  /* ---------------------------------------- */

  /**
   * GurpsUtils is a store of top-level utility functions and properties which are used throughout the codebase. It is
   * accessible via the global GURPS object and serves as a central location for any helper functions or properties
   * which don't belong to a specific module or class.
   *
   * Some of these functions are legacy and may be deprecated in the future as the codebase is refactored, but for now
   * they are still included here to provide type safety and autocompletion for existing code which relies on them.
   *
   * TODO: Find a new home for some of these functions as the codebase is refactored and modularized, rather than having
   * them all in one interface which is not organized by module or functionality.
   */
  interface GurpsUtils {
    /* ---------------------------------------- */

    LastActor: Actor.Implementation | null

    /* ---------------------------------------- */

    StatusEffect: {
      lookup(id: string): any
    }

    /* ---------------------------------------- */

    SavedStatusEffects: typeof CONFIG.statusEffects

    /* ---------------------------------------- */

    StatusEffectStanding: 'standing'

    /* ---------------------------------------- */

    StatusEffectStandingLabel: 'GURPS.status.Standing'

    /* ---------------------------------------- */

    decode<T = unknown>(actor: Actor.Implementation, path: string): T

    /* ---------------------------------------- */

    put<T = unknown>(list: Record<string, T>, obj: T, index?: number): string

    /* ---------------------------------------- */

    parselink(input: string): { text: string; action?: GurpsAction }

    /* ---------------------------------------- */

    removeKey(actor: Actor.Implementation, key: string): void

    /* ---------------------------------------- */

    insertBeforeKey(actor: Actor.Implementation, path: string, newobj: AnyObject): Promise<void>

    /* ---------------------------------------- */

    findAdDisad(actor: Actor.Implementation, adName: string): Feature['fea'] | undefined

    /* ---------------------------------------- */

    readTextFromFile(file: File): Promise<string>

    /* ---------------------------------------- */

    handleRoll(event: JQuery.MouseEventBase | Event, actor: Actor.Implementation, options?: { targets?: string[] })

    /* ---------------------------------------- */

    performAction(
      action: GurpsAction,
      actor: Actor | Actor.Implementation | null,
      event?: Event | null,
      targets?: string[]
    ): Promise<any>

    stopActions: boolean

    ModifierBucket: {
      setTempRangeMod(mod: number): void
      addTempRangeMod(): void
      addModifier(mod: string, label: string, options?: { situation?: string }, tagged?: boolean): void
      currentSum(): number
      clear(): Promise<void>
      refreshPosition(): void
      render(): Promise<void>
    }

    DamageTables: {
      translate(damageType: string): string
      woundModifiers: Record<
        string,
        { label?: string; icon?: string; color?: string; multiplier?: number; resource?: boolean }
      >
      damageTypeMap: Record<string, string>
    }

    SSRT: {
      getModifier(yards: number): number
    }

    rangeObject: {
      ranges: Array<{ modifier: number; max: number; penalty: number }>
    }

    Maneuvers: {
      get(id: string): { icon?: string; label: string; move: string | null } | undefined
      getAll(): Record<string, { id: string; icon: string; label: string }>
    }
    ApplyDamageDialog: new (actor: Actor.Implementation, damageData: DamageData[], options?: object) => Application

    DamageChat: typeof DamageChat

    resolveDamageRoll: (
      event: Event,
      actor: Actor.Implementation,
      otf: string,
      overridetxt: string | null,
      isGM: boolean,
      isOtf?: boolean
    ) => Promise<void>

    SJGProductMappings: Record<string, string>

    /* ---------------------------------------- */
  }
}
