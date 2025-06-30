import { atou } from '../lib/utilities.js'
import GurpsWiring from './gurps-wiring.js'

export default class GurpsJournalEntry {
  static ready() {
    // renderJournalEntrySheet or renderJournalEntryPageSheet or renderJournalEntryPageTextSheet
    Hooks.on('renderJournalPageSheet', GurpsJournalEntry._renderJournalPageSheet)
    Hooks.on('renderJournalEntryPageTextSheet', GurpsJournalEntry._renderJournalPageSheet)
    //    Hooks.on('getJournalSheetEntryContext', GurpsJournalEntry._getJournalSheetEntryContext)
    //    Hooks.on('renderJournalSheet', GurpsJournalEntry._renderJournalSheet)
  }

  /**
   * @param {Application} _app
   * @param {JQuery<HTMLElement>} html
   * @param {*} _options
   */
  static _renderJournalPageSheet(app, html, document, options) {
    if (!app.isView) return

    // crazy hack... html is NOT displayed yet, so you can't find the Journal Page. Must delay to allow other thread to display HTML
    setTimeout(() => {
      if (html instanceof HTMLElement) html = $(html)

      let h = html.parent().find('.journal-page-content')
      if (!!h && h.length > 0) {
        GurpsWiring.hookupAllEvents(html)

        const dropHandler = function (event, app, options) {
          event.preventDefault()
          if (event.originalEvent) event = event.originalEvent
          const data = JSON.parse(event.dataTransfer.getData('text/plain'))
          if (!!data && !!data.otf) {
            let cmd = ''
            if (!!data.encodedAction) {
              let action = JSON.parse(atou(data.encodedAction))
              if (action.quiet) cmd += '!'
            }
            cmd += data.otf
            if (!!data.displayname) {
              let q = '"'
              if (data.displayname.includes('"')) q = "'"
              cmd = "'" + data.displayname + "'" + cmd
            }
            cmd = '[' + cmd + ']'
            let content = app.document.text.content
            if (content) cmd = '<br>' + cmd
            app.document.update({ 'text.content': content + cmd })
          }
        }

        html
          .parent()
          .parent()
          .on('drop', event => dropHandler(event, app, document))
      }
    }, 10)
  }
}
