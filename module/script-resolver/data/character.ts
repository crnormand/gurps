import { GcsCharacterModel } from '../../actor/data/gcs-character.ts'
import { ScriptContextEntry, ScriptMethodSpec, ScriptMethodType } from '../types.ts'

import { ScriptAttribute } from './attribute.ts'

class ScriptCharacter implements ScriptContextEntry {
  data: {
    exists: boolean
    playerName: string
    name: string
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
    attributes: Partial<ScriptAttribute['data']>[]
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
  }

  methods: Record<string, ScriptMethodSpec> = {
    attribute: {
      type: ScriptMethodType.Expr,
      args: ['id'],
      expr: 'Object.fromEntries(this.attributes.map(e => [e.id,e]))?.[id]',
    },
    foo: { type: ScriptMethodType.Expr, args: [], expr: '"foo"' },
    bar: { type: ScriptMethodType.Expr, args: [], expr: 'this.name' },
  }

  constructor(character: GcsCharacterModel) {
    this.data = {
      exists: true,
      playerName: character.profile.playerName,
      name: character.parent.name,
      // attributes: character._attributes.map(e => new ScriptAttribute(e)),
      attributes: [
        { id: 'foo', name: 'Foo', maximum: 1 },
        { id: 'bar', name: 'Bar', maximum: 2 },
      ],
    }
  }
}

export { ScriptCharacter }
