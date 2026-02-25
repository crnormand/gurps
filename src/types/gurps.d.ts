import { TypedPseudoDocument } from '@module/pseudo-document/typed-pseudo-document.js'

export {}

declare global {
  /**
   * The gurps global type namespace contains system-specific helper types and interfaces which are used throughout the
   * codebase. It does not exist at runtime, but serves to provide type safety and autocompletion for system-specific
   * concepts such as pseudo-documents and their metadata.
   */
  namespace gurps {
    /** Helper type representing a Document or PseudoDocument which can be updated with new data */
    interface UpdatableDocument extends Document.Any {
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
       * The Config entry is used for Typed Pseudo-Documents to define the expected document class, label, and default
       * image for a given pseudo-document type. It is used in the global GURPS.CONFIG object to define the available
       * pseudo-document types and their associated metadata.
       */
      type ConfigEntry<Doc extends typeof TypedPseudoDocument> = {
        /** Human-readable label. */
        label: string
        /** Default image used by documents of this type. */
        defaultImage: string
        /** Item types that can hold this pseudo-document type. If empty or undefined, any item type can hold it. */
        itemTypes?: Set<Item.SubType>
        /** The pseudo-document class. */
        documentClass: Doc
      }
    }
  }

  /* ---------------------------------------- */

  interface PseudoDocumentConfig {
    Action: {
      meleeAttack: gurps.Pseudo.ConfigEntry<typeof MeleeAttackModel>
      rangedAttack: gurps.Pseudo.ConfigEntry<typeof RangedAttackModel>
    }
  }
}
