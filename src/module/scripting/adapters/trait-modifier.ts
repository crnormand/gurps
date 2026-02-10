import { GcsTraitModifierModel } from '@module/item/data/gcs-trait-modifier.js'

import { SelfProvider } from '../types.ts'

class ScriptTraitModifier {
  #item: GcsTraitModifierModel

  static newProvider(item: GcsTraitModifierModel): SelfProvider<ScriptTraitModifier> {
    return {
      id: `${item.parent.id}`,
      provider: new ScriptTraitModifier(item),
    }
  }

  constructor(item: GcsTraitModifierModel) {
    this.#item = item
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#item.nameWithReplacements
  }
}

export { ScriptTraitModifier }
