import { getBasicSetPDFSetting, isOpenFirstPDFSetting } from './settings.js'
import { PDF_MAPPINGS } from './pdf-mappings.js'
import { createGurpsPDFSheetViewer } from './sheet.js'

function handleOnPdf(event: Event): void {
  event.preventDefault()
  event.stopPropagation()

  let reference = (event.currentTarget as HTMLElement).dataset?.pdf || (event.currentTarget as HTMLElement).innerText
  handlePdf(reference)
}

/* ---------------------------------------- */

function handlePdf(reference: string): void {
  const doOpenFirst = isOpenFirstPDFSetting()
  const basicSetSetting = getBasicSetPDFSetting()
  const definedPdfs = _getDefinedPdfs()
  const undefinedPdfs = PDF_MAPPINGS

  const references = reference.split(',').map(ref => ref.trim().toLowerCase())
  for (const ref of references) {
    if (ref === '') continue

    // Check if the PDF has already been defined in the system
    const definedKey = _matchPdf(ref, Object.keys(definedPdfs))
    if (definedKey) {
      let page = definedPdfs[definedKey]
      let pageNumber = parseInt(ref.replace(definedKey, '').replace(/[^0-9]/g, '')) || 1

      // Special case for Basic Set PDFs
      if (definedKey === 'B' && pageNumber > 336) {
        if (basicSetSetting === 'Separate') {
          page = definedPdfs['BX']
          pageNumber -= 335
        } else pageNumber += 2
      } else if (definedKey === 'BX') {
        if (basicSetSetting === 'Combined') {
          page = definedPdfs['B']
          pageNumber += 2
        } else pageNumber -= 335
      }

      const viewer = createGurpsPDFSheetViewer(page, pageNumber)
      viewer.render({ force: true })
      if (doOpenFirst) break
      else continue
    }

    // Check if the PDF is actually a link
    if (ref.startsWith('http')) {
      window.open(ref, '_blank')
      if (doOpenFirst) break
      else continue
    }

    // Check if the PDF matches a known mapping
    const key: string | null = _matchPdf(ref, Object.keys(undefinedPdfs))
    if (key !== null) {
      const entry = undefinedPdfs[key]
      if (entry.link !== '')
        new foundry.applications.api.Dialog({
          window: {
            title: `Open PDF: ${entry.name}`,
          },
          content:
            `This PDF with reference key ${key} is usually associated with the product "${entry.name}". ` +
            `\nPress OK to open the purchase page or Cancel to skip.`,
          buttons: [
            {
              label: 'OK',
              action: 'ok',
              callback: () => {
                window.open(entry.link, '_blank')
              },
            },
            { label: 'Cancel', action: 'cancel', callback: () => {} },
          ],
        }).render({ force: true })
    }
  }
}

/* ---------------------------------------- */

function _getDefinedPdfs(): Record<string, JournalEntryPage.OfType<'pdf'>> {
  const pages: Record<string, JournalEntryPage.OfType<'pdf'>> = {}
  game.journal?.forEach(entry => {
    entry.pages.forEach(page => {
      if (!page.isOfType('pdf')) return
      if (!page.system.code) return

      pages[page.system.code.toLowerCase()] = page
    })
  })
  return pages
}

/* ---------------------------------------- */

function _matchPdf(searchTerm: string, references: string[]): string | null {
  searchTerm = searchTerm.toLowerCase()
  let searchReference: string | null = null

  if (searchTerm.includes(':')) {
    searchReference = searchTerm.split(':')[0].trim()
  } else {
    searchReference = searchTerm.replace(/\d+/, '').trim()
  }
  if (searchReference === null) return null

  for (const reference of references) {
    if (reference.toLowerCase() === searchReference) return reference
  }

  return null
}

/* ---------------------------------------- */

export { handleOnPdf, handlePdf }
