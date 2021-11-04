import { parselink } from '../../lib/parselink.js'
import { i18n } from '../../lib/utilities.js'

export class EffectModifierPopout extends Application {
  constructor(token, options = {}) {
    super(options)
    this._token = token
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/actor/effect-modifier-popout.hbs',
      classes: ['sidebar-popout effect-modifiers-app'],
      popOut: true,
      width: 400,
      height: 'auto',
      minimizable: true,
      jQuery: true,
      resizable: true,
      title: i18n('GURPS.effectModifierPopout', 'Effect Modifiers'),
    })
  }

  /** @override */
  getData(options) {
    let selected = this._token?.name ?? i18n('GURPS.effectModNoTokenSelected')
    return mergeObject(super.getData(options), {
      selected: selected,
      modifiers: this._token
        ? this._token.actor
            .getGurpsActorData()
            .conditions.self.modifiers.map(it => `[${i18n(it)}]`)
            .map(it => GURPS.gurpslink(it))
        : [],
    })
  }

  getToken() {
    return this._token
  }

  async setToken(value) {
    this._token = value
    console.log(value?.id)
    await this.render(false)
  }
}
