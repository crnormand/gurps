import GurpsWiring from './gurps-wiring.js'
import { atou } from '../lib/utilities.js'
import { gurpslink } from '../module/utilities/gurpslink.js'

export default class GurpsJournalEntry {
  static ready() {
    Hooks.on('renderJournalSheet', GurpsJournalEntry._renderJournalSheet)
  }

  /**
   * @param {Application} _app
   * @param {JQuery<HTMLElement>} html
   * @param {*} _options
   */
  static _renderJournalSheet(_app, html, _options) {
    setTimeout(() => {
      // crazy hack... html is NOT displayed yet, so you can't find the Journal Page.   Must delay to allow other thread to display HTML
      let h = html.find('.journal-page-content')
      if (!!h && h.length > 0) {
        h.html(gurpslink(h[0].innerHTML))
        GurpsWiring.hookupAllEvents(html)
        // GurpsWiring.hookupGurpsRightClick(html)

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
            let pid = _app._pages[_app.pageIndex]._id
            let jp = _app.document.pages.get(pid)
            let content = jp.text.content
            if (content) cmd = ' ' + cmd
            jp.update({ 'text.content': content + cmd })
            _app.render(true)
          }
        }

        html.find('.journal-entry-pages').on('drop', event => dropHandler(event, _app, _options))
      }
    }, 100)
  }
}
