import { SYSTEM_NAME } from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'
import { EffectModifierPopout } from './effect-modifier-popout.js'

export class EffectModifierControl {
  static SETTING_SHOW_EFFECTMODIFIERS = 'tokentools-show-effectmods'
  static EffectModName = 'GURPSEffectsMod'

  constructor() {
    this.sharedState = { effectModifier: false, token: null }
    Hooks.once('init', this._registerSetting.bind(this))
    Hooks.on('renderSceneControls', this._createEffectModifierButton.bind(this))
    Hooks.on('controlToken', this._controlToken.bind(this))
    Hooks.on('updateToken', this._updateToken.bind(this))
    Hooks.on('applyActiveEffect', this._applyActiveEffect.bind(this))
    Hooks.once('ready', () => {
      this._ui = new EffectModifierPopout(null)
    })
  }

  _registerSetting() {
    game.settings.register(SYSTEM_NAME, EffectModifierControl.SETTING_SHOW_EFFECTMODIFIERS, {
      name: i18n('GURPS.settingTokenToolsShowEffectMods'),
      hint: i18n('GURPS.settingHintTokenToolsShowEffectMods'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`${EffectModifierControl.SETTING_SHOW_EFFECTMODIFIERS} : ${value}`),
    })
  }

  _createEffectModifierButton(control, html, data) {
    if (this.shouldUseEffectModifierPopup()) {
      const name = EffectModifierControl.EffectModName
      const title = i18n('GURPS.tokenToolsTitle')
      const icon = 'fas fa-list-alt'
      const active = this.sharedState.effectModifier
      const btn = $(
        `<li class="control-tool toggle ${
          active ? 'active' : ''
        }" title="${title}" data-tool="${name}"><i class="${icon}"></i></li>`
      )
      btn.on('click', () => this.toggleEffectModifierPopup())

      let list = html.find('[data-control=token] ol')
      list.append(btn)
    }
  }

  _applyActiveEffect(actor, options, id) {
    if (actor.id === this.sharedState.token.actor.id) this._ui.render(false)
  }

  _updateToken(tokenDocument) {
    if (tokenDocument.object === this.sharedState.token) this._ui.render(false)
  }

  _controlToken(token, isControlled) {
    if (isControlled && !!token) this.sharedState.token = token
    if (!isControlled) this.sharedState.token = null
    this._ui.token = this.sharedState.token
    this._ui.render(false)
  }

  shouldUseEffectModifierPopup() {
    return game.settings.get(SYSTEM_NAME, EffectModifierControl.SETTING_SHOW_EFFECTMODIFIERS)
  }

  toggleEffectModifierPopup() {
    this.sharedState.effectModifier = !this.sharedState.effectModifier
    if (this.sharedState.effectModifier) {
      this._ui.token = this.sharedState.token
      this._ui.render(true)
    }
  }
}
