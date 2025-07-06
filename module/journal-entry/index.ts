import { GurpsModule } from 'module/gurps-module.js'
import { getBasicSetPDFSetting, isOpenFirstPDFSetting, registerPDFSettings } from './settings.js'
import { GurpsPDFSheet } from './sheet.js'
import { GurpsJournalEntryPage } from './gurps-journal-entry-page.js'
import { GurpsJournalEntryPDFPage } from './data/pdf.js'
import { handleOnPdf, handlePdf } from './pdf-handler.js'
import { PDF_MAPPINGS } from './pdf-mappings.js'

export interface JournalEntryModuleType extends GurpsModule {
  handlePdf: typeof handlePdf
  handleOnPdf: (event: any) => void
  isOpenFirstPDFSetting: boolean
  basicSetPDFSetting: string
}

function init(): void {
  console.log('GURPS | Initializing GURPS Journal Entry module.')

  GURPS.SJGProductMappings = PDF_MAPPINGS

  Hooks.once('init', () => {
    CONFIG.JournalEntryPage.documentClass = GurpsJournalEntryPage
    CONFIG.JournalEntryPage.dataModels = { pdf: GurpsJournalEntryPDFPage }

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

export const JournalEntry: JournalEntryModuleType = {
  init,
  handlePdf,
  handleOnPdf,
  get isOpenFirstPDFSetting(): boolean {
    return isOpenFirstPDFSetting()
  },
  get basicSetPDFSetting(): string {
    return getBasicSetPDFSetting()
  },
}
