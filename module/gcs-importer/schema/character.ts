import { GcsElement } from './base.js'
import fields = foundry.data.fields
import { GcsAttribute } from './attribute.js'

class GcsCharacter extends GcsElement<GcsCharacterModel> {
  static override defineSchema(): GcsCharacterModel {
    return characterData()
  }
}

const characterData = () => {
  return {
    profile: new fields.SchemaField({
      name: new fields.StringField({ required: true, nullable: false }),
      portrait: new fields.StringField({ required: true, nullable: true }),
    }),
    attributes: new fields.ArrayField(new fields.EmbeddedDataField(GcsAttribute, { required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    calc: new fields.SchemaField({
      swing: new fields.StringField({ required: true, nullable: false }),
      thrust: new fields.StringField({ required: true, nullable: false }),
      dodge: new fields.ArrayField(new fields.NumberField({ required: true, nullable: false }), {
        required: true,
        nullable: false,
        length: 5,
      }),
    }),
  }
}

type GcsCharacterModel = ReturnType<typeof characterData>

export { GcsCharacter }
