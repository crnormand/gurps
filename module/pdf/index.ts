import { GurpsModule } from 'module/gurps-module.js'

import { renderJournalPagePDFSheet, renderJournalPageSheet } from './journal.js'
import { SJGProductMappings } from './pdf-ref-mappings.ts'
import { handleOnPdf, handlePdf } from './pdf-refs.js'
import { registerPDFSettingsApp } from './settings-app.ts'
import { getBasicSetPDFSetting, isOpenFirstPDFSetting, registerPDFSettings } from './settings.js'
import { registerPDFSheet } from './sheet.js'

// TODO Rename this module "journal"
export interface PdfModuleType extends GurpsModule {
  handlePdf: typeof handlePdf
  handleOnPdf: (event: any) => void
  settings: {
    isOpenFirstPDFSetting: boolean
    basicSetPDFSetting: string
  }
}

function init(): void {
  console.log('GURPS | Initializing GURPS PDF module.')

  GURPS.SJGProductMappings = SJGProductMappings

  Hooks.once('init', () => {
    registerPDFSheet()
  })

  Hooks.once('ready', () => {
    registerPDFSettings()
    registerPDFSettingsApp()

    Hooks.on('renderJournalEntryPageTextSheet', async (app, html, document, options) =>
      renderJournalPageSheet(app, html, document, options)
    )

    Hooks.on('renderJournalEntryPagePDFSheet', (app, html, document, options) =>
      renderJournalPagePDFSheet(app, html, document, options)
    )
  })
}

export const Pdf: PdfModuleType = {
  init,
  handlePdf,
  handleOnPdf,
  settings: {
    get isOpenFirstPDFSetting(): boolean {
      return isOpenFirstPDFSetting()
    },
    get basicSetPDFSetting(): string {
      return getBasicSetPDFSetting()
    },
  },
}
