import { atou } from '../../lib/utilities.js'
import GurpsWiring from '../gurps-wiring.js'

import { GurpsPDFSheet } from './sheet.ts'

/**
 * Renders the journal page text sheet and sets up event handling for dropped OTF items.
 */
export async function renderJournalPageSheet(
  app: foundry.applications.sheets.journal.JournalEntryPageTextSheet,
  html: HTMLElement,
  _document: any,
  _options: any
) {
  // @ts-expect-error: Ignore TypeScript error for accessing isView property on app
  if (!app.isView) return

  let parent = undefined
  let counter = 100

  while (!parent && counter > 0) {
    // Wait one animation frame to ensure the HTML is displayed before manipulating it.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

    console.log('Waiting for JournalPageEntryTextSheet HTML parent element to be available...')

    parent = html.parentElement?.parentElement
    counter--
  }

  GurpsWiring.hookupAllEvents(html)

  if (parent) {
    parent?.addEventListener('drop', event => dropHandler(event))
  } else {
    console.warn('Failed to find JournalPageEntryTextSheet HTML parent element after waiting.', html.parentElement)
  }

  function dropHandler(event: any) {
    event.preventDefault()

    if (event.originalEvent) event = event.originalEvent

    const data = JSON.parse(event.dataTransfer.getData('text/plain'))

    if (!!data && !!data.otf) {
      let cmd = ''

      if (data.encodedAction) {
        const action = JSON.parse(atou(data.encodedAction))

        if (action.quiet) cmd += '!'
      }

      cmd += data.otf

      if (data.displayname) {
        const quoteCharacter = data.displayname.includes('"') ? "'" : '"'

        cmd = quoteCharacter + data.displayname + quoteCharacter + cmd
      }

      cmd = '[' + cmd + ']'
      const content = app.document.text.content

      if (content) cmd = '<br>' + cmd
      // @ts-expect-error: Ignore TypeScript error for updating the document content
      app.document.update({ 'text.content': content + cmd })
    }
  }
}

/**
 * Renders the journal page PDF sheet and navigates to the specified page label within the PDF.
 *
 * @param sheet
 * @param html
 * @param _document
 * @param _options
 * @returns
 */
export function renderJournalPagePDFSheet(
  sheet: foundry.applications.sheets.journal.JournalEntryPagePDFSheet,
  html: HTMLElement,
  _document: any,
  _options: any
) {
  const app = sheet as GurpsPDFSheet
  const targetLabel = app.options?.bookPageReference?.pageLabel

  if (targetLabel) {
    const iframe = html.querySelector('iframe')

    if (!iframe) return

    iframe.addEventListener(
      'load',
      () => {
        // The iframe document has finished loading.
        console.log('PDF iframe loaded', iframe)
        goToPageLabel(iframe, targetLabel) // targetLabel = "B-30", "iii", etc.
      },
      { once: true }
    )
  }
}

/**
 * If there is a pageLabel specified, this function will attempt to navigate to that page within the PDF.
 *
 * @param iframe The HTML iframe element containing the PDF viewer.
 * @param targetLabel The page label to navigate to within the PDF.
 * @returns A promise that resolves to true if the navigation was successful, or false otherwise.
 */
async function goToPageLabel(iframe: HTMLIFrameElement, targetLabel: string) {
  console.log(`Navigating to page label: ${targetLabel}`, iframe)

  const win = iframe.contentWindow

  // @ts-expect-error: Ignore TypeScript error for accessing PDFViewerApplication on the iframe content window
  const app = win?.PDFViewerApplication

  if (!app) return false

  await app.initializedPromise

  if (!app.pdfDocument) {
    await new Promise(resolve => app.eventBus.on('documentloaded', resolve, { once: true }))
  }

  const labels = await app.pdfDocument.getPageLabels() // e.g. ['i','ii','iii','A-1',...,'B-30',...]

  if (!labels) return false

  const idx = labels.indexOf(targetLabel)

  if (idx < 0) return false

  app.pdfViewer.currentPageNumber = idx + 1 // physical page, 1-based

  return true
}
