import { SemanticVersion } from '../../util/semver.js'

export class ChangeLogWindow extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(lastVersion, force = true) {
    super()

    this.lastVersion = lastVersion
    this.force = force
  }

  static DEFAULT_OPTIONS = {
    id: 'changelog',
    classes: ['gurps', 'changelog'],
    tag: 'form',
    window: {
      resizable: true,
    },
    position: {
      width: 700,
      height: 'auto',
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
  }

  static PARTS = {
    main: {
      template: 'systems/gurps/templates/changelog.hbs',
      scrollable: ['content'],
    },
  }

  get title() {
    return `${game.i18n.localize('GURPS.changelog.title')} ~ ${game.i18n.localize('GURPS.changelog.readme')}`
  }

  async _prepareContext(options) {
    const data = await super._prepareContext(options)

    const xhr = new XMLHttpRequest()

    xhr.open('GET', 'systems/gurps/changelog.md')

    const promise = new Promise(resolve => {
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
