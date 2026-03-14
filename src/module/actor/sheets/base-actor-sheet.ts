import { ImportSettings } from '@module/importer/index.js'
import { constructHTMLButton } from '@module/util/dom.js'
import { getUser } from '@module/util/guards.js'
import { DeepPartial } from 'fvtt-types/utils'

import { ActorImporter } from '../actor-importer.js'

import DragDrop = foundry.applications.ux.DragDrop
import ActorSheet = gurps.applications.ActorSheet

// See module/types/foundry/actor-sheet-v2.ts for why we need this type assertion
const _InternalGurpsBaseActorSheet = <
  Type extends Actor.SubType,
  RenderOptions extends ActorSheet.RenderOptions = ActorSheet.RenderOptions,
>() =>
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.sheets.ActorSheetV2
  ) as unknown as gurps.applications.ActorSheet.HandlebarsConstructor<Actor.OfType<Type>, RenderOptions>

namespace GurpsBaseActorSheet {
  export type RenderOptions = ActorSheet.RenderOptions & {
    mode?: 1 | 2
  }
}

/* ---------------------------------------- */

const GurpsBaseActorSheet = <
  Type extends Actor.SubType,
  RenderOptions extends GurpsBaseActorSheet.RenderOptions = GurpsBaseActorSheet.RenderOptions,
>() =>
  class GurpsBaseActorSheet extends _InternalGurpsBaseActorSheet<Type, RenderOptions>() {
    constructor(options?: ActorSheet.Configuration & { document?: Actor.OfType<Type> }) {
      super(options)
      this.#dragDrop = this.#createDragDropHandlers()
    }

    /* ---------------------------------------- */

    /** Available sheet modes */
    static MODES = Object.freeze({
      PLAY: 1,
      EDIT: 2,
    })

    /**
     * The mode the sheet is currently in.
     */
    protected _mode: (typeof GurpsBaseActorSheet.MODES)[keyof typeof GurpsBaseActorSheet.MODES] =
      GurpsBaseActorSheet.MODES.PLAY

    /* ---------------------------------------- */

    /** Is this sheet in Play Mode? */
    get isPlayMode(): boolean {
      return this._mode === GurpsBaseActorSheet.MODES.PLAY
    }

    /* ---------------------------------------- */

    /** Is this sheet in Edit Mode? */
    get isEditMode(): boolean {
      return this._mode === GurpsBaseActorSheet.MODES.EDIT
    }

    /* ---------------------------------------- */
    /*  Drag & Drop Handling                    */
    /* ---------------------------------------- */

    #dragDrop: DragDrop[]

    /* ---------------------------------------- */

    /**
     * Create drag-and-drop workflow handlers for this Application
     * @returns An array of DragDrop handlers
     */
    #createDragDropHandlers(): DragDrop[] {
      return (
        (this.options as ActorSheet.Configuration).dragDrop?.map(dragDrop => {
          dragDrop.permissions = {
            dragstart: this._canDragStart.bind(this),
            drop: this._canDragDrop.bind(this),
          }
          dragDrop.callbacks = {
            dragstart: this._onDragStart.bind(this),
            dragover: this._onDragOver.bind(this),
            drop: this._onDrop.bind(this),
          }

          return new DragDrop(dragDrop)
        }) ?? []
      )
    }

    /* ---------------------------------------- */

    get dragDrop(): DragDrop[] {
      return this.#dragDrop
    }

    /* ---------------------------------------- */

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param selector       The candidate HTML selector for dragging
     * @returns              Can the current user drag this selector?
     * @protected
     */
    protected _canDragStart(_selector: DragDrop.DragSelector): boolean {
      return this.isEditable
    }

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param  selector The candidate HTML selector for the drop target
     * @returns         Can the current user drop on this selector?
     * @protected
     */
    protected _canDragDrop(_selector: DragDrop.DragSelector): boolean {
      return this.isEditable
    }

    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param {DragEvent} event       The originating DragEvent
     * @protected
     */
    protected _onDragStart(event: DragEvent) {
      // Extract the data you need
      const dragData = null

      if (!dragData) return

      // Set data transfer
      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData))
    }

    /* ---------------------------------------- */

    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param event       The originating DragEvent
     * @protected
     */
    protected _onDragOver(_event: DragEvent): void {}

    /* ---------------------------------------- */

    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param event       The originating DragEvent
     * @protected
     */
    protected async _onDrop(_event: DragEvent): Promise<void> {
      // NOTE: STUB
      // const data = foundry.applications.ux.TextEditor.getDragEventData(event)
      // switch (data?.type) {
      // }
    }

    /* ---------------------------------------- */

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
        toggleMode: GurpsBaseActorSheet.#onToggleMode,
      },
      dragDrop: [{ dragSelector: '[draggable]', dropSelector: null }],
    }

    /* ---------------------------------------- */

    static systemPath(part: string) {
      return `systems/gurps/templates/actor/${part}`
    }

    /* ---------------------------------------- */

    override _getHeaderControls(): gurps.applications.api.Application.ControlsEntry[] {
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
        await GURPS.modules.Importer.actorImporterPrompt(this.actor)
      } else {
        return new ActorImporter(this.actor).importActor()
      }
    }

    /* ---------------------------------------- */

    static async #onToggleMode(this: GurpsBaseActorSheet): Promise<void> {
      if (!this.isEditable) {
        console.error("You can't switch to Edit mode if the sheet is uneditable.")

        return
      }

      await this.render({
        mode: this.isPlayMode ? GurpsBaseActorSheet.MODES.EDIT : GurpsBaseActorSheet.MODES.PLAY,
      } as RenderOptions)
    }

    /* ---------------------------------------- */
    /*  Render Handling                         */
    /* ---------------------------------------- */

    protected override _configureRenderOptions(options: DeepPartial<RenderOptions>): void {
      super._configureRenderOptions(options)

      if (options.mode && this.isEditable) this._mode = options.mode
    }

    /* ---------------------------------------- */

    protected override async _renderFrame(options: DeepPartial<RenderOptions>): Promise<HTMLElement> {
      const frame = await super._renderFrame(options)

      const buttons = [
        constructHTMLButton({
          label: '',
          classes: ['header-control', 'icon', 'fa-solid', 'fa-user-lock'],
          dataset: { action: 'toggleMode', tooltip: 'GURPS.sheet.toggleMode' },
        }),
      ]

      this.window.controls?.after(...buttons)

      return frame
    }

    /* ---------------------------------------- */

    protected override async _onRender(context: ActorSheet.RenderContext, options: RenderOptions): Promise<void> {
      super._onRender(context, options)
      this.#dragDrop.forEach(dragDrop => dragDrop.bind(this.element))

      if (options.isFirstRender) {
        GURPS.SetLastActor(this.actor)
        this.element.addEventListener('click', () => GURPS.SetLastActor(this.actor))
      }
    }

    /* ---------------------------------------- */

    override get title(): string {
      return this.actor.name
    }
  }

export { GurpsBaseActorSheet }
