import { GURPSActiveEffectsChanges } from './effects.js'

export default class GurpsActiveEffectConfig extends ActiveEffectConfig {
  get template() {
    return 'systems/gurps/templates/active-effects/active-effect-config.html'
  }

  getData() {
    const sheetData = super.getData()
    sheetData.changes = GURPSActiveEffectsChanges
    return sheetData
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    let result = await super._updateObject(event, formData)
    // somehow tell the Active Effects List window to refresh its data
    if (this._parentWindow) this._parentWindow.render(true)
    return result
  }

  /**
   * Add a reference to the 'parent' window into options so we can refresh it.
   * @param {*} force
   * @param {*} options
   */
  render(force, options = {}) {
    if (options.hasOwnProperty('parentWindow')) this._parentWindow = options.parentWindow
    return super.render(force, options)
  }
}
