import { MeleeAttackModel } from '@module/action/melee-attack.ts'
import { RangedAttackModel } from '@module/action/ranged-attack.ts'
import { HitLocationEntryV2 } from '@module/actor/data/hit-location-entry.js'
import { MoveModeV2 } from '@module/actor/data/move-mode.js'
import { NoteV2 } from '@module/actor/data/note.js'
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
      type Name = 'Action' | 'HitLocation' | 'Note' | 'MoveMode' | 'ResourceTracker'

      /* ---------------------------------------- */

      type WithTypes = 'Action'

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
        defaultImage: string
        /** Item types that can hold this pseudo-document type. If empty or undefined, any item type can hold it. */
        itemTypes?: Set<Item.SubType>
        /** The pseudo-document class. */
        documentClass: Doc
      }

      /* ---------------------------------------- */

      type DefaultEmbeddedCollectionName<Type extends foundry.abstract.Document.Type> = {
        Actor: Actor.Embedded.CollectionName
        Item: Item.Embedded.CollectionName
      }[Type & ('Actor' | 'Item')]

      /* ---------------------------------------- */

      type EmbeddedCollectionName<Type extends foundry.abstract.Document.Type> =
        | DefaultEmbeddedCollectionName<Type>
        | (Type extends keyof PseudoDocumentConfig.Embeds ? keyof PseudoDocumentConfig.Embeds[Type] : never)

      /* ---------------------------------------- */

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

    interface Types {
      Action: {
        meleeAttack: gurps.Pseudo.ConfigEntry<typeof MeleeAttackModel>
        rangedAttack: gurps.Pseudo.ConfigEntry<typeof RangedAttackModel>
      }
    }
  }
}
