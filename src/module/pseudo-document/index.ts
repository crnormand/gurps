import { GurpsModule } from '@gurps-types/gurps-module.js'

import { PseudoDocumentSheet } from './pseudo-document-sheet.js'
import { PseudoDocument } from './pseudo-document.js'
import { TypedPseudoDocument } from './typed-pseudo-document.js'

interface ActorModule extends GurpsModule {
  dataModels: {
    PseudoDocument: typeof PseudoDocument
    TypedPseudoDocument: typeof TypedPseudoDocument
  }
  sheets: {
    PseudoDocumentSheet: typeof PseudoDocumentSheet
  }
}

function init() {}

export const Pseudo: ActorModule = {
  init,
  dataModels: {
    PseudoDocument,
    TypedPseudoDocument,
  },
  sheets: {
    PseudoDocumentSheet,
  },
}
