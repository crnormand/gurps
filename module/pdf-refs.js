import * as Settings from '../lib/miscellaneous-settings.js'
import { PDFViewerSheet } from './pdf/sheet.js'

export const SJGProductMappings = {
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

// Convert GCS page refs into PDFoundry book & page. Special handling for refs like "PU8:12" or "DFRPG:A12"
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
  // // @ts-ignore
  // if (!ui.PDFoundry) {
  // 	ui.notifications?.warn('PDFoundry must be installed and configured to use links.')
  // 	return
  // }

  // Just in case we get sent multiple links separated by commas, we will open them all
  // or just the first found, depending on SETTING_PDF_OPEN_FIRST
  let success = false
  for (let link of links.split(',')) {
    if (!!success && game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PDF_OPEN_FIRST)) continue
    let t = link.trim()
    let i = t.indexOf(':')
    let book = ''
    let page = 0
    if (i > 0) {
      // Special case for refs like "PU8:12" or "DFRPG:A12"
      // First we need to check if after the colon is only numbers or has a letter
      let afterColon = t.substring(i + 1).trim()
      if (afterColon.match(/^[0-9]+$/)) {
        book = t.substring(0, i).trim()
        page = parseInt(afterColon)
      } else {
        let codeBefore = t.substring(0, i).trim() // e.g. "DFRPG"
        let codeAfter = afterColon.replace(/[0-9]*/g, '').trim() // e.g. "A"
        book = `${codeBefore}:${codeAfter}` // e.g. "DFRPG:A"
        page = parseInt(afterColon.replace(/[a-zA-Z]*/g, '')) // e.g. 12
      }
    } else {
      book = t.replace(/(.*?)[0-9].*/g, '$1').trim()
      page = parseInt(t.replace(/[a-zA-Z]*/g, ''))
    }
    // Special case for Separate Basic Set PDFs
    let setting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BASICSET_PDF)
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
    const pdfPages = []
    game.journal.forEach(j => {
      j.pages.forEach(p => {
        if (p.type === 'pdf') pdfPages.push(p)
      })
    })
    let journalPage = null
    if (pdfPages.length) journalPage = pdfPages.find(e => e.system.code === book)
    if (journalPage) {
      const viewer = new PDFViewerSheet(journalPage, { pageNumber: page })
      viewer.render(true)
      success = true
    } else {
      let url = GURPS.SJGProductMappings[book]
      if (url)
        // url = 'http://www.warehouse23.com/products?taxons%5B%5D=558398545-sb' // The main GURPS page
        window.open(url, '_blank')
      else ui.notifications?.warn("Unable to match book code '" + book + "'.")
    }
  }
}
