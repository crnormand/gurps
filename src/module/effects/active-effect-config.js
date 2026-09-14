export default class GurpsActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
  constructor(object = {}) {
    super(object)
  }

  async getData(options = {}) {
    const data = await super.getData(options)

    if (data?.data?.changes) {
      for (let i = 0; i < data.data.changes.length; i++) {
        data.data.changes[i].value = game.i18n.localize(data.data.changes[i].value)
      }
    }

    return data
  }

  /** @override */
  async close(options) {
    await super.close(options)
    this._parentWindow?.render()
  }

  /**
   * @override
   * Add a reference to the 'parent' window into options so we can refresh it.
   * @param {*} force
   * @param {*} options
   */
  render(force, options = {}) {
    if (Object.hasOwn(options, 'parentWindow')) this._parentWindow = options.parentWindow
    else if (force && typeof force === 'object' && Object.hasOwn(force, 'parentWindow')) {
      this._parentWindow = force.parentWindow
    }

    return super.render(force, options)
  }
}
