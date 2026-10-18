import { getBasicSetPDFSetting, isOpenFirstPDFSetting } from './settings.js'

export function handleOnPdf(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()

  const target = event.currentTarget as (HTMLElement & { dataset?: DOMStringMap }) | null
  const pdf = target?.dataset?.pdf || target?.innerText || ''

  handlePdf(pdf)
}

export function handlePdf(links: string): void {
  // Just in case we get sent multiple links separated by commas, we will open them all
  // or just the first found, depending on SETTING_PDF_OPEN_FIRST
  let success = false

  for (const link of links.split(',')) {
    if (success && isOpenFirstPDFSetting()) continue

    const pdfPages = getPdfJournalPages()

    // @ts-expect-error: GURPS extensions not recognized by TypeScript
    const bookCodes = pdfPages.filter(it => it.system?.code).map(it => it.system.code as string)

    // Special case for Separate Basic Set PDFs
    const setting = getBasicSetPDFSetting()

    const bookAndPage = extractBookAndPage(link, bookCodes, setting)

    if (!bookAndPage) {
      ui.notifications?.warn("Unable to match book code '" + link + "'.")
      continue
    }

    // @ts-expect-error: page may not be recognized by TypeScript
    const journalPage = pdfPages.length ? pdfPages.find(page => page.system.code === bookAndPage.book) : undefined

    if (journalPage) {
      const viewer = createGurpsPDFSheetViewer(journalPage, bookAndPage)

      viewer.render({ force: true })
      success = true
    } else {
      const pdfref = GURPS.SJGProductMappings[bookAndPage.book]
      const url = pdfref?.url

      if (url) {
        // url = 'http://www.warehouse23.com/products?taxons%5B%5D=558398545-sb' // The main GURPS page
        window.open(url, '_blank')
      } else {
        ui.notifications?.warn("Unable to match book code '" + bookAndPage.book + "'.")
      }
    }
  }
}

export type BookPageReference = {
  book: string
  page: number | null
  pageLabel: string | null
}

/** Exported only for testing. */
export function extractBookAndPage(link: string, bookCodes: string[] = [], setting?: string): null | BookPageReference {
  if (!link) return null

  const text = link.trim()
  let book = null
  let pageLabel: string | null = null

  if (bookCodes.length) {
    // sort book codes by length in descending order to match the longest code first
    bookCodes.sort((left, right) => right.length - left.length)

    const matchedBookCode = bookCodes.find(code => text.startsWith(code))

    if (matchedBookCode) {
      book = matchedBookCode
      pageLabel = text.slice(matchedBookCode.length)

      // if the first character of the remaining text is a colon, remove it
      if (pageLabel.startsWith(':')) {
        pageLabel = pageLabel.slice(1)
      }
    }
  }

  if (!book || !pageLabel) {
    if (text.includes(':')) {
      // Special case for refs like "PU8:12" or "DFRPG:A12"
      const [beforeColon, afterColon] = text.split(':', 2)

      book = beforeColon.trim()
      pageLabel = afterColon.trim()
    } else {
      // If there is no colon, we assume the format is like "B10" where the book is the first character(s) and the page is the number following it
      const match = text.match(/^(?<book>[A-Za-z]+)(?<page>[0-9]+)$/)

      if (match && match.groups) {
        book = match.groups.book
        pageLabel = match.groups.page
      }
    }
  }

  if (!book || !pageLabel) return null

  let page: number | null = null

  // Only adjust page if it is a valid number string.
  if (pageLabel.match(/^[0-9]+$/)) {
    page = parseInt(pageLabel)
    pageLabel = null

    // Basic Revised and Basic Set PDFs have different page numbers, so we need to adjust the page number based on the setting
    const isBasicRevised = book === 'B' && setting === 'Revised'

    if (!isBasicRevised) {
      if (book === 'B') {
        if (page > 336)
          if (setting === 'Separate') {
            book = 'BX'
            page = page - 335
          } else page += 2
      } else if (book === 'BX') {
        if (setting === 'Combined') {
          book = 'B'
          page += 2
        } else page -= 335
      }
    }
  }

  return { book, page, pageLabel }
}

function getPdfJournalPages(): foundry.documents.JournalEntryPage[] {
  const pdfPages: foundry.documents.JournalEntryPage[] = []

  // @ts-expect-error: game.journal may not be recognized by TypeScript
  game.journal.forEach((journal: foundry.documents.JournalEntry) => {
    journal.pages.forEach((page: foundry.documents.JournalEntryPage) => {
      if (page.type === 'pdf') pdfPages.push(page)
    })
  })

  return pdfPages
}

/**
 * Create and return the appropriate GURPS PDF sheet instance for the current Foundry version.
 */
function createGurpsPDFSheetViewer(journalPage: foundry.documents.JournalEntryPage, bookAndPage: BookPageReference) {
  // Workaround for missing types
  type PageRegistrationDescriptor = DocumentSheetConfig.SheetRegistrationDescriptor<typeof JournalEntryPage> & {
    default?: boolean
    cls?: typeof foundry.applications.api.ApplicationV2
  }

  const pdfSheetClasses = CONFIG.JournalEntryPage.sheetClasses.pdf as
    | undefined
    | Record<string, PageRegistrationDescriptor>

  if (!pdfSheetClasses) throw new Error('PDF sheet classes not found.')

  const sheetConfig = Object.values(pdfSheetClasses).find(config => config.default)

  if (!sheetConfig) throw new Error('Default PDF sheet configuration not found.')

  if (!sheetConfig.cls) throw new Error('Default PDF sheet class not found.')

  const pdfSheet = new sheetConfig.cls({
    // @ts-expect-error: document may not be recognized
    document: journalPage,
    bookPageReference: bookAndPage,
    mode: 'view', // or 'edit'
  })

  return pdfSheet
}
