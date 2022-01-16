import { GURPSActiveEffectsChanges } from "./effects.js"

export default class GurpsActiveEffectConfig extends ActiveEffectConfig {
  get template() {
    return 'systems/gurps/templates/active-effects/active-effect-config.html'
  }

  getData() {
    const sheetData = super.getData()
    sheetData.changes = GURPSActiveEffectsChanges
    return sheetData
  }
}
