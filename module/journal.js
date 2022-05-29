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
    let h = html.find('.editor-content')
    if (!!h) {
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
          let content = app.object.data.content
          if (content) cmd = ' ' + cmd
          app.object.data.update({ content: content + cmd })
          app.render(true)
        }
      }

      html.find('.editor').on('drop', event => dropHandler(event, _app, _options))
    }
  }
}
