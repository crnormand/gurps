import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { handleOnPdf, handlePdf, SJGProductMappings } from './pdf-refs.js'
import { getBasicSetPDFSetting, isOpenFirstPDFSetting, registerPDFSettings } from './settings.js'
import { GurpsPDFSheet } from './sheet.js'

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
    foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
      JournalEntryPage,
      'core',
      foundry.applications.sheets.journal.JournalEntryPagePDFSheet
    )

    foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', GurpsPDFSheet, {
      types: ['pdf'],
      makeDefault: true,
      label: 'GURPS PDF Editor Sheet',
    })
  })

  Hooks.once('ready', () => {
    registerPDFSettings()
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
