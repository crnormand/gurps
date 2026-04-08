import { Application } from '@gurps-types/foundry/index.js'
import { AnyObject, DeepPartial } from 'fvtt-types/utils'

import { PseudoDocument } from './pseudo-document.js'

namespace PseudoDocumentSheet {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderOptions extends Application.RenderOptions {}

  export interface Configuration<Doc extends PseudoDocument.Any> extends Application.Configuration {
    document: Doc
  }

  export interface RenderContext<Doc extends PseudoDocument.Any> extends Application.RenderContext {
    document: Doc
    fields?: Record<string, { field: foundry.data.fields.DataField.Any; value: any; name: string }>
  }

  export type DefaultOptions<Conf extends Configuration<PseudoDocument.Any>> = DeepPartial<Conf> &
    object & {
      document?: never
    }
}

class PseudoDocumentSheet<
  Doc extends PseudoDocument.Any = PseudoDocument.Any,
  RenderOptions extends PseudoDocumentSheet.RenderOptions = PseudoDocumentSheet.RenderOptions,
  Configuration extends PseudoDocumentSheet.Configuration<Doc> = PseudoDocumentSheet.Configuration<Doc>,
  RenderContext extends PseudoDocumentSheet.RenderContext<Doc> = PseudoDocumentSheet.RenderContext<Doc>,
> extends foundry.applications.api.HandlebarsApplicationMixin(Application) {
  constructor(
    options: DeepPartial<Configuration> & {
      document: Doc
    }
  ) {
    super(options)
    this.#document = options.document.document
    this.#pseudoDocumentType = options.document.documentName as gurps.Pseudo.Name
    this.#pseudoDocumentId = options.document._id
  }

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: PseudoDocumentSheet.DefaultOptions<
    PseudoDocumentSheet.Configuration<PseudoDocument.Any>
  > = {
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
  static getSheet<Doc extends PseudoDocument.Any>(pseudoDocument: Doc): PseudoDocumentSheet<Doc> | null {
    const doc = pseudoDocument.document

    if (!PseudoDocumentSheet.#sheets.get(doc)) {
      PseudoDocumentSheet.#sheets.set(doc, new Map())
    }

    if (!PseudoDocumentSheet.#sheets.get(doc)?.get(pseudoDocument.uuid)) {
      const Cls = pseudoDocument.metadata.sheetClass

      if (!Cls) return null
      // @ts-expect-error - No idea what is going on here.
      PseudoDocumentSheet.#sheets.get(doc)?.set(pseudoDocument.uuid, new Cls({ document: pseudoDocument }))
    }

    return (PseudoDocumentSheet.#sheets.get(doc)?.get(pseudoDocument.uuid) as PseudoDocumentSheet<Doc>) || null
  }

  /* ---------------------------------------- */

  #document: gurps.Pseudo.ParentDocument
  #pseudoDocumentType: gurps.Pseudo.Name
  #pseudoDocumentId: string

  /* ---------------------------------------- */

  /**
   * The pseudo-document. This can be null if a parent pseudo-document is removed.
   */
  get pseudoDocument(): Doc | null {
    return (
      // @ts-expect-error - The documentNames between Actors and Items are not mutually compatible, but the safety
      // should still be ensured at runtime
      (this.#document.getEmbeddedCollection(this.#pseudoDocumentType)?.get(this.#pseudoDocumentId) as Doc) ?? null
    )
  }

  /* ---------------------------------------- */

  /**
   * The parent document.
   */
  get document(): gurps.Pseudo.ParentDocument {
    return this.#document
  }

  /* ---------------------------------------- */

  override get title(): string {
    const { documentName, name, id }: { documentName: string; name: string; id: string } = this.pseudoDocument as any

    return `${game.i18n?.localize(`DOCUMENT.${documentName}`)}: ${name ? name : id}`
  }

  /* ---------------------------------------- */
  /*  Context Preparation                     */
  /* ---------------------------------------- */

  protected override async _prepareContext(options: RenderOptions): Promise<RenderContext> {
    const superContext = await super._prepareContext(options)

    return foundry.utils.mergeObject(superContext, {
      fields: PseudoDocument.getSchemaFields(this.pseudoDocument!),
    }) as unknown as RenderContext
  }

  /* ---------------------------------------- */

  protected override _initializeApplicationOptions({
    document,
    ...options
  }: DeepPartial<PseudoDocumentSheet.Configuration<Doc>>): PseudoDocumentSheet.Configuration<Doc> {
    options = super._initializeApplicationOptions(options)
    options.uniqueId = `${this.constructor.name}-${document?.uuid?.replaceAll('.', '-')}`

    return options as PseudoDocumentSheet.Configuration<Doc>
  }

  /* -------------------------------------------------- */

  override async _onFirstRender(
    context: DeepPartial<Application.RenderContext>,
    options: DeepPartial<Application.RenderOptions>
  ) {
    await super._onFirstRender(context, options)
    this.document.apps[this.id] = this
  }

  /* -------------------------------------------------- */

  override _onClose(options: DeepPartial<Application.RenderOptions>): void {
    super._onClose(options)
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
      .map(([key, value]) => `${key}="${value}"`)
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
  static async #onSubmitForm(
    this: PseudoDocumentSheet,
    _event: Event | SubmitEvent,
    _form: HTMLElement,
    formData: FormDataExtended
  ): Promise<void> {
    const submitData = foundry.utils.expandObject(formData.object)

    await this.pseudoDocument!.update(submitData as AnyObject)
    await this.render()
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
