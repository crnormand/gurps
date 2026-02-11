import { GcsSpellModel } from '@module/item/data/gcs-spell.js'

import { SelfProvider } from '../types.js'

class ScriptSpell {
  #item: GcsSpellModel

  static newProvider(item: GcsSpellModel): SelfProvider<ScriptSpell> {
    return {
      id: `${item.parent.id}`,
      provider: new ScriptSpell(item),
    }
  }

  constructor(item: GcsSpellModel) {
    this.#item = item
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#item.nameWithReplacements
  }
}

export { ScriptSpell }
