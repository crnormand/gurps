import {
  attributeSchema,
  conditionsSchema,
  EncumbranceSchema,
  LiftingMovingSchema,
  poolSchema,
} from './character-components.js'
import { BaseActorModel } from './base.js'
import fields = foundry.data.fields
import { HitLocationEntryV1, HitLocationEntryV2 } from './hit-location-entry.js'
import { zeroFill } from '../../../lib/utilities.js'
import * as Settings from '../../../lib/miscellaneous-settings.js'

class CharacterModel extends BaseActorModel<CharacterSchema> {
  static override defineSchema(): CharacterSchema {
    return characterSchema()
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES = super.LOCALIZATION_PREFIXES.concat('GURPS.Actor.Character')

  /* ---------------------------------------- */
  /*  Derived properties                     */
  /* ---------------------------------------- */
  encumbrance: fields.SchemaField.SourceData<EncumbranceSchema>[] = []
  liftingmoving: fields.SchemaField.SourceData<LiftingMovingSchema> = {
    basiclift: 0,
    onehandedlift: 0,
    twohandedlift: 0,
    shove: 0,
    runningshove: 0,
    shiftslightly: 0,
    carryonback: 0,
  }
  /* ---------------------------------------- */

  override prepareBaseData() {
    super.prepareBaseData()

    this.#resetConditionsObject()

    // Reset the calculated values of attributes
    Object.keys(this.attributes).forEach(key => {
      const attribute = this.attributes[key as keyof typeof this.attributes]
      this.attributes[key as keyof typeof this.attributes].value = attribute.import
    })
  }

  /* ---------------------------------------- */

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

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()

    this.#applyCharacterBonuses()
    this.#prepareLiftingMoving()
    this.#prepareEncumbrance()
  }

  /* ---------------------------------------- */

  #applyCharacterBonuses() {
    this.#applyBonusesToHitLocations()
  }

  /* ---------------------------------------- */

  #applyBonusesToHitLocations() {
    for (const location of this.hitlocationsV2) {
      location.drItem = this._drBonusesFromItems[location.where] ?? 0
      const newDR = location.import + location.drItem + location.drMod

      // NOTE: I'm unsure as to whether drCap should ever apply.
      // On the one hand, using the ! operator in the /dr command may imply
      // that the DR of the location should always be set to the new value.
      // On the other hand, this may not be the intended behavior.
      // This is where documentation regarding intent would be helpful.
      location._dr = location.drCap === null ? newDR : Math.max(location.drCap, newDR)
    }
  }

  /* ---------------------------------------- */

  protected get _drBonusesFromItems(): Record<string, number> {
    // TODO Go through the list of Items and find all DR bonuses
    return {}
  }

  /* ---------------------------------------- */

  #prepareLiftingMoving() {
    const basicLift = Math.round(0.2 * (this.attributes.ST.value * this.attributes.ST.value))

    this.liftingmoving = {
      basiclift: basicLift,
      onehandedlift: basicLift * 2,
      twohandedlift: basicLift * 8,
      shove: basicLift * 12,
      runningshove: basicLift * 24,
      carryonback: basicLift * 15,
      shiftslightly: basicLift * 50,
    }
  }

  /* ---------------------------------------- */

  #prepareEncumbrance() {
    const automaticEncumbrance = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE) ?? false

    let foundCurrent = false
    // let manualEncumbranceIndex = -1
    // const currentEncumbrance = this.encumbrance ?? []

    // if (!currentEncumbrance.length && !automaticEncumbrance) {
    //   manualEncumbranceIndex = currentEncumbrance.findIndex(enc => enc.current)
    //   if (manualEncumbranceIndex < 0) manualEncumbranceIndex = 0
    //   foundCurrent = true
    // }

    const basicLift = this.liftingmoving.basiclift
    const liftBrackets: number[] = [basicLift, basicLift * 2, basicLift * 3, basicLift * 6, basicLift * 10]
    const basicMove = this.basicmove.value
    const basicDodge = this.dodge.value

    const moveIsEnhanced = false // this.currentMoveMode?.enhanced !== null

    const carriedWeight = 0 // this.eqtsummary.eqtlbs ?? 0

    for (let i = 0; i < liftBrackets.length; i++) {
      let move = Math.floor(Math.max(1, basicMove * (1 - i * 0.2)))
      let dodge = Math.max(1, basicDodge - i)
      let sprint = Math.max(1, move * 1.2)

      if (this.conditions.reeling) {
        move = Math.ceil(move / 2)
        dodge = Math.ceil(dodge / 2)
        sprint = Math.ceil(sprint / 2)
      }

      if (this.conditions.exhausted) {
        move = Math.ceil(move / 2)
        dodge = Math.ceil(dodge / 2)
        sprint = Math.ceil(sprint / 2)
      }

      let current = false

      if (automaticEncumbrance) {
        if (!foundCurrent && carriedWeight <= liftBrackets[i]) {
          foundCurrent = true
          current = true
        }
      } else {
        if (i === this.additionalresources.currentEncumbrance) {
          foundCurrent = true
          current = true
        }
      }

      const currentmove = this.#getCurrentMove(move)

      this.encumbrance.push({
        key: `enc${i}`,
        level: i,
        weight: liftBrackets[i],
        move,
        dodge,
        current,
        currentmove,
        currentsprint: currentmove * 1.2,
        currentdodge: dodge,
        currentmovedisplay: moveIsEnhanced ? `${move}/${sprint}` : `${move}`,
      })
    }
  }

  #getCurrentMove(base: number): number {
    return base // TODO implement correct logic
  }

  /* ---------------------------------------- */
  /*   CRUD Handlers                          */
  /* ---------------------------------------- */

  override _onUpdate(changed: object, options: any, userId: string): void {
    super._onUpdate(changed, options, userId)
  }

  /* ---------------------------------------- */
  /*  Accessors                               */
  /* ---------------------------------------- */

  get hitlocationNames() {
    return this.hitlocationsV2.reduce((acc: Record<string, HitLocationEntryV2>, location) => {
      acc[location.where] = location
      return acc
    }, {})
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  get hitlocations() {
    const hitlocationsV1: Record<string, HitLocationEntryV1> = {}

    this.hitlocationsV2.forEach((locationV2: any, index: number) => {
      hitlocationsV1[`${zeroFill(index, 5)}`] = HitLocationEntryV1.createFromV2(locationV2)
    })
    return hitlocationsV1
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

    additionalresources: new fields.SchemaField(
      {
        // TODO This could be a trait instead.
        bodyplan: new fields.StringField({ required: true, nullable: false }),
        currentEncumbrance: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      },
      { required: true, nullable: false }
    ),

    conditions: new fields.SchemaField(conditionsSchema(), { required: true, nullable: false }),
  }
}
type CharacterSchema = ReturnType<typeof characterSchema>

/* ---------------------------------------- */

export { CharacterModel, type CharacterSchema }
