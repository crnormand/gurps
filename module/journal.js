import { atou } from '../lib/utilities.js'

import GurpsWiring from './gurps-wiring.js'

export default class GurpsJournalEntry {
  static ready() {
    Hooks.on('renderJournalEntryPageTextSheet', GurpsJournalEntry._renderJournalPageSheet)
  }

  /**
   * @param {Application} _app
   * @param {JQuery<HTMLElement>} html
   * @param {*} _options
   */
  static _renderJournalPageSheet(app, html, document) {
    if ((game.release?.generation ?? 12) >= 13) {
      if (!app.isView) return
    } else if (document.isEditable) return

    // Crazy hack... html is NOT displayed yet, so you can't find the Journal Page. Must delay to allow other thread to
    //  display HTML.
    // TODO: Not sure this timeout is necessary; the only thing that depends on parent is setting the dropHandler.
    //  Maybe there is a better way to do this?
    setTimeout(() => {
      // TODO: Convert to native HTML, not JQuery.
      if (html instanceof HTMLElement) html = $(html)

      let h = html.parent().find('.journal-page-content')

      if (!!h && h.length > 0) {
        GurpsWiring.hookupAllEvents(html)

        const dropHandler = function (event, app) {
          event.preventDefault()
          if (event.originalEvent) event = event.originalEvent
          const data = JSON.parse(event.dataTransfer.getData('text/plain'))

          if (!!data && !!data.otf) {
            let cmd = ''

            if (data.encodedAction) {
              let action = JSON.parse(atou(data.encodedAction))

              if (action.quiet) cmd += '!'
            }

            cmd += data.otf

            if (data.displayname) {
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
          .on('drop', event => dropHandler(event, app))
      }
    }, 10)
  }
}
