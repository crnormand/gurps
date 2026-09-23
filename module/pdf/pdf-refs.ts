import { getBasicSetPDFSetting, isOpenFirstPDFSetting } from './settings.ts'

export const SJGProductMappings: Record<string, string> = {
  ACT1: 'http://www.warehouse23.com/products/gurps-action-1-heroes',
  ACT3: 'http://www.warehouse23.com/products/gurps-action-3-furious-fists',
  B: 'http://www.warehouse23.com/products/gurps-basic-set-characters-and-campaigns',
  BS: 'http://www.warehouse23.com/products/gurps-banestorm',
  BX: 'http://www.warehouse23.com/products/gurps-basic-set-characters-and-campaigns',
  DF1: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-1-adventurers-1',
  DF3: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-3-the-next-level-1',
  DF4: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-4-sages-1',
  DF8: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-8-treasure-tables',
  DF11: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-11-power-ups',
  DF12: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-12-ninja',
  DF13: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-13-loadouts',
  DF14: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-14-psi',
  DFM1: 'http://www.warehouse23.com/products/gurps-dungeon-fantasy-monsters-1',
  DFA: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DFM: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DFS: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DFE: 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  DR: 'http://www.warehouse23.com/products/gurps-dragons-1',
  F: 'http://www.warehouse23.com/products/gurps-fantasy',
  FDG: 'https://gaming-ballistic.myshopify.com/products/fantastic-dungeon-grappling?variant=42552585322751',
  GUL: 'https://www.gamesdiner.com/gulliver/',
  H: 'http://www.warehouse23.com/products/gurps-horror-1',
  HF: 'http://www.mygurps.com/historical_folks_4e.pdf',
  HT: 'http://www.warehouse23.com/products/gurps-high-tech-2',
  IW: 'http://www.warehouse23.com/products/gurps-infinite-worlds-1',
  LT: 'http://www.warehouse23.com/products/gurps-fourth-edition-low-tech',
  LTC1: 'http://www.warehouse23.com/products/gurps-low-tech-companion-1-philosophers-and-kings',
  LTIA: 'http://www.warehouse23.com/products/gurps-low-tech-instant-armor',
  LITE: 'http://www.warehouse23.com/products/SJG31-0004',
  M: 'http://www.warehouse23.com/products/gurps-magic-5',
  MPS: 'http://www.warehouse23.com/products/gurps-magic-plant-spells',
  MA: 'http://www.warehouse23.com/products/gurps-martial-arts',
  MAFCCS: 'http://www.warehouse23.com/products/gurps-martial-arts-fairbairn-close-combat-systems',
  MATG: 'http://www.warehouse23.com/products/gurps-martial-arts-technical-grappling',
  MH1: 'http://www.warehouse23.com/products/gurps-monster-hunters-1-champions',
  MYST: 'http://www.warehouse23.com/products/gurps-mysteries-1',
  MYTH: 'http://www.sjgames.com/gurps/books/myth/',
  NB: 'http://github.com/mjeffw/nordlond-bestiary-public/blob/main/README.md',
  P: 'http://www.warehouse23.com/products/gurps-powers',
  PDF: 'http://www.warehouse23.com/products/gurps-powers-divine-favor',
  PSI: 'http://www.warehouse23.com/products/gurps-psionic-powers',
  PU1: 'http://www.warehouse23.com/products/gurps-power-ups-1-imbuements-1',
  PU2: 'http://www.warehouse23.com/products/gurps-power-ups-2-perks',
  PU3: 'http://www.warehouse23.com/products/gurps-power-ups-3-talents',
  'PY#': 'http://www.warehouse23.com/products?utf8=%E2%9C%93&keywords=pyramid+magazine&x=0&y=0',
  PY77: 'https://warehouse23.com/products/pyramid-number-3-77-combat',
  RSWL: 'http://www.warehouse23.com/products/gurps-reign-of-steel-will-to-live',
  SU: 'http://www.warehouse23.com/products/gurps-supers-3',
  TMS: 'http://www.warehouse23.com/products/gurps-thaumatology-magical-styles',
  TRPM: 'http://www.warehouse23.com/products/gurps-thaumatology-ritual-path-magic',
  TS: 'http://www.warehouse23.com/products/gurps-tactical-shooting',
  TSOR: 'http://www.warehouse23.com/products/gurps-thaumatology-sorcery',
  UT: 'http://www.warehouse23.com/products/gurps-ultra-tech',
  VOR: 'http://www.warehouse23.com/products/vorkosigan-saga-sourcebook-and-roleplaying-game',
  WK: 'https://gaming-ballistic.myshopify.com/products/warlock-knight-vtt-module',
  // Dungeon Fantasy Boxed Set code conventions used in GCA
  'DFRPG:A': 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  'DFRPG:M': 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  'DFRPG:S': 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
  'DFRPG:E': 'http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game',
}

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

    let bookAndPage = extractBookAndPage(link)
    if (!bookAndPage) {
      ui.notifications?.warn("Unable to match book code '" + link + "'.")
      continue
    }

    const pdfPages = getPdfJournalPages()

    // @ts-expect-error: page may not be recognized by TypeScript
    const journalPage = pdfPages.length ? pdfPages.find(page => page.system.code === bookAndPage.book) : undefined

    if (journalPage) {
      const viewer = createGurpsPDFSheetViewer(journalPage, bookAndPage)
      viewer.render({ force: true })
      success = true
    } else {
      const url = GURPS.SJGProductMappings[bookAndPage.book ?? '']
      if (url)
        // url = 'http://www.warehouse23.com/products?taxons%5B%5D=558398545-sb' // The main GURPS page
        window.open(url, '_blank')
      else ui.notifications?.warn("Unable to match book code '" + bookAndPage.book + "'.")
    }
  }
}

export type BookPageReference = {
  book: string
  page: number | null
  pageLabel: string | null
}

/** Exported only for testing. */
export function extractBookAndPage(link: string): null | BookPageReference {
  if (!link) return null

  const text = link.trim()

  let book = null
  let page: number | null = null
  let pageLabel: string | null = null

  if (text.includes(':')) {
    // Special case for refs like "PU8:12" or "DFRPG:A12"
    const [beforeColon, afterColon] = text.split(':', 2)

    book = beforeColon.trim()
    pageLabel = afterColon.trim()
  } else {
    // If there is no colon, we assume the format is like "B10" where the book is the first character(s) and the page is the number following it
    let match = text.match(/^(?<book>[A-Za-z]+)(?<page>[0-9]+)$/)

    if (match && match.groups) {
      book = match.groups.book
      pageLabel = match.groups.page
    }
  }

  if (!book || !pageLabel) return null

  // Only adjust page if it is a valid number string.
  if (pageLabel && typeof pageLabel === 'string' && !isNaN(parseInt(pageLabel))) {
    page = parseInt(pageLabel)
    pageLabel = null

    // Special case for Separate Basic Set PDFs
    const setting = getBasicSetPDFSetting()

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
