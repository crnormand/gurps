import { DeepPartial } from 'fvtt-types/utils'

import { SemanticVersion } from '../../util/semver.js'

type ChangeLogContext = foundry.applications.api.ApplicationV2.RenderContext & {
  changelog: string
}

export class ChangeLogWindow extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  lastVersion: SemanticVersion | null
  force: boolean

  /**
   * Arguments:
   *   lastVersion - The last version of the application that was run -- if force === false, the changelog will only be shown for versions higher than this one.
   *   force - Whether to force the display of the changelog.
   */
  constructor(lastVersion: SemanticVersion | null, force = true) {
    super()

    this.lastVersion = lastVersion
    this.force = force
  }

  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
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

  static override PARTS = {
    main: {
      template: 'systems/gurps/templates/changelog.hbs',
      scrollable: ['content'],
    },
  }

  override get title(): string {
    return `${game.i18n!.localize('GURPS.changelog.title')} ~ ${game.i18n!.localize('GURPS.changelog.readme')}`
  }

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions
  ): Promise<ChangeLogContext> {
    const data = await super._prepareContext(options)
    const xhr = new XMLHttpRequest()

    xhr.open('GET', 'systems/gurps/changelog.md')

    const promise = new Promise<ChangeLogContext>(resolve => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve({
            ...data,
            changelog: this._processChangelog(xhr.response),
          })
        }
      }
    })

    xhr.send(null)

    return promise
  }

  _processChangelog(markdownContent: string): string {
    const converter = new globalThis.showdown.Converter(CONST.SHOWDOWN_OPTIONS)
    const semverRegex =
      /(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/

    let lines = markdownContent
      .replace(/<a href=.*<\/a>/g, '') // Remove HTML link from internal changelog display
      .split(/[\n\r]/) // Split into lines

    // Cut off irrelevant changelog entries
    let count = 0 // Max at 5

    if (this.lastVersion) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex]
        const matches = line.match(semverRegex)

        if (matches) {
          count++
          const version = SemanticVersion.fromString(matches[0])

          if (version && (count > 5 || (!version.isHigherThan(this.lastVersion) && !this.force))) {
            lines = lines.slice(0, lineIndex)
            break
          }
        }
      }
    }

    return converter.makeHtml(lines.join('\n'))
  }
}
