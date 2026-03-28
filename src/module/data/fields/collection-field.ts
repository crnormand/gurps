import { fields } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

import { PseudoDocument } from '../../pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '../../pseudo-document/typed-pseudo-document.js'
import { ModelCollection } from '../model-collection.js'

class LazyTypedSchemaField<
  const Types extends fields.TypedSchemaField.Types,
  const Options extends fields.TypedSchemaField.Options<Types> = fields.TypedSchemaField.DefaultOptions,
  const AssignmentType = fields.TypedSchemaField.AssignmentType<Types, Options>,
  const InitializedType = fields.TypedSchemaField.InitializedType<Types, Options>,
  const PersistedType = fields.TypedSchemaField.PersistedType<Types, Options>,
> extends fields.TypedSchemaField<Types, Options, AssignmentType, InitializedType, PersistedType> {
  protected override _validateSpecial(value: AssignmentType): boolean | void {
    if (!value || (value as any).type in this.types) return super._validateSpecial(value)

    return true
  }
}

/* ---------------------------------------- */

namespace CollectionField {
  export type Model = PseudoDocument.ConcreteConstructor | TypedPseudoDocument.ConcreteConstructor

  /* ---------------------------------------- */

  export type Types<M extends TypedPseudoDocument.AnyConstructor> = [TypedPseudoDocument.DocumentNameOf<M>] extends [
    infer DocumentName extends gurps.Pseudo.WithTypes,
  ]
    ? {
        [K in keyof PseudoDocumentConfig.Types[DocumentName]]: PseudoDocumentConfig.Types[DocumentName][K] extends gurps.Pseudo.ConfigEntry<
          infer Doc
        >
          ? fields.EmbeddedDataField<Doc>
          : never
      }
    : fields.TypedSchemaField.Types

  /* ---------------------------------------- */

  export type Options<BaseAssignmentType> = fields.TypedObjectField.Options<BaseAssignmentType>

  export type DefaultOptions = fields.TypedObjectField.DefaultOptions

  /* ---------------------------------------- */

  export type Element<M extends Model> = M extends TypedPseudoDocument.AnyConstructor
    ? LazyTypedSchemaField<Types<M>>
    : fields.EmbeddedDataField<M>

  /* ---------------------------------------- */

  export type AssignmentType<
    M extends Model,
    Options extends CollectionField.Options<AnyObject>,
  > = fields.TypedObjectField.AssignmentType<Element<M>, Options>

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
  const Model extends CollectionField.Model,
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
  }

  /* ---------------------------------------- */

  override initialize(
    value: PersistedType,
    model: PseudoDocument.Any,
    options?: fields.DataField.InitializeOptions
  ): InitializedType | (() => InitializedType | null) {
    const init = super.initialize(value, model, options)
    const collection = new ModelCollection()

    // @ts-expect-error: types haven't quite caught up
    for (const [id, model] of Object.entries(init)) {
      if (model instanceof PseudoDocument) {
        collection.set(id, model)
      } else {
        // @ts-expect-error: types haven't quite caught up
        collection.setInvalid(model)
      }
    }

    return collection as InitializedType
  }
}

export { CollectionField }
