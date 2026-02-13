import { TypedPseudoDocument } from '@module/pseudo-document/typed-pseudo-document.ts'

export {}

declare global {
  namespace gurps {
    /**
     * Helper type representing any DataModel which contains the static "metadata" property.
     */
    interface MetaDataOwner {
      metadata: {
        embedded: Record<string, string>
      }
    }

    namespace Pseudo {
      type Name = 'Action' | 'HitLocation' | 'Note' | 'MoveMode'

      /* ---------------------------------------- */

      type WithTypes = 'Action'

      type ConfigEntry<D extends typeof TypedPseudoDocument, S = any> = {
        documentClass: D
        sheetClass?: S
        label: string
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
