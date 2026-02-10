import { fields, TypeDataModel } from '@gurps-types/foundry/index.js'
import { AnyObject, EmptyObject } from 'fvtt-types/utils'

type ActorMetadata = Readonly<{
  /** The expected `type` value */
  type: string
  /* Record of document names of pseudo-documents and the path to the collection. */
  embedded: Record<string, string>
}>

/* ---------------------------------------- */

class BaseActorModel<
  Schema extends fields.DataSchema = fields.DataSchema,
  BaseData extends AnyObject = EmptyObject,
  DerivedData extends AnyObject = EmptyObject,
> extends TypeDataModel<Schema, Actor.Implementation, BaseData, DerivedData> {
  /* ---------------------------------------- */

  isOfType<SubType extends Actor.SubType>(...types: SubType[]): this is Actor.SystemOfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.parent.type as Actor.SubType)
  }

  /* ---------------------------------------- */

  prepareEmbeddedDocuments(): void {}

  /* ---------------------------------------- */

  static get metadata(): ActorMetadata {
    return {
      embedded: {},
      type: 'base',
    }
  }

  /* ---------------------------------------- */

  get metadata(): ActorMetadata {
    return (this.constructor as typeof BaseActorModel).metadata
  }
}

/* ---------------------------------------- */

export { BaseActorModel }
export type { ActorMetadata }
