import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { registerPDFDataModel } from './data-model.ts'
import { renderJournalPagePDFSheet, renderJournalPageSheet } from './journal.ts'
import { SJGProductMappings } from './pdf-ref-mappings.ts'
import { handleOnPdf, handlePdf } from './pdf-refs.ts'
import { registerPDFSettingsApp } from './settings-app.ts'
import { getBasicSetPDFSetting, isOpenFirstPDFSetting, registerPDFSettings } from './settings.ts'
import { registerPDFSheet } from './sheet.ts'

// TODO Rename this module "journal"
export interface JournalModuleType extends GurpsModule {
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
    registerPDFDataModel()
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

export const Journal: JournalModuleType = {
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
