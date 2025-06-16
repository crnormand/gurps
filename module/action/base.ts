import DataModel = foundry.abstract.DataModel
import fields = foundry.data.fields

type ActionMetadata<Type extends string = 'base'> = {
  type: Type
}

/* ---------------------------------------- */

class BaseAction<Schema extends BaseActionSchema = BaseActionSchema> extends DataModel<Schema> {
  static metadata: ActionMetadata = {
    type: 'base',
  }

  /* ---------------------------------------- */

  get metadata(): ActionMetadata {
    return (this.constructor as typeof BaseAction).metadata
  }

  /* ---------------------------------------- */

  static override defineSchema() {
    return {
      ...baseActionSchema(),
      type: new fields.StringField({
        required: true,
        nullable: false,
        blank: false,
        readOnly: true,
        initial: () => this.metadata.type,
      }),
    }
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  prepareBaseData(): void {}

  /* ---------------------------------------- */

  prepareDerivedData(): void {}
}

/* ---------------------------------------- */

const baseActionSchema = () => {
  return {
    _id: new fields.DocumentIdField({ initial: () => foundry.utils.randomID() }),
    type: new fields.StringField({
      required: true,
      nullable: false,
      blank: false,
      readOnly: true,
      // NOTE: This is overridden in the BaseAction class
      initial: () => 'base',
    }),
    name: new fields.StringField({ initial: undefined }),
    img: new fields.FilePathField({ initial: undefined, categories: ['IMAGE'], base64: false }),
    sort: new fields.IntegerSortField(),
  }
}

type BaseActionSchema = ReturnType<typeof baseActionSchema>

/* ---------------------------------------- */

export { BaseAction, type ActionMetadata, type BaseActionSchema }
