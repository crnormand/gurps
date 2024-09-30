import { GURPSActiveEffectsChanges } from './effects.js'

export default class GurpsActiveEffectConfig extends ActiveEffectConfig {
  constructor(object = {}) {
    super(object)
  }

  /** @override */
  async close(options) {
    super.close(options)
    this._parentWindow.render()
  }

  get template() {
    return 'systems/gurps/templates/active-effects/active-effect-config.hbs'
  }

  async getData() {
    const sheetData = await super.getData()
    sheetData.changes = GURPSActiveEffectsChanges
    sheetData.worldTime = game.time.worldTime
    return sheetData
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('.effect-control').on('click', this._onEffectControl.bind(this))
  }

  async _onEffectControl(event) {
    event.preventDefault()
    const a = event.currentTarget
    const effect = a.dataset.effectId ? this.actor.effects.get(a.dataset.effectId) : null

    switch (a.dataset.action) {
      case 'create':
    }
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    // If there is an EndCondition, this is a temporary effect. Signal this by setting the core.statusId value.
    let newEndCondition = formData.flags?.gurps?.endCondition

    // TODO Monitor this -- ActiveEffect.flags.core.status is deprecated
    // formData.flags['core.statusId'] = !!newEndCondition ? this.object.label : null

    // Flip the "Disabled" flag.
    formData.disabled = !formData.disabled

    let result = await super._updateObject(event, formData)

    // Tell the Active Effects List window to refresh its data.
    if (this._parentWindow) this._parentWindow.render(true)

    console.log('effect', result)
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
