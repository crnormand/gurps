import { GcsCharacterModel } from '../../actor/data/gcs-character/gcs-character.js'

import { ScriptAttribute } from './attribute.js'

class ScriptEntity {
  #character: GcsCharacterModel

  // NOTE: This is the full list of fields which this adapter should provide,
  // though some of the types are incorrect and will need to be updated as the implementation progresses.
  // exists: boolean
  // playerName: string
  // name: string
  // title: string
  // organization: string
  // religion: string
  // techLevel: string
  // gender: string
  // age: string
  // birthday: string
  // eyes: string
  // hair: string
  // skin: string
  // handedness: string
  // heightInInches: number
  // weightInPounds: number
  // displayHeightUnits: string
  // displayWeightUnits: string
  // sizeModifier: number
  // liftingStrength: number
  // strikingStrength: number
  // throwingStrength: number
  // extraDiceFromModifiers: boolean
  // attributes: ScriptAttribute[]
  // encumbrance: string
  // equipment: string
  // skills: string
  // spells: string
  // traits: string
  // attribute: string
  // currentEncumbrance: string
  // findEquipment: string
  // findSkills: string
  // findSpells: string
  // findTraits: string
  // hasTrait: string
  // skillLevel: string
  // traitLevel: string
  // weaponDamage: string
  // weapons: string
  // findWeapons: string
  // randomHeightInInches: string
  // randomWeightInPounds: string

  constructor(character: GcsCharacterModel) {
    this.#character = character
  }

  /* ---------------------------------------- */

  get exists(): boolean {
    return !!this.#character
  }

  /* ---------------------------------------- */

  get playerName(): string {
    return this.#character.profile.playerName
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#character.parent.name
  }

  /* ---------------------------------------- */

  get title(): string {
    return this.#character.profile.title
  }

  /* ---------------------------------------- */

  get attributes(): ScriptAttribute[] {
    return Object.values(this.#character._attributes).map(attr => new ScriptAttribute(attr))
  }

  /* ---------------------------------------- */

  attribute(id: string): ScriptAttribute | undefined {
    return this.attributes.find(attr => attr.id === id)
  }
}

/* ---------------------------------------- */

export { ScriptEntity }
