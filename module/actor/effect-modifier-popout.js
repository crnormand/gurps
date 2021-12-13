import GurpsWiring from '../gurps-wiring.js'
import { i18n, i18n_f } from '../../lib/utilities.js'

export class EffectModifierPopout extends Application {
  constructor(token, callback, options = {}) {
    super(options)
    this._token = token
    this._callback = callback
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/actor/effect-modifier-popout.hbs',
      classes: ['sidebar-popout effect-modifiers-app'],
      popOut: true,
      top: 0,
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
    return mergeObject(super.getData(options), {
      selected: this.selectedToken,
      selfmodifiers: this._token
        ? this._token.actor
            .getGurpsActorData()
            .conditions.self.modifiers.map(it => `[${i18n(it)}]`)
            .map(it => GURPS.gurpslink(it))
        : [],
        targetmodifiers: this._token
        ? this._token.actor
            .getGurpsActorData()
            .conditions.target.modifiers.map(it => `[${i18n(it)}]`)
            .map(it => GURPS.gurpslink(it))
        : [],
    })
  }

  get selectedToken() {
    return this._token?.name ?? i18n('GURPS.effectModNoTokenSelected')
  }

  getToken() {
    return this._token
  }

  async setToken(value) {
    this._token = value
    await this.render(false)
  }

  /** @override */
  activateListeners(html) {
    GurpsWiring.hookupAllEvents(html)
    GurpsWiring.hookupGurpsRightClick(html)

    html
      .closest('div.effect-modifiers-app')
      .find('.window-title')
      .text(i18n_f('GURPS.effectModifierPopout', { name: this.selectedToken }, 'Effect Modifiers: {name}'))
  }

  /** @override */
  async close(options) {
    this._callback.close(options)
  }

  async closeApp(options) { super.close(options) }
}
