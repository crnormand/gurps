import { AnyObject } from 'fvtt-types/utils'

import { GcsCharacterModel } from '../actor/data/gcs-character.ts'

class ScriptCharacter {
  #character: GcsCharacterModel
  name: string
  system: AnyObject

  constructor(character: GcsCharacterModel) {
    this.#character = character
    this.name = character.parent.name
    this.system = character.toObject()
  }

  /* ---------------------------------------- */

  get otherName(): string {
    return this.#character.parent.name
  }
}

export { ScriptCharacter }
