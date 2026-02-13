import { fields, TypeDataModel } from '@gurps-types/foundry/index.js'

type ActorMetadata = Readonly<{
  /** The expected `type` value */
  type: string
  /** Are there any partials to fill in the Details tab of the actor? */
  detailsPartial?: string[]
  /* Record of document names of pseudo-documents and the path to the collection. */
  embedded: Record<string, string>
}>

/* ---------------------------------------- */

class BaseActorModel<Schema extends fields.DataSchema = fields.DataSchema> extends TypeDataModel<
  Schema,
  Actor.Implementation
> {
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

export { BaseActorModel, type ActorMetadata }
