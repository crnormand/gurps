import { ItemSheet, DragDrop } from '@gurps-types/foundry/index.js'

// See module/types/foundry/actor-sheet.ts for why we need this type assertion
const _InternalGurpsBaseItemSheet = <
  Type extends Item.SubType,
  RenderContext extends ItemSheet.RenderContext = ItemSheet.RenderContext,
  Configuration extends ItemSheet.Configuration = ItemSheet.Configuration,
  RenderOptions extends ItemSheet.RenderOptions = ItemSheet.RenderOptions,
>() =>
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.sheets.ItemSheetV2
  ) as unknown as ItemSheet.HandlebarsConstructor<Item.OfType<Type>, RenderContext, Configuration, RenderOptions>

/* ---------------------------------------- */

namespace GurpsBaseItemSheet {
  export interface Configuration extends ItemSheet.Configuration {
    dragDrop?: DragDrop.Configuration[]
  }

  export interface RenderOptions extends ItemSheet.RenderOptions {
    mode?: 1 | 2
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderContext extends ItemSheet.RenderContext {}
}

/* ---------------------------------------- */

const GurpsBaseItemSheet = <
  Type extends Item.SubType,
  Configuration extends GurpsBaseItemSheet.Configuration = GurpsBaseItemSheet.Configuration,
  RenderOptions extends GurpsBaseItemSheet.RenderOptions = GurpsBaseItemSheet.RenderOptions,
  RenderContext extends GurpsBaseItemSheet.RenderContext = GurpsBaseItemSheet.RenderContext,
>() =>
  class GurpsBaseItemSheet extends _InternalGurpsBaseItemSheet<Type, RenderContext, Configuration, RenderOptions>() {
    constructor(options?: Configuration & { document?: Item.OfType<Type> }) {
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
    protected _mode: (typeof GurpsBaseItemSheet.MODES)[keyof typeof GurpsBaseItemSheet.MODES] =
      GurpsBaseItemSheet.MODES.PLAY

    /* ---------------------------------------- */

    /** Is this sheet in Play Mode? */
    get isPlayMode(): boolean {
      return this._mode === GurpsBaseItemSheet.MODES.PLAY
    }

    /* ---------------------------------------- */

    /** Is this sheet in Edit Mode? */
    get isEditMode(): boolean {
      return this._mode === GurpsBaseItemSheet.MODES.EDIT
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
        this.options.dragDrop?.map(dragDrop => {
          dragDrop.permissions = {
            dragstart: this._canDragStart.bind(this),
            drop: this._canDragDrop.bind(this),
          }
          dragDrop.callbacks = {
            dragstart: this._onDragStart.bind(this),
            dragover: this._onDragOver.bind(this),
            drop: this._onDrop.bind(this),
          }

          return new foundry.applications.ux.DragDrop(dragDrop)
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
     */
    protected override _canDragStart(_selector: DragDrop.DragSelector): boolean {
      return this.isEditable
    }

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param  selector The candidate HTML selector for the drop target
     * @returns         Can the current user drop on this selector?
     */
    protected override _canDragDrop(_selector: DragDrop.DragSelector): boolean {
      return this.isEditable
    }

    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param  event       The originating DragEvent
     */
    protected override _onDragStart(event: DragEvent) {
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
     */
    protected override _onDragOver(_event: DragEvent): void {}

    /* ---------------------------------------- */

    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param event       The originating DragEvent
     */
    protected override async _onDrop(_event: DragEvent): Promise<void> {}

    /* ---------------------------------------- */

    static override DEFAULT_OPTIONS: ItemSheet.DefaultOptions<GurpsBaseItemSheet.Configuration> = {
      classes: ['gurps', 'sheet', 'item'],
      tag: 'form',
      window: {
        resizable: true,
      },
      form: {
        submitOnChange: true,
      },
      actions: {},
      dragDrop: [{ dragSelector: '[draggable]', dropSelector: null }],
    }

    /* ---------------------------------------- */

    override get title(): string {
      return this.item.name
    }
  }

export { GurpsBaseItemSheet }
