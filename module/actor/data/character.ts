import { attributeSchema, conditionsSchema, poolSchema } from './character-components.js'
import { BaseActorModel } from './base.js'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel
import { HitLocationEntryV1, HitLocationEntryV2, HitLocationSchemaV1 } from './hit-location-entry.js'
import { recurselist, zeroFill } from '../../../lib/utilities.js'

class CharacterModel extends BaseActorModel<CharacterSchema> {
  static override defineSchema(): CharacterSchema {
    return characterSchema()
  }

  /* ---------------------------------------- */

  override prepareBaseData() {
    super.prepareBaseData()

    this.#prepareHitLocations()
    this.#resetConditionsObject()
  }

  #resetConditionsObject() {
    // TODO: verify whether this should be fully reset
    this.conditions = {
      ...this.conditions,
      posture: 'standing',
      maneuver: null,
      self: { modifiers: [] },
      target: { modifiers: [] },
      usermods: [],
      reeling: false,
      exhausted: false,
    }
  }

  #prepareHitLocations(): void {
    this.hitlocationsV2.forEach((l: any, index: number) => {
      const hlv1 = new HitLocationEntryV1({
        _damageType: l._damageType,
        dr: l._dr === 0 ? null : l._dr.toString(),
        drCap: l.drCap === 0 ? null : l.drCap.toString(),
        drItem: l.drItem,
        drMod: l.drMod === 0 ? null : l.drMod.toString(),
        equipment: '',
        import: l.import.toString(),
        penalty: l.penalty.toString(),
        roll: l.rollText,
        where: l.where,
        split: l.split,
      })

      // @ts-expect-error:
      ;(this.hitlocations as DataModel.CreateData<HitLocationSchemaV1>)[`${zeroFill(index, 5)}`] = hlv1
    })
  }

  override prepareDerivedData() {
    super.prepareDerivedData()

    recurselist(this.hitlocations, (e, _k, _d) => {
      if (!e.dr) e.dr = e.import
    })
  }
}

/* ---------------------------------------- */

const characterSchema = () => {
  return {
    // Default attributes.
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

    // NOTE: may want to revise this in the future to a custom DiceField or the like
    thrust: new fields.StringField({ required: true, nullable: false, label: 'GURPS.thrust' }),
    // NOTE: may want to revise this in the future to a custom DiceField or the like
    swing: new fields.StringField({ required: true, nullable: false, label: 'GURPS.swing' }),

    // Other attributes which don't count as core in this version of the system
    dodge: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),
    // ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎ ⬆︎

    traits: new fields.SchemaField(
      {
        title: new fields.StringField({ required: true, nullable: false }),
        race: new fields.StringField({ required: true, nullable: false }),
        height: new fields.StringField({ required: true, nullable: false }),
        weight: new fields.StringField({ required: true, nullable: false }),
        age: new fields.StringField({ required: true, nullable: false }),
        birthday: new fields.StringField({ required: true, nullable: false }),
        religion: new fields.StringField({ required: true, nullable: false }),
        gender: new fields.StringField({ required: true, nullable: false }),
        eyes: new fields.StringField({ required: true, nullable: false }),
        hair: new fields.StringField({ required: true, nullable: false }),
        hand: new fields.StringField({ required: true, nullable: false }),
        skin: new fields.StringField({ required: true, nullable: false }),
        // NOTE: change from previous data model, uses number instead of string type as value is always a number
        sizemod: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        techlevel: new fields.StringField({ required: true, nullable: false }),
        createdon: new fields.StringField({ required: true, nullable: false }),
        modifiedon: new fields.StringField({ required: true, nullable: false }),
        player: new fields.StringField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    hitlocationsV2: new fields.ArrayField(
      new fields.EmbeddedDataField(HitLocationEntryV2, { required: true, nullable: false }),
      { required: true, nullable: false }
    ),

    hitlocations: new fields.TypedObjectField(
      new fields.EmbeddedDataField(HitLocationEntryV1, { required: true, nullable: false }),
      { required: true, nullable: false, initial: {} }
    ),

    additionalresources: new fields.SchemaField(
      {
        // TODO This could be a trait instead.
        bodyplan: new fields.StringField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),

    conditions: new fields.SchemaField(conditionsSchema(), { required: true, nullable: false }),
  }
}
type CharacterSchema = ReturnType<typeof characterSchema>

/* ---------------------------------------- */

export { CharacterModel, type CharacterSchema }
