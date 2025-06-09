import { GurpsModule } from 'module/gurps-module.js'
import { handleOnPdf, handlePdf, SJGProductMappings } from './pdf-refs.js'
import { getBasicSetPDFSetting, isOpenFirstPDFSetting, registerPDFSettings } from './settings.js'
import { GurpsPDFSheet, GurpsPDFSheetV1 } from './sheet.js'

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
    if ((game.release?.generation ?? 12) >= 13) {
      // @ts-expect-error: unregisterSheet may not be typed in Foundry's API
      foundry.applications.apps.DocumentSheetConfig.unregisterSheet(JournalEntryPage, 'core', JournalPDFPageSheet)
      // @ts-expect-error: registerSheet may not be typed in Foundry's API
      foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', GurpsPDFSheet, {
        types: ['pdf'],
        makeDefault: true,
        label: 'GURPS PDF Editor Sheet',
      })
    } else {
      DocumentSheetConfig.unregisterSheet(JournalEntryPage, 'core', JournalPDFPageSheet)
      DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', GurpsPDFSheetV1, {
        types: ['pdf'],
        makeDefault: true,
        label: 'GURPS PDF Editor Sheet',
      })
    }
  })

  Hooks.once('ready', () => {
    // PDF Configuration ----
    registerPDFSettings()
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
