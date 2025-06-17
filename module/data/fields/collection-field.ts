import { AnyObject, SimpleMerge } from 'fvtt-types/utils'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

namespace CollectionField {
  type ValidDataSchema = {
    readonly [field: string]: fields.DataField.Any
  }

  type Type =
    | ValidDataSchema
    | fields.SchemaField<fields.DataSchema, { required: true; nullable: false }, any, any, any>
    | DataModel.ConcreteConstructor

  export type Types = {
    [type: string]: Type
  }

  /* ---------------------------------------- */

  export type Options<BaseAssignmentType> = fields.TypedObjectField.Options<BaseAssignmentType>

  export type DefaultOptions = fields.TypedObjectField.DefaultOptions

  /* ---------------------------------------- */

  export type AssignmentType<
    Element extends fields.DataField.Any,
    Options extends CollectionField.Options<AnyObject>,
  > = fields.TypedObjectField.AssignmentType<Element, Options>

  /* ---------------------------------------- */

  export type InitializedType<
    Element extends fields.DataField.Any,
    Options extends CollectionField.Options<AnyObject>,
  > = fields.TypedObjectField.InitializedType<Element, Options>

  /* ---------------------------------------- */
}

class CollectionField<
  const Types extends CollectionField.Types,
  const Element extends fields.TypedSchemaField<Types>,
  const Options extends CollectionField.Options<AnyObject> = CollectionField.DefaultOptions,
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const AssignmentType = CollectionField.AssignmentType<Element, Options>,
  const InitializedType = CollectionField.InitializedType<Element, Options>,
  const PersistedType extends AnyObject | null | undefined = CollectionField.InitializedType<Element, Options>,
> extends fields.TypedObjectField<Element, Options, AssignmentType, InitializedType, PersistedType> {}

// class CollectionField<
//   const Types extends CollectionField.Types,
//   const Options extends fields.TypedObjectField.Options<AnyObject> = fields.TypedObjectField.DefaultOptions,
//   // eslint-disable-next-line @typescript-eslint/no-deprecated
//   const AssignmentType = fields.TypedObjectField.AssignmentType<fields.TypedSchemaField<Types>, Options>,
//   const InitializedType = fields.TypedObjectField.InitializedType<fields.TypedSchemaField<Types>, Options>,
//   const PersistedType extends AnyObject | null | undefined = fields.TypedObjectField.InitializedType<
//     fields.TypedSchemaField<Types>,
//     Options
//   >,
// > extends fields.TypedObjectField<
//   fields.TypedSchemaField<Types>,
//   Options,
//   AssignmentType,
//   InitializedType,
//   PersistedType
// > {
//   constructor(types: Types, options?: Options, context?: fields.DataField.ConstructionContext) {
//     super(new fields.TypedSchemaField(types), options, context)
//     this.readonly = true
//   }
//
//   /* ---------------------------------------- */
//
//   override initialize(
//     value: PersistedType,
//     model: DataModel.Any,
//     options?: fields.DataField.InitializeOptions
//   ): InitializedType | (() => InitializedType | null) {
//     const elements = Object.values(super.initialize(value, model, options) as AnyObject)
//     if (!elements) return new Collection() as InitializedType
//
//     elements.sort((a: any, b: any) => {
//       if (
//         a.hasOwnProperty('sort') &&
//         b.hasOwnProperty('sort') &&
//         typeof a.sort === 'number' &&
//         typeof b.sort === 'number'
//       ) {
//         return a.sort - b.sort
//       }
//       return 0
//     })
//
//     return new Collection(
//       elements.map((e: any, index: number) => {
//         if (!e.hasOwnProperty('id')) return [`${index}`, e]
//         return [e.id, e]
//       })
//     ) as InitializedType
//   }
// }

/* ---------------------------------------- */

export { CollectionField }
