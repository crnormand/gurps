import { attributeSchema, EncumbranceSchema, LiftingMovingSchema, poolSchema } from './character-components.js'
import DataModel = foundry.abstract.DataModel
import TypeDataModel = foundry.abstract.TypeDataModel
import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'

class CharacterData extends TypeDataModel<CharacterSchema, Actor.Implementation> {
  static override defineSchema(): CharacterSchema {
    return characterSchema()
  }

  /* ---------------------------------------- */
  /*  Instance properties                     */
  /* ---------------------------------------- */

  // Item collections
  declare ads: ConfiguredItem<'feature'>[]
  declare skills: ConfiguredItem<'skill'>[]
  declare spells: ConfiguredItem<'spell'>[]
  // FIXME: There is no note item type. Not sure what to do with this yet
  // declare notes: ConfiguredItem<'feature'>[]
  declare equipment: {
    carried: ConfiguredItem<'equipment'>[]
    other: ConfiguredItem<'equipment'>[]
  }

  /* ---------------------------------------- */

  // Derived properties
  declare reactions: AnyObject[]
  declare conditionalmods: AnyObject[]
  declare encumbrance: DataModel.CreateData<EncumbranceSchema>
  declare liftingmoving: DataModel.CreateData<LiftingMovingSchema>

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  /**
   * Prepare data related to this DataModel itself, before any derived data is computed.
   */
  override prepareBaseData() {
    super.prepareBaseData()
  }
}

/* ---------------------------------------- */

const characterSchema = () => {
  return {
    // Default attributes
    attributes: new fields.SchemaField(
      {
        ST: new fields.SchemaField(attributeSchema, { required: true, nullable: false }),
        DX: new fields.SchemaField(attributeSchema, { required: true, nullable: false }),
        IQ: new fields.SchemaField(attributeSchema, { required: true, nullable: false }),
        HT: new fields.SchemaField(attributeSchema, { required: true, nullable: false }),
        WILL: new fields.SchemaField(attributeSchema, { required: true, nullable: false }),
        PER: new fields.SchemaField(attributeSchema, { required: true, nullable: false }),
        QN: new fields.SchemaField(attributeSchema, { required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    // In-build pools
    HP: new fields.SchemaField(poolSchema, { required: true, nullable: false }),
    FP: new fields.SchemaField(poolSchema, { required: true, nullable: false }),
    QP: new fields.SchemaField(poolSchema, { required: true, nullable: false }),

    // Other attributes which don't count as core in this version of the system
    dodge: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false }),
      enc_level: new fields.NumberField({ required: true, nullable: false }),
    }),
    basicmove: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false }),
      points: new fields.NumberField({ required: true, nullable: false }),
    }),
    basicspeed: new fields.SchemaField({
      // NOTE: change from previous data model, uses number instead of string type as value is always a number
      value: new fields.NumberField({ required: true, nullable: false }),
      points: new fields.NumberField({ required: true, nullable: false }),
    }),
    frightcheck: new fields.NumberField({ required: true, nullable: false }),
    hearing: new fields.NumberField({ required: true, nullable: false }),
    tastesmell: new fields.NumberField({ required: true, nullable: false }),
    vision: new fields.NumberField({ required: true, nullable: false }),
    touch: new fields.NumberField({ required: true, nullable: false }),
    // Generic parry used for mooks
    parry: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: may want to revise this to be an accessor or derived property
    currentmove: new fields.NumberField({ required: true, nullable: false }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    thrust: new fields.StringField({ required: true, nullable: false }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    swing: new fields.StringField({ required: true, nullable: false }),

    // NOTE: these properties no longer exists in the schema as their value is always derived.
    // They have been replaced with a class property which is updated during data preparation
    // encumbrance: new fields.TypedObjectField(
    //   new fields.SchemaField(encumbranceSchema, { required: true, nullable: false })
    // ),
    // lifitngmoving: new fields.SchemaField(liftingMovingSchema, { required: true, nullable: false }),

    // NOTE: conditions does not seem to ever be explicitly defined in the previous schema, only implicitly.
    // It is also a derived property and thus not defined in the schema.
    // conditions: new fields.ObjectField(),

    additionalresources: new fields.SchemaField(
      {
        bodyplan: new fields.StringField({ required: true, nullable: false }),
        // FIXME: this should be a SchemaField or EmbeddedDataField but trackers do not currently
        //extend DataModel
        tracker: new fields.TypedObjectField(new fields.ObjectField(), { required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    conditionalinjury: new fields.SchemaField(
      {
        RT: new fields.SchemaField(
          {
            value: new fields.NumberField({ required: true, nullable: false }),
            points: new fields.NumberField({ required: true, nullable: false }),
          },
          { required: true, nullable: false }
        ),
        injury: new fields.SchemaField(
          {
            severity: new fields.StringField({ required: true, nullable: false }),
            daystoheal: new fields.NumberField({ required: true, nullable: false }),
          },
          { required: true, nullable: false }
        ),
      },
      { required: true, nullable: false }
    ),

    // NOTE: the following have been replaced with Items or accessors in the new model, and thus should not be used.
    // They are commented out but this note is kept here for reference.
    // ads: new fields.ObjectField(),
    // languages: new fields.ObjectField(),
    // skills: new fields.ObjectField(),
    // spells: new fields.ObjectField(),
    // money: new fields.ObjectField(),
    // melee: new fields.ObjectField(),
    // ranged: new fields.ObjectField(),
    // reations: new fields.ObjectField(),
    // conditionalmods: new fields.ObjectField(),
    // notes: new fields.ObjectField(),
    // equipment: new fields.SchemaField({
    // 	carried: new fields.ObjectField(),
    // 	other: new fields.ObjectField(),
    // }, { required: true, nullable: false }),
  }
}

type CharacterSchema = ReturnType<typeof characterSchema>

/* ---------------------------------------- */

export { CharacterData, type CharacterSchema }
