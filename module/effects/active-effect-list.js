import { i18n, i18n_f } from '../../lib/utilities.js'

export default class GurpsActiveEffectListSheet extends Application {
  constructor(actor, options) {
    super(options)

    this.actor = actor
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sheet'],
      width: 400,
      height: 'auto',
      resizable: false,
    })
  }

  get template() {
    return 'systems/gurps/templates/actor/active-effects-list.hbs'
  }

  getData() {
    const sheetData = super.getData()
    sheetData.effects = this.actor
      .getEmbeddedCollection('ActiveEffect')
      .contents.filter(it => !it.isManeuver)
    return sheetData
  }

  get title() {
    let name = this.actor?.name || 'UNKNOWN'
    return i18n_f('GURPS.effects.ListTitle', { name: name }, 'Active Effects for {name}')
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
        await this.actor.createEmbeddedDocuments('ActiveEffect', [
          {
            label: i18n('GURPS.effectNew', 'New Effect'),
            icon: 'icons/svg/aura.svg',
            disabled: true,
          },
        ])
        return this.render(true)
      case 'delete':
        await effect.delete()
        return this.render(true)
      case 'edit':
        return effect.sheet.render(true, { parentWindow: this })
      case 'disable':
        await effect.update({ disabled: !a.checked })
        return this.render(true)
    }
  }
}
