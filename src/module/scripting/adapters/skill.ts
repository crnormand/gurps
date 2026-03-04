import { GcsSkillModel } from '@module/item/data/gcs-skill.js'

import { SelfProvider } from '../types.js'

class ScriptSkill {
  #item: GcsSkillModel

  static newProvider(item: GcsSkillModel): SelfProvider<ScriptSkill> {
    return {
      id: `${item.parent.id}`,
      provider: new ScriptSkill(item),
    }
  }

  constructor(item: GcsSkillModel) {
    this.#item = item
  }

  /* ---------------------------------------- */

  get name(): string {
    return this.#item.nameWithReplacements
  }
}

export { ScriptSkill }
