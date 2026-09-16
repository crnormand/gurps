import '@lib/markdown-it.js'
import { SemanticVersion } from '../../util/semver.js'

export class ChangeLogWindow extends FormApplication {
  constructor(lastVersion, force = true) {
    super({}, {})

    this.lastVersion = lastVersion
    this.force = force
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

    xhr.open('GET', 'systems/gurps/changelog.md')

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

  _processChangelog(markdownContent) {
    const converter = new window.showdown.Converter(CONST.SHOWDOWN_OPTIONS)
    const semverRegex =
      /(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/

    let lines = markdownContent
      .replace(/<a href=.*<\/a>/g, '') // Remove HTML link from internal changelog display
      .split(/[\n\r]/) // Split into lines

    // Cut off irrelevant changelog entries
    let count = 0 // Max at 5

    if (this.lastVersion) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex]

        const matches = line.match(semverRegex)

        console.log(matches)

        if (matches) {
          count++
          const version = SemanticVersion.fromString(matches[0])

          if (count > 5 || (!version.isHigherThan(this.lastVersion) && !this.force)) {
            lines = lines.slice(0, lineIndex)
            break
          }
        }
      }
    }

    return converter.makeHtml(lines.join('\n'))
  }
}
