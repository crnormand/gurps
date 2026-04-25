import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '@module/pseudo-document/typed-pseudo-document.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { ModelCollection } from '../model-collection.js'

class LazyTypedSchemaField<
  const Types extends fields.TypedSchemaField.Types,
  const Options extends fields.TypedSchemaField.Options<Types> = fields.TypedSchemaField.DefaultOptions,
  const AssignmentType = fields.TypedSchemaField.AssignmentType<Types, Options>,
  const InitializedType = fields.TypedSchemaField.InitializedType<Types, Options>,
  const PersistedType = fields.TypedSchemaField.PersistedType<Types, Options>,
> extends fields.TypedSchemaField<Types, Options, AssignmentType, InitializedType, PersistedType> {
  protected override _validateSpecial(value: AssignmentType): boolean | void {
    // @ts-expect-error: Treating value as any here
    const invalidType = typeof value.type === 'string' && !(value.type in this.types)

    if (invalidType) return true

    return super._validateSpecial(value)
  }
}

/* ---------------------------------------- */

namespace CollectionField {
  export type Model = PseudoDocument.ConcreteConstructor | TypedPseudoDocument.ConcreteConstructor

  /* ---------------------------------------- */

  export type Types = fields.TypedSchemaField.Types

  /* ---------------------------------------- */

  export type Options<BaseAssignmentType> = fields.TypedObjectField.Options<BaseAssignmentType>

  export type DefaultOptions = fields.TypedObjectField.DefaultOptions

  /* ---------------------------------------- */

  export type Element<M extends Model> = M extends TypedPseudoDocument.ConcreteConstructor
    ? LazyTypedSchemaField<Types>
    : fields.EmbeddedDataField<M>

  /* ---------------------------------------- */

  export type AssignmentType<
    M extends Model,
    Options extends CollectionField.Options<AnyObject>,
    // NOTE: For TypedPseudoDocument-backed collections, the concrete per-type schemas are resolved
    // dynamically at runtime via GURPS.CONFIG.PseudoDocument.SubTypes, so the static type cannot
    // enumerate individual schema shapes. `LazyTypedSchemaField<Types>` (the Element for these
    // models) ends up with AssignmentType `never` because `ConcreteKeys` of a pure index-signature
    // type is `never`. We therefore fall back to `Record<string, AnyObject>` for this branch.
  > = M extends TypedPseudoDocument.AnyConstructor
    ? fields.DataField.DerivedAssignmentType<{ [K in fields.TypedObjectField.ValidKey<Options>]: AnyObject }, Options>
    : fields.TypedObjectField.AssignmentType<Element<M>, Options>

  /* ---------------------------------------- */

  export type InitializedType<
    M extends Model,
    Options extends CollectionField.Options<AnyObject>,
  > = fields.DataField.DerivedInitializedType<ModelCollection<InstanceType<M>>, Options>

  /* ---------------------------------------- */

  export type PersistedType<
    Element extends fields.DataField.Any,
    Options extends CollectionField.Options<AnyObject>,
  > = fields.DataField.DerivedInitializedType<Element[], Options>
}

class CollectionField<
  const Model extends CollectionField.Model = typeof PseudoDocument,
  const Element extends CollectionField.Element<Model> = CollectionField.Element<Model>,
  const Options extends CollectionField.Options<AnyObject> = CollectionField.DefaultOptions,
  const AssignmentType = CollectionField.AssignmentType<Model, Options>,
  const InitializedType = CollectionField.InitializedType<Model, Options>,
  const PersistedType = CollectionField.PersistedType<Element, Options>,
  // @ts-expect-error: PersistedType is an array which doesn't satisfy the base class constraint
> extends fields.TypedObjectField<Element, Options, AssignmentType, InitializedType, PersistedType> {
  /* ---------------------------------------- */

  constructor(model: Model, options?: Options, context?: fields.DataField.ConstructionContext) {
    const field = foundry.utils.isSubclass(model, TypedPseudoDocument)
      ? (new LazyTypedSchemaField(model.TYPES) as unknown as Element)
      : (new fields.EmbeddedDataField(model) as unknown as Element)

    super(field, options, context)
    this.#documentClass = model
  }

  /* ---------------------------------------- */

  static override hierarchical = true

  /* ---------------------------------------- */

  /**
   * The Collection implementation to use when initializing the collection.
   */
  static get implementation(): typeof ModelCollection {
    return ModelCollection
  }

  /* ---------------------------------------- */

  /**
   * The pseudo-document class.
   */
  #documentClass: Model

  /* -------------------------------------------------- */

  /**
   * The pseudo-document class.
   */
  get documentClass(): Model {
    return this.#documentClass
  }

  /* ---------------------------------------- */

  override initialize(
    _value: PersistedType,
    model: PseudoDocument.Any,
    options?: fields.DataField.InitializeOptions
  ): InitializedType | (() => InitializedType | null) {
    const name = this.documentClass.metadata.documentName

    const collection = model.parent.pseudoCollections[name]

    if (!collection) {
      console.warn(`GURPS | No collection found for document type "${name}". Source parent: :`, model.parent)

      return null as InitializedType
    }

    collection.initialize(model, options)

    return collection as InitializedType
  }

  /* ---------------------------------------- */

  override toObject(value: InitializedType): PersistedType {
    if (!value) return value as unknown as PersistedType

    // @ts-expect-error: Not properly typed in this method
    return (value as Array<Element>).map(val => this.element.toObject(val)) as PersistedType
  }

  /* ---------------------------------------- */

  override _updateCommit(
    source: AnyMutableObject,
    key: string,
    value: AnyMutableObject,
    diff: AnyMutableObject,
    options?: DataModel.UpdateOptions
  ): void {
    const src = source[key] as AnyMutableObject | undefined

    // Special Cases: * -> undefined, * -> null, undefined -> *, null -> *
    if (!src || !value) {
      source[key] = value

      return
    }

    // Reconstruct the source array, retaining object references
    // eslint-disable-next-line prefer-const
    for (let [id, doc] of Object.entries(diff)) {
      if (foundry.utils.isDeletionKey(id)) {
        if (id.startsWith('-')) {
          // @ts-expect-error: this is difficult to type
          delete source[key][id.slice(2)]
          continue
        }

        id = id.slice(2)
        // @ts-expect-error: fvtt-types not yet updated
      } else if (doc instanceof foundry.data.operators.ForcedDeletion) {
        // @ts-expect-error: this is difficult to type
        delete source[key][id]
        continue
      }

      const prior = src[id]

      if (prior) {
        this.element._updateCommit(src, id, value[id], doc, options)
        src[id] = prior
      } else src[id] = doc
    }
  }
}

export { CollectionField }
