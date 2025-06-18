import DataModel = foundry.abstract.DataModel

import { CharacterSchema } from 'module/actor/data/character.js'
import { GcsCharacter } from './schema/character.js'
import { GcsItem } from './schema/base.js'
import { TraitSchema } from 'module/item/data/trait.js'

class GcsImporter {
  input: GcsCharacter
  output: DataModel.CreateData<CharacterSchema>
  items: DataModel.CreateData<DataModel.SchemaOf<GcsItem<any>>>[]

  /* ---------------------------------------- */

  constructor(input: GcsCharacter) {
    this.input = input
    this.output = {}

    this.items = []
  }

  /* ---------------------------------------- */

  static importCharacter(input: GcsCharacter) {
    return new GcsImporter(input).#importCharacter()
  }

  /* ---------------------------------------- */

  #importCharacter() {
    // Measure how long importing takes
    const startTime = performance.now()

    this.#importAttributes()
    this.#importProfile()
    this.#importTraits()

    console.log(this.output)
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {} }
    for (let key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PERCEPTION'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())
      if (attribute) {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          value: attribute.calc.value,
          points: attribute.calc.points,
        }
      } else {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          value: 10,
          points: 0,
        }
      }
    }

    for (const key of ['HP', 'FP', 'QP'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())
      if (attribute) {
        this.output[key] = {
          min: 0,
          max: attribute.calc.value,
          value: attribute.calc.current,
          points: attribute.calc.points,
        }
      } else {
        this.output[key] = {
          min: 0,
          max: 10,
          value: 10,
          points: 0,
        }
      }
    }

    const otherAttributeKeys = {
      frightcheck: 'fright_check',
      vision: 'vision',
      hearing: 'hearing',
      tastesmell: 'taste_smell',
      touch: 'touch',
    }

    for (const [gga, gcs] of Object.entries(otherAttributeKeys)) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === gcs)
      if (attribute) {
        this.output[gga as 'frightcheck' | 'vision' | 'tastesmell' | 'touch'] = attribute.calc.value
      } else {
        this.output[gga as 'frightcheck' | 'vision' | 'tastesmell' | 'touch'] = 10
      }
    }

    this.output.thrust = this.input.calc.thrust
    this.output.swing = this.input.calc.swing
  }

  /* ---------------------------------------- */

  #importProfile() {
    // TODO: add race
    // ensure SM bonuses are respected

    const { profile } = this.input
    this.output.traits = {
      title: profile.title ?? '',
      height: profile.height ?? '',
      weight: profile.weight ?? '',
      age: profile.age ?? '',
      birthday: profile.birthday ?? '',
      religion: profile.religion ?? '',
      gender: profile.gender ?? '',
      eyes: profile.eyes ?? '',
      hair: profile.hair ?? '',
      hand: profile.handedness ?? '',
      skin: profile.skin ?? '',
      sizemod: profile.SM ?? 0,
      techlevel: profile.tech_level ?? '',
      createdon: this.input.created_date ?? '',
      modifiedon: this.input.modified_date ?? '',
      player: profile.player_name ?? '',
    }
  }

  /* ---------------------------------------- */

  #importTraits() {
    this.input.traits?.forEach(trait => {
			const.name = trait.name ?? ''
      const item: DataModel.CreateData<TraitSchema> = {}



    })
  }
}

export { GcsImporter }
