import { ImportSettings } from '@module/importer/index.js'
import { getUser } from '@module/util/guards.js'

import { ActorImporter } from './actor-importer.js'

import ActorSheet = gurps.applications.ActorSheet

// See module/types/foundry/actor-sheet-v2.ts for why we need this type assertion
const _InternalGurpsBaseActorSheet = <Type extends Actor.SubType>() =>
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.sheets.ActorSheetV2
  ) as unknown as gurps.applications.ActorSheet.HandlebarsConstructor<Actor.OfType<Type>>

/* ---------------------------------------- */

const GurpsBaseActorSheet = <Type extends Actor.SubType>() =>
  class GurpsBaseActorSheet extends _InternalGurpsBaseActorSheet<Type>() {
    static override DEFAULT_OPTIONS: ActorSheet.Configuration = {
      classes: ['gurps', 'sheet', 'actor'],
      tag: 'form',
      window: {
        resizable: true,
      },
      form: {
        submitOnChange: true,
      },
      actions: {
        importActor: GurpsBaseActorSheet.#onImportActor,
      },
    }

    /* ---------------------------------------- */

    static systemPath(part: string) {
      return `systems/gurps/templates/actor/${part}`
    }

    /* ---------------------------------------- */

    override _getHeaderControls(): gurps.applications.handlebars.ControlsEntry[] {
      const controls = super._getHeaderControls()

      const blockImport = ImportSettings.onlyTrustedUsersCanImport

      if (!blockImport || getUser().isTrusted) {
        controls.unshift({
          icon: 'fas fa-file-import',
          label: 'Import',
          action: 'importActor',
        })
      }

      return controls
    }

    /* ---------------------------------------- */

    static async #onImportActor(this: GurpsBaseActorSheet, event: PointerEvent): Promise<void> {
      event.preventDefault()

      if (this.actor.isOfType('characterV2')) {
        await GURPS.modules.Importer.importerPrompt(this.actor)
      } else {
        return new ActorImporter(this.actor).importActor()
      }
    }

    /* ---------------------------------------- */

    protected override async _onRender(
      context: ActorSheet.RenderContext,
      options: ActorSheet.RenderOptions
    ): Promise<void> {
      super._onRender(context, options)

      const html = this.element

      if (options.isFirstRender) {
        html.addEventListener('click', () => GURPS.SetLastActor(this.actor))
      }
    }

    /* ---------------------------------------- */

    override get title(): string {
      return this.actor.name
    }
  }

export { GurpsBaseActorSheet }
