import * as Settings from '../lib/miscellaneous-settings.js'

export const SJGProductMappings = {
  ACT1: 'http://www.warehouse23.com/products/gurps-action-1-heroes',
  ACT3: 'http://www.warehouse23.com/products/gurps-action-3-furious-fists',
  B: 'http://www.warehouse23.com/products/gurps-basic-set-characters-and-campaigns',
  BS: 'http://www.warehouse23.com/products/gurps-banestorm',
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
  RSWL: 'http://www.warehouse23.com/products/gurps-reign-of-steel-will-to-live',
  SU: 'http://www.warehouse23.com/products/gurps-supers-3',
  TMS: 'http://www.warehouse23.com/products/gurps-thaumatology-magical-styles',
  TRPM: 'http://www.warehouse23.com/products/gurps-thaumatology-ritual-path-magic',
  TS: 'http://www.warehouse23.com/products/gurps-tactical-shooting',
  TSOR: 'http://www.warehouse23.com/products/gurps-thaumatology-sorcery',
  UT: 'http://www.warehouse23.com/products/gurps-ultra-tech',
  VOR: 'http://www.warehouse23.com/products/vorkosigan-saga-sourcebook-and-roleplaying-game',
}

// Convert GCS page refs into PDFoundry book & page.   Special handling for refs like "PU8:12"
/**
 * @param {JQuery.ClickEvent} event
 */
export function handleOnPdf(event) {
  event.preventDefault()
  event.stopPropagation()
  let pdf = event.currentTarget.dataset?.pdf || event.currentTarget.innerText
  handlePdf(pdf)
}

/**
 * @param {string} links
 */
export function handlePdf(links) {
  // @ts-ignore
  if (!ui.PDFoundry) {
    ui.notifications?.warn('PDFoundry must be installed and configured to use links.')
    return
  }

  // Just in case we get sent multiple links separated by commas, we will open them all
  links.split(',').forEach(link => {
    let t = link.trim()
    let i = t.indexOf(':')
    let book = ''
    let page = 0
    if (i > 0) {
      book = t.substring(0, i).trim()
      page = parseInt(t.substr(i + 1))
    } else {
      book = t.replace(/[0-9]*/g, '').trim()
      page = parseInt(t.replace(/[a-zA-Z]*/g, ''))
    }
    // Special case for Separate Basic Set PDFs
    if (book === 'B') {
      let s = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BASICSET_PDF)
      if (page > 336)
        if (s === 'Separate') {
          book = 'BX'
          page = page - 335
        } else page += 2
    }
    // @ts-ignore
    const pdf = ui.PDFoundry.findPDFDataByCode(book)
    if (pdf === undefined) {
      let url = GURPS.SJGProductMappings[book]
      if (!url) url = 'http://www.warehouse23.com/products?taxons%5B%5D=558398545-sb' // The main GURPS page
      window.open(url, '_blank')
      // @ts-ignore
    } else ui.PDFoundry.openPDF(pdf, { page })
  })
}
