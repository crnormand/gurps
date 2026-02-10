import { GcsEquipmentModifierModel } from '@module/item/data/gcs-equipment-modifier.js'

import { SelfProvider } from '../types.ts'

class ScriptEquipmentModifier {
  #item: GcsEquipmentModifierModel

  static newProvider(item: GcsEquipmentModifierModel): SelfProvider<ScriptEquipmentModifier> {
    return {
      id: `${item.parent.id}`,
      provider: new ScriptEquipmentModifier(item),
    }
  }

  constructor(item: GcsEquipmentModifierModel) {
    this.#item = item
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#item.nameWithReplacements
  }
}

export { ScriptEquipmentModifier }
