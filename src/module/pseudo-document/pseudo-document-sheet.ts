import { Application, DocumentSheet } from '@gurps-types/foundry/index.js'
import { AnyObject, DeepPartial } from 'fvtt-types/utils'

import { PseudoDocument } from './pseudo-document.js'

namespace PseudoDocumentSheet {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderOptions extends Application.RenderOptions {}

  export interface Configuration<Doc extends PseudoDocument.Any = PseudoDocument.Any>
    extends Application.Configuration {
    document: Doc
  }

  export interface RenderContext<Doc extends PseudoDocument.Any = PseudoDocument.Any>
    extends Application.RenderContext {
    document: Doc | null
    source: foundry.data.fields.SchemaField.SourceData<foundry.abstract.DataModel.SchemaOf<Doc>>
    fields?: Record<string, { field: foundry.data.fields.DataField.Any; value: any; name: string }>
    detailsPartial: string[]
    tab?: Application.Tab
  }

  export type DefaultOptions = DocumentSheet.DefaultOptions
}

/* ---------------------------------------- */

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

  static override DEFAULT_OPTIONS: PseudoDocumentSheet.DefaultOptions = {
    id: '{id}',
    actions: {
      editImage: PseudoDocumentSheet.#onEditImage,
      copyUuid: {
        handler: PseudoDocumentSheet.#onCopyUuid,
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

    if (!pseudoDocument.uuid) {
      console.warn('The pseudo-document does not have a UUID and cannot be displayed in a sheet!')

      return null
    }

    if (!PseudoDocumentSheet.#sheets.get(doc)?.get(pseudoDocument.uuid)) {
      const Cls = pseudoDocument.metadata.sheetClass

      if (!Cls) return null
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

    if (!this.pseudoDocument) {
      throw new Error('No pseudo-document found for this sheet!')
    }

    return foundry.utils.mergeObject(superContext, {
      document: this.pseudoDocument,
      source: this.pseudoDocument._source as any,
      fields: this.pseudoDocument.schema.fields,
      detailsPartial: this.pseudoDocument.metadata.detailsPartial,
    }) as unknown as RenderContext
  }

  /* ---------------------------------------- */

  protected override async _preparePartContext(
    partId: string,
    context: PseudoDocumentSheet.RenderContext,
    options: DeepPartial<PseudoDocumentSheet.RenderOptions>
  ): Promise<PseudoDocumentSheet.RenderContext> {
    await super._preparePartContext(partId, context, options)

    if (context.tabs && partId in context.tabs) context.tab = context.tabs[partId]

    return context
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

  /* ---------------------------------------- */

  override async _onFirstRender(
    context: DeepPartial<Application.RenderContext>,
    options: DeepPartial<Application.RenderOptions>
  ) {
    await super._onFirstRender(context, options)
    this.document.apps[this.id] = this
  }

  /* ---------------------------------------- */

  override _onClose(options: DeepPartial<Application.RenderOptions>): void {
    super._onClose(options)
    delete this.document.apps[this.id]
  }

  /* ---------------------------------------- */

  protected override async _renderFrame(options: DeepPartial<Application.RenderOptions>): Promise<HTMLElement> {
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

  /* ---------------------------------------- */

  override _canRender(_options: DeepPartial<Application.RenderOptions>): false | void {
    if (!this.pseudoDocument) {
      if (this.rendered) this.close()

      return false
    }
  }

  /* ---------------------------------------- */
  /*   Event handlers                         */
  /* ---------------------------------------- */

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

  static #onCopyUuid(this: PseudoDocumentSheet, event: PointerEvent) {
    event.preventDefault() // Don't open context menu
    event.stopPropagation() // Don't trigger other events
    if (event.detail > 1) return // Ignore repeated clicks
    const pseudo = this.pseudoDocument!
    const id = event.button === 2 ? pseudo.id : pseudo.uuid
    const type = event.button === 2 ? 'id' : 'uuid'
    const label = game.i18n?.localize(`DOCUMENT.${pseudo.documentName}`) ?? ''

    if (!id) {
      ui.notifications?.warn('DOCUMENT.IdCopiedClipboard', { format: { label, type, id: '' } })

      return
    }

    game.clipboard?.copyPlainText(id)
    ui.notifications?.info('DOCUMENT.IdCopiedClipboard', { format: { label, type, id } })
  }

  /* ---------------------------------------- */

  static async #onEditImage(this: PseudoDocumentSheet, _event: PointerEvent, target: HTMLImageElement) {
    if (target.nodeName !== 'IMG') {
      throw new Error('The editImage action is available only for IMG elements.')
    }

    if (!this.pseudoDocument) {
      console.warn('No pseudo-document found for this sheet!')

      return
    }

    const attr = target.dataset.edit ?? ''

    const current = foundry.utils.getProperty(this.pseudoDocument._source, attr)

    if (typeof current !== 'string') {
      console.error(
        `The editImage action is only available for string properties, but the current value of '${attr}' is not a string!`
      )

      return
    }

    const defaultArtwork =
      (this.pseudoDocument.constructor as typeof PseudoDocument).getDefaultArtwork?.(this.pseudoDocument._source) ?? {}

    const defaultImage = foundry.utils.getProperty(defaultArtwork, attr)

    if (typeof defaultImage !== 'string') {
      console.error(
        'The default artwork for this pseudo-document does not have a string property at the specified path!'
      )

      return
    }

    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: 'image',
      redirectToRoot: defaultImage ? [defaultImage] : [],
      callback: path => {
        target.src = path

        if (this.options.form?.submitOnChange) {
          const submit = new Event('submit', { cancelable: true })

          this.form?.dispatchEvent(submit)
        }
      },
      position: {
        top: this.position.top + 40,
        left: this.position.left + 10,
      },
    })

    await fp.browse()
  }
}
/* -------------------------------------------------- */

export { PseudoDocumentSheet }
