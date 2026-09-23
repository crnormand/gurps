import { atou } from '../../lib/utilities.js'
import GurpsWiring from '../gurps-wiring.js'

/**
 *
 * @param {*} app
 * @param {HTMLElement} html
 * @param {*} document
 * @param {*} options
 * @returns
 */
export async function _renderJournalPageSheet(app, html, document, options) {
  if (!app.isView) return

  let parent = undefined
  let counter = 100

  while (!parent && counter > 0) {
    // Wait one animation frame to ensure the HTML is displayed before manipulating it.
    await new Promise(resolve => requestAnimationFrame(() => resolve()))

    console.log('Waiting for JournalPageEntryTextSheet HTML parent element to be available...')

    parent = html.parentElement?.parentElement
    counter--
  }

  GurpsWiring.hookupAllEvents(html)

  if (!!parent) {
    parent?.addEventListener('drop', event => dropHandler(event))
  } else {
    console.warn('Failed to find JournalPageEntryTextSheet HTML parent element after waiting.', html.parentElement)
  }

  function dropHandler(event) {
    event.preventDefault()

    if (event.originalEvent) event = event.originalEvent

    const data = JSON.parse(event.dataTransfer.getData('text/plain'))

    if (!!data && !!data.otf) {
      let cmd = ''

      if (!!data.encodedAction) {
        const action = JSON.parse(atou(data.encodedAction))
        if (action.quiet) cmd += '!'
      }

      cmd += data.otf

      if (!!data.displayname) {
        const quoteCharacter = data.displayname.includes('"') ? "'" : '"'
        cmd = quoteCharacter + data.displayname + quoteCharacter + cmd
      }

      cmd = '[' + cmd + ']'
      const content = app.document.text.content
      if (content) cmd = '<br>' + cmd
      app.document.update({ 'text.content': content + cmd })
    }
  }
}

export function _renderJournalPagePDFSheet(app, html, document, options) {
  if (app.options.bookPageReference?.pageLabel) {
    const iframe = html.querySelector('iframe')
    if (!iframe) return

    iframe.addEventListener(
      'load',
      () => {
        // The iframe document has finished loading.
        console.log('PDF iframe loaded', iframe)
        const targetLabel = app.options.bookPageReference.pageLabel
        goToPageLabel(iframe, targetLabel) // targetLabel = "B-30", "iii", etc.
      },
      { once: true }
    )
  }
}

async function goToPageLabel(iframe, targetLabel) {
  console.log(`Navigating to page label: ${targetLabel}`, iframe)

  const win = iframe.contentWindow
  const app = win.PDFViewerApplication

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
