import { GcsTraitModel } from '@module/item/data/gcs-trait.js'

import { SelfProvider } from '../types.ts'

class ScriptTrait {
  #item: GcsTraitModel

  static newProvider(item: GcsTraitModel): SelfProvider<ScriptTrait> {
    return {
      id: `${item.parent.id}`,
      provider: new ScriptTrait(item),
    }
  }

  constructor(item: GcsTraitModel) {
    this.#item = item
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#item.nameWithReplacements
  }
}

export { ScriptTrait }
