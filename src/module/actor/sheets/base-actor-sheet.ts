import {
  Document,
  Application,
  ActorSheet,
  DragDrop,
  HandlebarsApplicationMixin,
  DocumentSheet,
} from '@gurps-types/foundry/index.js'
import { ImportSettings } from '@module/importer/index.js'
import { ItemType } from '@module/item/types.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'
import { constructHTMLButton } from '@module/util/dom.js'
import { getUser } from '@module/util/guards.js'
import { AnyMutableObject, DeepPartial } from 'fvtt-types/utils'

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
      createEmbedded: GurpsBaseActorSheet.#onCreateEmbedded,
      editEmbedded: GurpsBaseActorSheet.#onEditEmbedded,
      deleteEmbedded: GurpsBaseActorSheet.#onDeleteEmbedded,
      toggleContainer: GurpsBaseActorSheet.#onToggleContainer,
      addModifier: GurpsBaseActorSheet.#onAddModifier,
      rollOtf: GurpsBaseActorSheet.#onRollOtf,
    },
    dragDrop: [{ dragSelector: '[draggable]', dropSelector: null }],
  }

  /* ---------------------------------------- */

  protected override _getHeaderControls(): Application.HeaderControlsEntry[] {
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

  static async #onCreateEmbedded(
    this: GurpsBaseActorSheet,
    event: PointerEvent | null,
    target: HTMLElement
  ): Promise<void> {
    event?.preventDefault()

    const documentName = target.closest<HTMLElement>('[data-document-name]')?.dataset.documentName

    if (!documentName) {
      console.error('Could not find document name for embedded document to edit.')

      return
    }

    const createData: AnyMutableObject = { _id: foundry.utils.randomID() }

    const type = target.closest<HTMLElement>('[data-type]')?.dataset.type

    if (type) createData.type = type

    if (documentName === 'Item') {
      const defaultName = foundry.documents.Item.defaultName({
        type: type as foundry.documents.Item.SubType,
        parent: this.actor,
      })

      createData.name = defaultName
    }

    if (type === ItemType.Equipment) {
      const carried = target.closest<HTMLElement>('[data-carried]')?.dataset.carried === 'true'

      createData.system = { carried }
    }

    await this.actor.createEmbeddedDocuments(documentName as any, [createData], { parent: this.actor })
  }

  /* ---------------------------------------- */

  protected async _getEmbedded(target: HTMLElement): Promise<Document.Any | PseudoDocument.Any | null> {
    const uuid = target.closest<HTMLElement>('[data-uuid]')?.dataset.uuid

    if (!uuid) {
      console.error('Could not find UUID for embedded document to edit.')

      return null
    }

    let doc: Document.Any | PseudoDocument.Any | null = null

    if (uuid.startsWith('.')) {
      doc = await fromUuid(uuid, { relative: this.actor })
    } else {
      doc = await fromUuid(uuid)
    }

    if (!doc) {
      console.error(`Could not find document for UUID ${uuid}.`)

      return null
    }

    return doc
  }

  /* ---------------------------------------- */

  static async #onEditEmbedded(
    this: GurpsBaseActorSheet,
    event: PointerEvent | null,
    target: HTMLElement
  ): Promise<void> {
    event?.preventDefault?.()

    const doc = await this._getEmbedded(target)

    if (!doc) return

    const sheet = 'sheet' in doc ? doc.sheet : null

    if (!sheet) {
      console.error(`Could not find sheet for document with UUID ${doc.uuid}.`)

      return
    }

    await sheet.render({ force: true })
  }

  /* ---------------------------------------- */

  static async #onDeleteEmbedded(
    this: GurpsBaseActorSheet,
    event: PointerEvent | null,
    target: HTMLElement
  ): Promise<void> {
    event?.preventDefault?.()

    const doc = await this._getEmbedded(target)

    if (!doc) return

    if ('deleteDialog' in doc && typeof doc.deleteDialog === 'function') {
      await doc.deleteDialog?.()
    } else {
      console.error(`Could not find delete method for document with UUID ${doc.uuid}.`)

      return
    }
  }

  /* ---------------------------------------- */

  static async #onToggleContainer(this: GurpsBaseActorSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()
    const doc = await this._getEmbedded(target)

    if (!doc) return

    if ('toggleOpen' in doc && typeof doc.toggleOpen === 'function') {
      await doc?.toggleOpen?.()
    } else {
      console.error(
        'Tried to toggle open state of a pseudo-document or document, but the document does not have a toggleOpen function'
      )

      return
    }
  }

  /* ---------------------------------------- */

  static async #onAddModifier(this: GurpsBaseActorSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const value = target.dataset.value ?? '0'
    const comment = target.dataset.comment ?? ''

    GURPS.ModifierBucket.addModifier(value, comment)
  }

  /* ---------------------------------------- */

  static async #onRollOtf(this: GurpsBaseActorSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const value = target.dataset.value ?? ''

    const parsed = GURPS.parselink(value)

    if (!parsed.action) return

    GURPS.performAction(parsed.action, this.actor, event)
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

  override get title(): string {
    return this.actor.name
  }
}

export { GurpsBaseActorSheet }
