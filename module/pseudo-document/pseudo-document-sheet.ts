import { PseudoDocument } from './pseudo-document.js'

import Application = foundry.applications.api.Application

import { AnyObject, DeepPartial } from 'fvtt-types/utils'

namespace PseudoDocumentSheet {
  export interface Configuration extends Application.Configuration {
    document: {
      uuid: string
      document: foundry.abstract.Document.Any
    }
  }
}

class PseudoDocumentSheet extends foundry.applications.api.HandlebarsApplicationMixin(Application) {
  constructor(
    options: DeepPartial<PseudoDocumentSheet.Configuration> & {
      document: { uuid: string; document: foundry.abstract.Document.Any }
    }
  ) {
    super(options)
    this.#pseudoUuid = options.document?.uuid
    this.#document = options.document?.document
  }

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: DeepPartial<Application.Configuration> & object = {
    id: '{id}',
    actions: {
      copyUuid: {
        handler: PseudoDocumentSheet.#copyUuid,
        buttons: [0, 2],
      },
    },
    classes: ['gurps'],
    form: {
      handler: PseudoDocumentSheet.#onSubmitForm,
      submitOnChange: true,
    },
    tag: 'form',
  }

  /* ---------------------------------------- */

  /**
   * Registered sheets. A map of documents to a map of pseudo-document uuids and their sheets.
   */
  static #sheets: Map<foundry.abstract.Document.Any, Map<string, PseudoDocumentSheet>> = new Map()

  /* ---------------------------------------- */

  /**
   * Retrieve or register a new instance of a pseudo-document sheet.
   * @returns An existing or new instance of a sheet, or null if the pseudo-document does not have a sheet class.
   */
  static getSheet(pseudoDocument: PseudoDocument): PseudoDocumentSheet | null {
    const doc = pseudoDocument.document

    if (!PseudoDocumentSheet.#sheets.get(doc)) {
      PseudoDocumentSheet.#sheets.set(doc, new Map())
    }

    if (!PseudoDocumentSheet.#sheets.get(doc)?.get(pseudoDocument.uuid)) {
      const Cls = pseudoDocument.metadata.sheetClass

      if (!Cls) return null
      PseudoDocumentSheet.#sheets.get(doc)?.set(pseudoDocument.uuid, new Cls({ document: pseudoDocument }))
    }

    return PseudoDocumentSheet.#sheets.get(doc)?.get(pseudoDocument.uuid) || null
  }

  /* ---------------------------------------- */

  /**
   * The pseudo-document. This can be null if a parent pseudo-document is removed.
   */
  get pseudoDocument(): PseudoDocument | null {
    let relative = this.document
    const uuidParts = this.#pseudoUuid.replace(relative.uuid, '').slice(1).split('.')

    for (let i = 0; i < uuidParts.length; i += 2) {
      const dname = uuidParts[i]
      const id = uuidParts[i + 1]

      // @ts-expect-error: TODO: define the Document types better so this doesn't resolve to "never"
      relative = relative?.getEmbeddedDocument(dname, id)
      if (!relative) return null
    }

    return relative as unknown as PseudoDocument | null
  }

  /* ---------------------------------------- */

  /**
   * Stored uuid of this pseudo document.
   */
  #pseudoUuid: string

  /* ---------------------------------------- */

  /**
   * The parent document.
   */
  #document: foundry.abstract.Document.Any

  /**
   * The parent document.
   */
  get document(): foundry.abstract.Document.Any {
    return this.#document
  }

  /* ---------------------------------------- */

  override get title(): string {
    const { documentName, name, id }: { documentName: string; name: string; id: string } = this.pseudoDocument as any

    return `${game.i18n?.localize(`DOCUMENT.${documentName}`)}: ${name ? name : id}`
  }

  /* -------------------------------------------------- */

  protected override _initializeApplicationOptions({
    document,
    ...options
  }: DeepPartial<PseudoDocumentSheet.Configuration>): PseudoDocumentSheet.Configuration {
    options = super._initializeApplicationOptions(options)
    options.uniqueId = `${this.constructor.name}-${document?.uuid?.replaceAll('.', '-')}`

    return options as PseudoDocumentSheet.Configuration
  }

  /* -------------------------------------------------- */

  override async _onFirstRender(
    context: DeepPartial<Application.RenderContext>,
    options: DeepPartial<Application.RenderOptions>
  ) {
    await super._onFirstRender(context, options)
    // @ts-expect-error: TODO: define the Document types better so this doesn't resolve to "never"
    this.document.apps[this.id] = this
  }

  /* -------------------------------------------------- */

  override _onClose(options: DeepPartial<Application.RenderOptions>): void {
    super._onClose(options)
    // @ts-expect-error: TODO: define the Document types better so this doesn't resolve to "never"
    delete this.document.apps[this.id]
  }

  /* -------------------------------------------------- */

  override async _renderFrame(options: DeepPartial<Application.RenderOptions>): Promise<HTMLElement> {
    const frame = await super._renderFrame(options)
    const copyLabel = game.i18n?.localize('SHEETS.CopyUuid') ?? ''

    const properties = Object.entries({
      type: 'button',
      class: 'header-control fa-solid fa-passport icon',
      'data-action': 'copyUuid',
      'data-tooltip': copyLabel,
      'aria-label': copyLabel,
    })
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
    const copyId = `<button ${properties}></button>`

    this.window.close?.insertAdjacentHTML('beforebegin', copyId)

    return frame
  }

  /* -------------------------------------------------- */

  override _canRender(_options: DeepPartial<Application.RenderOptions>): false | void {
    if (!this.pseudoDocument) {
      if (this.rendered) this.close()

      return false
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   */
  static #onSubmitForm(
    this: PseudoDocumentSheet,
    _event: Event | SubmitEvent,
    _form: HTMLElement,
    formData: FormDataExtended
  ) {
    const submitData = foundry.utils.expandObject(formData.object)

    this.pseudoDocument!.update(submitData as AnyObject)
  }

  /* -------------------------------------------------- */

  static #copyUuid(this: PseudoDocumentSheet, event: PointerEvent) {
    event.preventDefault() // Don't open context menu
    event.stopPropagation() // Don't trigger other events
    if (event.detail > 1) return // Ignore repeated clicks
    const pseudo = this.pseudoDocument!
    const id = event.button === 2 ? pseudo.id : pseudo.uuid
    const type = event.button === 2 ? 'id' : 'uuid'
    const label = game.i18n?.localize(`DOCUMENT.${pseudo.documentName}`) ?? ''

    game.clipboard?.copyPlainText(id)
    ui.notifications?.info('DOCUMENT.IdCopiedClipboard', { format: { label, type, id } })
  }
}
/* -------------------------------------------------- */

export { PseudoDocumentSheet }
