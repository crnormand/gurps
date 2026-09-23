import { GurpsModule } from 'module/gurps-module.js'
import { _renderJournalPagePDFSheet, _renderJournalPageSheet } from './journal.js'
import { handleOnPdf, handlePdf, SJGProductMappings } from './pdf-refs.ts'
import { registerPDFSettingsApp } from './settings-app.ts'
import { getBasicSetPDFSetting, isOpenFirstPDFSetting, registerPDFSettings } from './settings.js'
import { registerPDFSheet } from './sheet.js'

export interface PdfModuleType extends GurpsModule {
  handlePdf: typeof handlePdf
  handleOnPdf: (event: any) => void
  isOpenFirstPDFSetting: boolean
  basicSetPDFSetting: string
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
      _renderJournalPageSheet(app, html, document, options)
    )
    Hooks.on('renderJournalEntryPagePDFSheet', (app, html, document, options) =>
      _renderJournalPagePDFSheet(app, html, document, options)
    )
  })
}

export const Pdf: PdfModuleType = {
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
