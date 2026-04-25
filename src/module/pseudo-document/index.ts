import { GurpsModule } from '@gurps-types/gurps-module.js'

import { GenericPseudoSheet } from './generic-pseudo-sheet.js'
import { PseudoDocumentSheet } from './pseudo-document-sheet.js'
import { PseudoDocument } from './pseudo-document.js'
import { TypedPseudoDocument } from './typed-pseudo-document.js'

interface ActorModule extends GurpsModule {
  dataModels: {
    PseudoDocument: typeof PseudoDocument
    TypedPseudoDocument: typeof TypedPseudoDocument
  }
  sheets: {
    GenericPseudoSheet: typeof GenericPseudoSheet
    PseudoDocumentSheet: typeof PseudoDocumentSheet
  }
}

function init() {
  console.log('GURPS | Initializing GURPS Pseudo-Document module.')

  Hooks.on('init', async () => {})
}

export const Pseudo: ActorModule = {
  init,
  dataModels: {
    PseudoDocument,
    TypedPseudoDocument,
  },
  sheets: {
    GenericPseudoSheet,
    PseudoDocumentSheet,
  },
}
