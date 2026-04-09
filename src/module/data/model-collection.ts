import { DataModel } from '@gurps-types/foundry/index.js'
import { BaseAction } from '@module/action/base-action.js'
import { HitLocationEntryV2 } from '@module/actor/data/hit-location-entry.js'
import { MoveModeV2 } from '@module/actor/data/move-mode.js'
import { NoteV2 } from '@module/actor/data/note.js'
import { BaseFeature } from '@module/features/base-feature.js'
import { ConditionalModifier, ReactionModifier } from '@module/item/data/conditional-modifier.js'
import { BasePrereq } from '@module/prereqs/base-prereq.js'
import { TypedPseudoDocument } from '@module/pseudo-document/typed-pseudo-document.js'
import { TrackerInstance } from '@module/resource-tracker/resource-tracker.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { type PseudoDocument } from '../pseudo-document/pseudo-document.js'

class ModelCollection<Model extends PseudoDocument.Any = PseudoDocument.Any> extends foundry.utils.Collection<Model> {
  declare parent: DataModel.Any
  protected _initialized = false

  /* ---------------------------------------- */

  constructor(documentName: gurps.Pseudo.Name, document: gurps.Pseudo.ParentDocument, data: AnyObject) {
    super()
    // @ts-expect-error: The types here are very difficult to express, and the properties are only used internally, so
    // we can ignore the type errors.
    const name = CONFIG[document.documentName].dataModels[document._source.type].metadata.embedded[documentName]

    Object.defineProperties(this, {
      name: { value: name, writable: false },
      _source: { value: data, writable: false },
      documentClass: { value: ModelCollection.documentClasses[documentName], writable: false },
    })
  }

  /* ---------------------------------------- */
  /*  Properties                              */
  /* ---------------------------------------- */

  /**
   * Pseudo-document base model.
   */
  declare documentClass: typeof PseudoDocument | typeof TypedPseudoDocument

  /* ---------------------------------------- */

  /**
   * The base classes of the pseudo-documents that can be stored in a model such as this.
   * Each class must implement `documentConfig` to map to the subtype.
   */
  static documentClasses: Record<string, PseudoDocument.ConcreteConstructor> = {
    Action: BaseAction,
    Prereq: BasePrereq,
    Feature: BaseFeature,
    HitLocation: HitLocationEntryV2,
    ResourceTracker: TrackerInstance,
    MoveMode: MoveModeV2,
    Note: NoteV2,
    ConditionalModifier: ConditionalModifier,
    ReactionModifier: ReactionModifier,
  }

  /**
   * A cache of this collection's contents grouped by subtype.
   */
  #documentsByType: Record<string, Model[]> | null = null

  /* ---------------------------------------- */

  /**
   * The data models that originate from this parent document.
   */
  get sourceContents(): Model[] {
    return this.filter(model => model.isSource)
  }

  /* ---------------------------------------- */

  /**
   * The set of invalid document ids.
   */
  invalidDocumentIds: Set<string> = new Set()

  /* -------------------------------------------------- */

  /**
   * Underlying source data of each embedded pseudo-document. The
   * collection is responsible for performing mutations to this data.
   */
  declare _source: Record<string, object>

  /* -------------------------------------------------- */
  /*  Instance Methods                                  */
  /* -------------------------------------------------- */

  get documentConfig(): Readonly<Record<string, typeof TypedPseudoDocument>> {
    return foundry.utils.isSubclass(this.documentClass, TypedPseudoDocument)
      ? (this.documentClass.documentConfig as unknown as Record<string, typeof TypedPseudoDocument>)
      : {}
  }

  /**
   * The subtypes sorted by type.
   */
  get documentsByType(): Record<string, Model[]> {
    if (this.#documentsByType) return this.#documentsByType

    const types: Record<string, Model[]> = Object.fromEntries(
      Object.keys(this.documentConfig ?? {}).map(type => [type, []])
    )

    for (const doc of this.values() as unknown as Model[])
      types[(doc as unknown as TypedPseudoDocument)._source.type ?? 'base']?.push(doc)

    return (this.#documentsByType = types)
  }

  /* ---------------------------------------- */

  /**
   * A sorted array of the model instances.
   */
  get sortedContents(): Model[] {
    return this.contents.sort((left, right) => left.sort - right.sort)
  }

  /* ---------------------------------------- */

  override set(key: string, value: Model, { modifySource = true } = {}) {
    // Perform the modifications to the source when adding a new entry.
    if (modifySource) this._source[key] = value._source
    if (super.get(key) !== value) this.#documentsByType = null

    return super.set(key, value)
  }

  /* -------------------------------------------------- */

  override delete(key: string, { modifySource = true } = {}) {
    // Handle modifications to the source data when deleting an entry.
    if (modifySource) delete this._source[key]
    const result = super.delete(key)

    if (result) this.#documentsByType = null

    return result
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve an invalid document.
   * @param id   The id of the invalid pseudo-document.
   * @param [options={}]
   * @param [options.strict=true]   Throw an error if the id does not exist.
   * @throws If the id does not exist.
   */
  getInvalid(id: string, { strict = true }: { strict?: boolean } = {}): Model | void {
    if (!this.invalidDocumentIds.has(id) && strict) {
      throw new Error(`The '${id}' does not exist in the invalid collection.`)
    }

    if (!this.invalidDocumentIds.has(id)) return

    const data = this._source[id] as AnyObject
    const Cls = this.documentConfig[data.type as string] ?? this.documentClass

    return (Cls as typeof PseudoDocument).fromSource(foundry.utils.deepClone(data) as never, {
      parent: this.parent,
    }) as Model
  }

  /* -------------------------------------------------- */

  /**
   * Test the given predicate against every entry in the Collection.
   * @param  predicate   The predicate.
   */
  every(predicate: (arg0: any, arg1: number, arg2: ModelCollection<Model>) => boolean): boolean {
    return this.reduce((pass, value, index) => pass && predicate(value, index, this), true)
  }

  /* -------------------------------------------------- */

  /**
   * Convert the ModelCollection to an array of simple objects.
   * @returns The extracted array of primitive objects.
   */
  toObject(): object[] {
    return this.map(doc => doc.toObject(true))
  }

  /* -------------------------------------------------- */

  /**
   * Initialize the model collection. Existing entries are retained, but new source data is used.
   * @param  model    The parent data model that holds this collection.
   * @param  [options={}]
   */
  initialize(model: DataModel.Any, options = {}) {
    this.parent = model
    this._initialized = false
    this.#documentsByType = null

    const initIds = new Set()

    for (const obj of Object.values(this._source)) {
      const doc = this.#initializeDocument(obj as AnyMutableObject, options)

      if (doc) initIds.add(doc.id)
    }

    if (this.size !== initIds.size) {
      for (const key of this.keys()) if (!initIds.has(key)) this.delete(key, { modifySource: false })
    }

    this._initialized = true
  }

  /* -------------------------------------------------- */

  /**
   * Initialize a pseudo-document and store it in this collection.
   * If it exists, reinitialize with new data, otherwise create a new instance.
   * @param {object} data   Source data.
   * @param {object} [options]
   * @returns {Model|null}
   */
  #initializeDocument(data: AnyMutableObject, options: AnyMutableObject): Model | null {
    let doc = this.get(data._id as string)

    if (doc) {
      // The document exists, reinitialize with new source data.
      // @ts-expect-error: we know the source is mutable, but the type doesn't reflect that
      doc._initialize(options)

      return doc
    }

    if (!data._id) {
      data._id = foundry.utils.randomID()
      console.warn(`PseudoDocument was constructed without an _id. Replaced with id '${data._id}'.`)
    }

    try {
      // Create a new instance.
      doc = this.#createDocument(data, options)
      super.set(doc.id, doc)
    } catch (err) {
      console.error(`Failed to initialize document with id '${data._id}':`, err)

      this.#handleInvalidDocument(data._id as string, err as foundry.data.validation.DataModelValidationError, options)

      return null
    }

    return doc
  }

  /* -------------------------------------------------- */

  /**
   * Create a new instance of the pseudo-document.
   * @param data   Pseudo-document data.
   * @param [context={}]
   */
  #createDocument(data: AnyMutableObject, context: AnyMutableObject = {}): Model {
    let Cls = this.documentClass

    if (foundry.utils.isSubclass(this.documentClass, TypedPseudoDocument)) {
      Cls = (this.documentClass as typeof TypedPseudoDocument).TYPES?.[data.type as string]

      if (!Cls)
        throw new Error(`Type '${data.type}' is not a valid subtype for a ${this.documentClass.metadata.documentName}.`)
    }

    return new (Cls as typeof PseudoDocument)(data as any, { ...context, parent: this.parent }) as unknown as Model
  }

  /* -------------------------------------------------- */

  /**
   * Emulate the core handling of invalid documents by throwing warnings, storing the id in the `invalidDocumentIds` set.
   * @param id   The id of the model.
   * @param err    The error message.
   * @param [options={}]
   * @param [options.strict=true]   Throw an error.
   */
  #handleInvalidDocument(
    id: string,
    err: foundry.data.validation.DataModelValidationError,
    { strict = true }: { strict?: boolean } = {}
  ) {
    const documentName = this.documentClass.metadata.documentName
    // may need to adjust if we ever double nest pseudo documents
    const parentDocument = this.parent.parent

    this.invalidDocumentIds.add(id)

    // Wrap the error with more information
    const uuid = foundry.utils.buildUuid({ id, documentName: documentName as any, parent: parentDocument })
    const msg = `Failed to initialize ${documentName} [${uuid}]:\n${err.message}`
    const error = new Error(msg, { cause: err })

    if (strict) console.error(error)
    else console.warn(error)

    if (strict) {
      Hooks?.onError(`${this.constructor.name}#_initializeDocument`, error, { id, documentName })
    }
  }
}

export { ModelCollection }
