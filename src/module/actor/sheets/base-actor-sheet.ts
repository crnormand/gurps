import {
  Application,
  ActorSheet,
  DragDrop,
  HandlebarsApplicationMixin,
  DocumentSheet,
} from '@gurps-types/foundry/index.js'
import { ImportSettings } from '@module/importer/index.js'
import { OtfActionType } from '@module/otf/types.js'
import { constructHTMLButton } from '@module/util/dom.js'
import {
  createEmbeddedAction,
  deleteEmbeddedAction,
  editEmbeddedAction,
  toggleContainerAction,
} from '@module/util/embedded-document-actions.js'
import { getUser } from '@module/util/guards.js'
import { DeepPartial } from 'fvtt-types/utils'

import { ActorType } from '../types.js'

/* ---------------------------------------- */

namespace GurpsBaseActorSheet {
  export interface Configuration extends ActorSheet.Configuration {
    dragDrop?: DragDrop.Configuration[]
  }

  /* ---------------------------------------- */

  export interface DefaultOptions extends ActorSheet.DefaultOptions {
    dragDrop?: DragDrop.Configuration[]
  }

  /* ---------------------------------------- */

  export interface RenderOptions extends ActorSheet.RenderOptions {
    mode?: 1 | 2
  }

  /* ---------------------------------------- */

  export interface RenderContext extends ActorSheet.RenderContext {
    actor: Actor.Implementation
  }
}

/* ---------------------------------------- */

class GurpsBaseActorSheet<
  Type extends Actor.SubType = Actor.SubType,
  Configuration extends GurpsBaseActorSheet.Configuration = GurpsBaseActorSheet.Configuration,
  RenderOptions extends GurpsBaseActorSheet.RenderOptions = GurpsBaseActorSheet.RenderOptions,
  RenderContext extends GurpsBaseActorSheet.RenderContext = GurpsBaseActorSheet.RenderContext,
> extends HandlebarsApplicationMixin(ActorSheet)<RenderContext, Configuration, RenderOptions> {
  override get document(): Actor.OfType<Type> {
    return super.document as Actor.OfType<Type>
  }

  /* ---------------------------------------- */

  constructor(options: DocumentSheet.InputOptions<Configuration>) {
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

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector.
   * @param selector - The candidate HTML selector for dragging
   * @returns Can the current user drag this selector?
   */
  protected override _canDragStart(selector: DragDrop.DragSelector): boolean {
    return super._canDragStart(selector ?? '')
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector.
   * @param selector - The candidate HTML selector for the drop target
   * @returns Can the current user drop on this selector?
   */
  protected override _canDragDrop(selector: DragDrop.DragSelector): boolean {
    return super._canDragDrop(selector ?? '')
  }

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: GurpsBaseActorSheet.DefaultOptions = {
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
      createEmbedded: createEmbeddedAction,
      editEmbedded: editEmbeddedAction,
      deleteEmbedded: deleteEmbeddedAction,
      toggleContainer: toggleContainerAction,
      addModifier: { handler: GurpsBaseActorSheet.#onAddModifier, buttons: [0, 2] },
      rollOtf: { handler: GurpsBaseActorSheet.#onRollOtf, buttons: [0, 2] },
    },
    dragDrop: [{ dragSelector: '[draggable]', dropSelector: null }],
  }

  /* ---------------------------------------- */

  protected override _getHeaderControls(): Application.HeaderControlsEntry[] {
    const controls = super._getHeaderControls()

    const blockImport = ImportSettings.onlyTrustedUsersCanImport

    if (!blockImport || getUser().isTrusted) {
      controls.unshift({
        icon: 'fa-solid fa-file-import',
        label: 'Import',
        action: 'importActor',
      })
    }

    return controls
  }

  /* ---------------------------------------- */
  /*   Event handlers                         */
  /* ---------------------------------------- */

  static async #onImportActor(this: GurpsBaseActorSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()

    if (this.actor.isOfType(ActorType.Character)) {
      await GURPS.modules.Importer.actorImporterPrompt(this.actor)
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
    } as GurpsBaseActorSheet.RenderOptions)
  }

  /* ---------------------------------------- */

  static async #onAddModifier(this: GurpsBaseActorSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    let numValue = parseInt(target.dataset.value || '0')

    if (isNaN(numValue)) numValue = 0
    const value = numValue.signedString()

    const comment = target.dataset.comment ?? ''

    switch (event.button) {
      case 0:
        return GURPS.ModifierBucket.addModifier(value, comment)
      case 2: {
        return GURPS.whisperOtfToOwner(value + ' ' + comment, null, event, false, this.actor)
      }
    }
  }

  /* ---------------------------------------- */

  static async #onRollOtf(this: GurpsBaseActorSheet, event: PointerEvent, target: HTMLElement): Promise<any> {
    event.preventDefault()
    event.stopPropagation()

    const value = target.dataset.value ?? ''

    const parsed = GURPS.modules.Otf.parselink(value)

    if (!parsed.action) return

    switch (event.button) {
      case 0:
        return GURPS.modules.Otf.performAction(parsed.action, this.actor, event)
      case 2: {
        const isDamageRoll =
          parsed.action.type === OtfActionType.damage ||
          parsed.action.type === OtfActionType.derivedDamage ||
          parsed.action.type === OtfActionType.attackDamage

        return GURPS.whisperOtfToOwner(
          parsed.action.orig || '',
          parsed.action.overridetxt || null,
          event,
          isDamageRoll,
          this.actor
        )
      }
    }
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

  protected override async _onRender(
    context: DeepPartial<RenderContext>,
    options: DeepPartial<RenderOptions>
  ): Promise<void> {
    super._onRender(context, options)
    this.#dragDrop.forEach(dragDrop => dragDrop.bind(this.element))

    if (options.isFirstRender) {
      GURPS.SetLastActor(this.actor)
      this.element.addEventListener('click', () => GURPS.SetLastActor(this.actor))
    }
  }

  /* ---------------------------------------- */

  protected override async _onFirstRender(
    context: DeepPartial<RenderContext>,
    options: DeepPartial<RenderOptions>
  ): Promise<void> {
    super._onFirstRender(context, options)

    // Registered before _createContextMenu so this listener fires first and blocks
    // the context menu via stopImmediatePropagation when the target is an action element.
    this.element.addEventListener('contextmenu', event => {
      const target = event.target as HTMLElement

      if (target.closest('[data-action="rollOtf"], [data-action="addModifier"]')) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    })
  }

  /* ---------------------------------------- */

  override get title(): string {
    return this.actor.name
  }
}

export { GurpsBaseActorSheet }
