import GurpsWiring from './gurps-wiring.js'

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
      h.html(GURPS.gurpslink(h[0].innerHTML))
      GurpsWiring.hookupGurps(html)
      GurpsWiring.hookupGurpsRightClick(html)
    }
    html.find('[data-otf]').each((_, li) => {
      li.setAttribute('draggable', 'true')
      li.addEventListener('dragstart', ev => {
        let display = ''
        if (!!ev.currentTarget?.dataset.action) display = ev.currentTarget.innerText
        return ev.dataTransfer?.setData(
          'text/plain',
          JSON.stringify({
            otf: li.getAttribute('data-otf'),
            displayname: display,
          }),
        )
      })
    })
  }
}
