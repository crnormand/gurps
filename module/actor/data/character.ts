import { attributeSchema, poolSchema } from './character-components.js'
import DataModel = foundry.abstract.DataModel
import fields = foundry.data.fields

/* ---------------------------------------- */

// Minimal schema to unblock typing and allow progressive enhancement.
const characterSchema = () => {
  return {
    // Default attributes
    attributes: new fields.SchemaField(
      {
        ST: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        DX: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        IQ: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        HT: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        WILL: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        PER: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
        QN: new fields.SchemaField(attributeSchema(), { required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    // TODO In some future update, consider moving all of these to the attributes structure.
    // ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎ ⬇︎
    basicmove: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

    basicspeed: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

    // Built-in pools
    HP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    FP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),
    QP: new fields.SchemaField(poolSchema(), { required: true, nullable: false }),

    frightcheck: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.frightcheck' }),
    hearing: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.hearing' }),
    tastesmell: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.tastesmell' }),
    vision: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.vision' }),
    touch: new fields.NumberField({ required: true, nullable: false, initial: 0, label: 'GURPS.touch' }),
    // ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎

    // NOTE: may want to revise this in the future to a custom DiceField or the like
    thrust: new fields.StringField({ required: true, nullable: false, label: 'GURPS.thrust' }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    swing: new fields.StringField({ required: true, nullable: false, label: 'GURPS.swing' }),

    // Other attributes which don't count as core in this version of the system
    dodge: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),
  }
}

type CharacterSchema = ReturnType<typeof characterSchema>

/* ---------------------------------------- */

class CharacterModel<Parent extends DataModel.Any | null = DataModel.Any | null> extends DataModel<
  CharacterSchema,
  Parent
> {
  static override defineSchema(): CharacterSchema {
    return characterSchema()
  }
}

/* ---------------------------------------- */

export { CharacterModel, characterSchema }
export type { CharacterSchema }
