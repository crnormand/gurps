import { GcsCharacter } from './schema/character.js'
import type { CharacterSchema } from '../actor/data/types.js'
import DataModel = foundry.abstract.DataModel
import { GcsItem } from './schema/base.js'
import { GurpsActor } from '../actor/actor.js'

/**
 * GCS Importer class for importing GCS characters into the system.
 * This class handles the conversion of GCS character data into the format used by the GURPS system.
 */
export class GcsImporter {
  /**
   * Given a GCS Character, return a (new) GURPS Actor.
   * @param input GCS Character data
   * @returns GURPS Actor instance
   */
  static async importCharacter(input: GcsCharacter): Promise<GurpsActor | undefined> {
    return await new GcsImporter(input).#importCharacter()
  }

  input: GcsCharacter
  output: DataModel.CreateData<CharacterSchema>
  items: DataModel.CreateData<DataModel.SchemaOf<GcsItem<any>>>[]
  img: string

  /* ---------------------------------------- */

  constructor(input: GcsCharacter) {
    this.input = input
    this.output = {}
    this.items = []
    this.img = ''
  }

  /* ---------------------------------------- */

  async #importCharacter(): Promise<GurpsActor | undefined> {
    const _id = foundry.utils.randomID()
    const name = this.input.profile.name ?? 'Imported Character'

    this.#importProfile()
    this.#importPortrait()
    this.#importAttributes()
    this.#importHitLocations()

    // Convert this.output into json.
    const json = JSON.stringify(this.output)
    console.log(json)

    return await Actor.create({
      _id,
      type: 'characterV2',
      name,
      img: this.img,
      system: this.output,
      // items: this.items,
    })
  }

  /* ---------------------------------------- */

  #importProfile() {
    const profile = this.input.profile
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

  #importPortrait() {
    if (game.user?.hasPermission('FILES_UPLOAD')) {
      this.img = `data:image/png;base64,${this.input.profile.portrait}.png`
    }
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {}, WILL: {}, PER: {}, QN: {} }

    for (let key of ['ST', 'DX', 'IQ', 'HT', 'WILL', 'PER', 'QN'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())
      if (attribute) {
        this.output.attributes[key] = {
          import: attribute.calc.value,
          points: attribute.calc.points,
        }
      } else {
        this.output.attributes[key] = {
          import: 10,
          points: 0,
        }
      }
    }

    const basicSpeed = this.input.attributes.find(attr => attr.attr_id === 'basic_speed')
    this.output.basicspeed = {
      value: basicSpeed?.calc.value ?? 5,
      points: basicSpeed?.calc.points ?? 0,
    }

    const basicMove = this.input.attributes.find(attr => attr.attr_id === 'basic_move')
    this.output.basicmove = {
      value: basicMove?.calc.value ?? 5,
      points: basicMove?.calc.points ?? 0,
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
    this.output.dodge = { value: this.input.calc.dodge[0] ?? 0 }
  }

  /* ---------------------------------------- */

  #importHitLocations() {
    this.output.additionalresources ||= {}
    this.output.additionalresources.bodyplan = this.input.settings.body_type.name ?? 'Humanoid'

    this.output.hitlocationsV2 = []
    this.output.hitlocations = {}
    this.input.settings.body_type.locations.forEach(location => {
      const split = { ...(location.calc.dr as Record<string, number>) }
      delete split.all // Remove the 'all' key, as it is already present in the 'import' field

      const newLocation: DataModel.CreateData<HitLocationSchemaV2> = {
        where: location.table_name ?? '',
        import: (location.calc.dr as Record<string, number>).all ?? 0,
        penalty: location.hit_penalty ?? 0,
        rollText: location.calc.roll_range ?? '-',
        split,
      }

      ;(this.output.hitlocationsV2 as DataModel.CreateData<HitLocationSchemaV2>[]).push(newLocation)
    })
  }
}
