import './markdown-it.js'
import { SemanticVersion } from './semver.js'

export class ChangeLogWindow extends FormApplication {
  constructor(lastVersion) {
    super({}, {})

    this.lastVersion = lastVersion
  }

  static get defaultOptions() {
    const options = super.defaultOptions
    return foundry.utils.mergeObject(options, {
      id: 'changelog',
      classes: ['gurps', 'changelog'],
      template: 'systems/gurps/templates/changelog.hbs',
      width: 700,
      submitOnChange: true,
      closeOnSubmit: false,
    })
  }

  get title() {
    return `${game.i18n.localize('GURPS.changelog.title')} ~ ${game.i18n.localize('GURPS.changelog.readme')}`
  }

  async getData() {
    let data = await super.getData()

    let xhr = new XMLHttpRequest()
    xhr.open('GET', 'systems/gurps/assets/changelog.md')

    let promise = new Promise(resolve => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          data.changelog = this._processChangelog(xhr.response)
          resolve(data)
        }
      }
    })
    xhr.send(null)

    return promise
  }

  _processChangelog(md) {
    const MD = window.markdownit()
    md = md.replace(/<a href=.*<\/a>/g, '') // Remove HTML link from internal changelog display

    // Cut off irrelevant changelog entries
    let lines = md.split(/[\n\r]/)
    let count = 0 // Max at 5
    if (this.lastVersion) {
      for (let a = 0; a < lines.length; a++) {
        let line = lines[a]
        if (line.match(/([0-9]+\.[0-9]+\.[0-9]+)/)) {
          count++
          const version = SemanticVersion.fromString(RegExp.$1)
          if (count > 5 || !version.isHigherThan(this.lastVersion)) {
            lines = lines.slice(0, a)
            break
          }
        }
      }
    }

    return MD.render(lines.join('\n'))
  }
}
