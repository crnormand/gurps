import { SYSTEM_NAME } from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'
import { EffectModifierPopout } from './effect-modifier-popout.js'

export class EffectModifierControl {
  static SETTING_SHOW_EFFECTMODIFIERS = 'tokentools-show-effectmods'
  static EffectModName = 'GURPSEffectsMod'

  constructor() {
    this._showPopup = true
    this.token = null

    Hooks.once('init', this._registerSetting.bind(this))
    Hooks.on('getSceneControlButtons', this._createEffectModifierButton.bind(this))
    Hooks.on('controlToken', this._controlToken.bind(this))
    Hooks.on('updateToken', this._updateToken.bind(this))
    Hooks.on('createActiveEffect', this._updatedActiveEffect.bind(this))
    Hooks.on('deleteActiveEffect', this._updatedActiveEffect.bind(this))
    Hooks.on('targetToken', this._targetToken)
    Hooks.once('ready', () => {
      if (this.shouldUseEffectModifierPopup()) {
        this._ui = new EffectModifierPopout(null, this)
        this.showPopup = true
        this.refresh()
      }
    })
    Hooks.on('closeEffectModifierPopout', () => (this.showPopup = false))
  }

  get showPopup() {
    return this._showPopup
  }

  set showPopup(b) {
    if (b !== this.showPopup) this.togglePopup()
  }

  togglePopup(closeOptions) {
    this._showPopup = !this._showPopup

    // show the token control as active
    let toggle = $.find(`[data-tool=${EffectModifierControl.EffectModName}]`)
    if (this._showPopup) toggle[0]?.classList.add('active')
    else toggle[0]?.classList.remove('active')

    this.toggleEffectModifierPopup(closeOptions)
  }

  _registerSetting() {
    game.settings.register(SYSTEM_NAME, EffectModifierControl.SETTING_SHOW_EFFECTMODIFIERS, {
      name: i18n('GURPS.settingTokenToolsShowEffectMods', 'Show Effect Modifiers'),
      hint: i18n('GURPS.settingHintTokenToolsShowEffectMods', 'Enable the token Effect Modifiers popup window.'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`${EffectModifierControl.SETTING_SHOW_EFFECTMODIFIERS} : ${value}`),
    })
  }

  _createEffectModifierButton(controls) {
    if (this.shouldUseEffectModifierPopup()) {
      let tokenButton = controls.find(b => b.name == 'token')
      if (tokenButton) {
        let self = this
        tokenButton.tools.push({
          name: EffectModifierControl.EffectModName,
          title: i18n('GURPS.tokenToolsTitle'),
          icon: 'fas fa-list-alt',
          toggle: true,
          active: this.showPopup,
          visible: true,
          onClick: value => {
            console.log(value)
            self.showPopup = value
          },
        })
      }
    }
  }

  _updatedActiveEffect(effect, _, __) {
    let effectID = effect?.parent.id
    let sharedStateID = this.token?.actor.id
    console.debug(`updated ActiveEffect: effect id: ${effectID}, token actor id: ${sharedStateID}`)
    if (effect?.parent.id === this.token?.actor.id) this._ui.render(false)
  }

  _updateToken(tokenDocument) {
    let tokenID = tokenDocument.object?.id
    let sharedStateID = this.token?.id
    console.debug(`_updateToken: token id: ${tokenID}, token actor id: ${sharedStateID}`)
    if (tokenDocument.object === this.token) this._ui.render(false)
  }

  _targetToken = () => this._targetTokenInner(true)

  _tokenTargeted = false

  /*
    when an user switches targets, there are two calls to the targetToken hook, one for the old target and one for the new target
    if we rerender on the first call, we will miss the second call, because we are allready rerendering.
    Therefore we  need to wait and check  for the second call. 
  */
  _targetTokenInner = newEvent => {
    //needs to be an lambda to capture this in the clousure
    if (this._tokenTargeted) {
      //this is either a second call or we have waited 30 ms since the last call
      if (this._ui?._state === Application.RENDER_STATES.RENDERING) {
        setTimeout(() => this._targetTokenInner(newEvent), 5) //wait if already rendering
      } else {
        this._tokenTargeted = false
        this._ui?.render(false)
      }
    } else if (newEvent) {
      //this is the first call, we need to wait if ther is a second one
      this._tokenTargeted = true
      setTimeout(() => this._targetTokenInner(false), 30)
    }
  }

  _controlToken(token, isControlled) {
    let sharedStateID = this.token?.id
    console.log(`controlToken: isControlled: ${isControlled}, token: ${token?.id}, current token: ${sharedStateID}`)
    if (isControlled) this.token = token
    else if (this.token === token) this.token = null

    this._ui?.setToken(this.token)

    // FIXME Yet another crappy hack ... no idea why when switching from one token to another we end up in the
    // "no token selected" state. This fixes that problem.
    let self = this
    setTimeout(() => self._ui?.render(false), 250)
  }

  async close(options) {
    if (this.showPopup) this.togglePopup(options)
  }

  shouldUseEffectModifierPopup() {
    return game.settings.get(SYSTEM_NAME, EffectModifierControl.SETTING_SHOW_EFFECTMODIFIERS)
  }

  toggleEffectModifierPopup(closeOptions) {
    if (this.showPopup) {
      this._ui.setToken(this.token)
      this._ui.render(true)
    } else {
      this._ui.closeApp(closeOptions)
    }
  }

  refresh() {
    this._ui?.render(true)
  }
}
