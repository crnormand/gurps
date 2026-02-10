import { GcsEquipmentModel } from '@module/item/data/gcs-equipment.js'

import { SelfProvider } from '../types.ts'

class ScriptEquipment {
  #item: GcsEquipmentModel

  static newProvider(item: GcsEquipmentModel): SelfProvider<ScriptEquipment> {
    return {
      id: `${item.parent.id}`,
      provider: new ScriptEquipment(item),
    }
  }

  constructor(item: GcsEquipmentModel) {
    this.#item = item
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#item.nameWithReplacements
  }
}

export { ScriptEquipment }
