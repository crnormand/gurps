import { GcsCharacterModel } from '../actor/data/gcs-character.ts'

class ScriptCharacter {
  #character: GcsCharacterModel
  name: string

  constructor(character: GcsCharacterModel) {
    this.#character = character
    this.name = 'test'
  }

  /* ---------------------------------------- */

  get otherName(): string {
    return this.#character.parent.name
  }
}

export { ScriptCharacter }
