import { GcsElement } from './base.js'
import fields = foundry.data.fields
import { GcsAttribute } from './attribute.js'
import { GcsBody } from './body.js'

class GcsCharacter extends GcsElement<GcsCharacterModel> {
  static override defineSchema(): GcsCharacterModel {
    return characterData()
  }
}

const characterData = () => {
  return {
    created_date: new fields.StringField({ required: true, nullable: false }),
    modified_date: new fields.StringField({ required: true, nullable: false }),

    profile: new fields.SchemaField({
      name: new fields.StringField({ required: true, nullable: false }),
      portrait: new fields.StringField({ required: true, nullable: true }),
      title: new fields.StringField({ required: true, nullable: true }),
      age: new fields.StringField({ required: true, nullable: true }),
      birthday: new fields.StringField({ required: true, nullable: true }),
      eyes: new fields.StringField({ required: true, nullable: true }),
      hair: new fields.StringField({ required: true, nullable: true }),
      skin: new fields.StringField({ required: true, nullable: true }),
      handedness: new fields.StringField({ required: true, nullable: true }),
      gender: new fields.StringField({ required: true, nullable: true }),
      height: new fields.StringField({ required: true, nullable: true }),
      weight: new fields.StringField({ required: true, nullable: true }),
      player_name: new fields.StringField({ required: true, nullable: true }),
      organization: new fields.StringField({ required: true, nullable: true }),
      religion: new fields.StringField({ required: true, nullable: true }),
      tech_level: new fields.StringField({ required: true, nullable: true }),
      SM: new fields.NumberField({ required: true, nullable: true }),
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

    settings: new fields.SchemaField({
      body_type: new fields.EmbeddedDataField(GcsBody, { required: true, nullable: false }),
    }),
  }
}

type GcsCharacterModel = ReturnType<typeof characterData>

export { GcsCharacter }
