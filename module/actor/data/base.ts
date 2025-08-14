import TypeDataModel = foundry.abstract.TypeDataModel
import fields = foundry.data.fields

type ActorMetadata = Readonly<{
  /** The expected `type` value */
  type: string
  /** Actor types that this item cannot be placed on */
  invalidActorTypes: string[]
  /** Are there any partials to fill in the Details tab of the item? */
  detailsPartial?: string[]
  /* Record of document names of pseudo-documents and the path to the collection. */
  embedded: Record<string, string>
}>

/* ---------------------------------------- */

class BaseActorModel<Schema extends fields.DataSchema = fields.DataSchema> extends TypeDataModel<
  Schema,
  Actor.Implementation
> {
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
      invalidActorTypes: [],
    }
  }

  /* ---------------------------------------- */

  get metadata(): ActorMetadata {
    return (this.constructor as typeof BaseActorModel).metadata
  }
}

/* ---------------------------------------- */

export { BaseActorModel }
