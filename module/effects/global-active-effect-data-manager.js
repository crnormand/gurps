import { SYSTEM_NAME } from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'

/**
 * This class is responsible for showing the Active Effects Manager control button on the UI.
 */
export class GlobalActiveEffectDataControl {
  static SETTING_SHOW_EFFECT_MANAGER = 'tokentools-show-effect-manager'
  static ACTIVE_EFFECTS_DATA = 'active-effects-data'
  static EFFECT_MANAGER_NAME = 'GURPSActiveEffects'

  constructor() {
    this._showPopup = false
    Hooks.once('init', this._registerSetting.bind(this))
    Hooks.on('getSceneControlButtons', this._createGlobalActiveEffectButton.bind(this))
    Hooks.on('closeActiveEffectManagerPopout', () => (this.showPopup = false))
    Hooks.once('ready', () => (this._ui = new ActiveEffectManagerPopout(this)))
  }

  _registerSetting() {
    // Register the setting to show the Active Effect Manager.
    // game.settings.register(SYSTEM_NAME, GlobalActiveEffectDataControl.SETTING_SHOW_EFFECT_MANAGER, {
    //   name: i18n('GURPS.settingTokenToolsShowEffectManager', 'Show Active Effect Manager'),
    //   hint: i18n('GURPS.settingHintTokenToolsShowEffectManaager', 'Show the Active Effect Manager.'),
    //   scope: 'client',
    //   config: true,
    //   type: Boolean,
    //   default: true,
    //   onChange: value => console.log(`${GlobalActiveEffectDataControl.SETTING_SHOW_EFFECT_MANAGER} : ${value}`),
    // })

    // Register the setting to STORE the Active Effects.
    game.settings.register(SYSTEM_NAME, GlobalActiveEffectDataControl.ACTIVE_EFFECTS_DATA, {
      name: 'Active Effects Data',
      scope: 'world',
      config: false,
      type: Object,
      default: [], // This is an array of ActiveEffectData objects
    })
  }

  _createGlobalActiveEffectButton(controls) {
    if (this._shouldUseActiveEffectManagerPopup()) {
      let tokenButton = controls.find(b => b.name == 'token')
      if (tokenButton) {
        let self = this
        tokenButton.tools.push({
          name: GlobalActiveEffectDataControl.EFFECT_MANAGER_NAME,
          title: i18n('GURPS.tokenToolsActiveEffects', 'Active Effects Manager'),
          icon: 'fa-solid fa-person-rays',
          toggle: true,
          active: this.showPopup,
          visible: true,
          onClick: value => (self.showPopup = value),
        })
      }
    }
  }

  _shouldUseActiveEffectManagerPopup() {
    return false
    // return game.settings.get(SYSTEM_NAME, GlobalActiveEffectDataControl.SETTING_SHOW_EFFECT_MANAGER)
  }

  get showPopup() {
    return this._showPopup
  }

  set showPopup(b) {
    if (b !== this.showPopup) this._togglePopup()
  }

  _togglePopup(closeOptions) {
    this._showPopup = !this._showPopup

    // show the token control as active
    let toggle = $.find(`[data-tool=${GlobalActiveEffectDataControl.EFFECT_MANAGER_NAME}]`)
    if (this._showPopup) toggle[0]?.classList.add('active')
    else toggle[0]?.classList.remove('active')

    this.toggleEffectManagerPopup(closeOptions)
  }

  toggleEffectManagerPopup(closeOptions) {
    if (this.showPopup) {
      this._ui.render(true)
    } else {
      this._ui.closeApp(closeOptions)
    }
  }

  async close(options) {
    this.showPopup = false
  }
}

class ActiveEffectManagerPopout extends Application {
  constructor(callback, options = {}) {
    super(options)
    this._callback = callback
    this._checkboxes = []
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/active-effects/active-effects-data-list.hbs',
      classes: ['effect-manager-app'],
      popOut: true,
      width: 400,
      height: 'auto',
      minimizable: true,
      jQuery: true,
      resizable: true,
      title: i18n('GURPS.effectManagerPopout', 'Active Effect Manager'),
    })
  }

  getData(options) {
    const activeEffectsData = game.settings.get(SYSTEM_NAME, GlobalActiveEffectDataControl.ACTIVE_EFFECTS_DATA)

    return foundry.utils.mergeObject(super.getData(options), {
      effects: activeEffectsData,
    })
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('.effect-control').on('click', this._onEffectControl.bind(this))
    this._checkboxes = html.find('#gga-effects-data-list input[type=checkbox]')
  }

  async _onEffectControl(event) {
    event.preventDefault()
    const target = event.currentTarget
    const index = parseInt(target.dataset.effectId)
    let activeEffectsData = game.settings.get(SYSTEM_NAME, GlobalActiveEffectDataControl.ACTIVE_EFFECTS_DATA)

    let newEffect = {
      name: i18n('GURPS.effectNew', 'New Effect'),
      img: 'icons/svg/aura.svg',
      disabled: true,
    }

    const indexes = this.getAllCheckedIndexes(target)

    switch (target.dataset.action) {
      case 'create':
        activeEffectsData.push(newEffect)
        this._saveActiveEffects(activeEffectsData)
        return this.render(true)

      case 'delete':
        activeEffectsData.splice(index, 1)
        this._saveActiveEffects(activeEffectsData)
        return this.render(true)

      case 'edit':
        return this._editEffect(activeEffectsData[index], index)

      case 'apply':
        this._apply(indexes)
        return
    }
  }

  getAllCheckedIndexes(a) {
    const indexes = []
    const x = $(a.closest('.active-effects-list')).find('#gga-effects-data-list input[type=checkbox]')
    for (let index = 0; index < x.length; index++) {
      if ($(x[index]).is(':checked')) indexes.push(index)
    }
    return indexes
  }

  _saveActiveEffects(activeEffectsData) {
    game.settings.set(SYSTEM_NAME, GlobalActiveEffectDataControl.ACTIVE_EFFECTS_DATA, activeEffectsData)
  }

  _editEffect(effect, index) {
    console.log('Edit Effect:', effect)
    new ActiveEffectDataConfig(effect, index, this).render(true, { parentWindow: this })
  }

  _apply(indexes) {
    const tokens = canvas.tokens.controlled

    console.log('indexes', indexes)
    console.log('tokens', tokens)
  }

  /** @override */
  async close(options) {
    this._callback.close(options)
    super.close(options)
  }
}

/*
  Interface ActiveEffectData {
    _id: string;
    name: string;
    img: string;
    changes: EffectChangeData[];
    disabled: boolean;
    duration: EffectDurationData;
    description: string;
    origin: string;
    tint: string;
    transfer: boolean;
    statuses: Set<string>;
    flags: object;
}
*/
class ActiveEffectDataConfig extends FormApplication {
  constructor(effect, index, callback, options = {}) {
    super(effect, options)
    this._index = index
    this._callback = callback
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'active-effect-config',
      template: 'systems/gurps/templates/active-effects/active-effect-data.hbs',
      title: i18n('GURPS.effectConfig', 'Active Effect Data Configuration'),
      classes: ['sheet'],
      width: 600,
      height: 'auto',
      closeOnSubmit: true,
      submitOnChange: false,
      resizable: true,
      tabs: [{ navSelector: '.tabs', contentSelector: 'form', initial: 'details' }],
    })
  }

  /** @override */
  getData() {
    const data = super.getData()
    data.object.oldName = data.object.name
    console.log('data', data)
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('.effect-control').on('click', this._onEffectControl.bind(this))
  }

  async _onEffectControl(event) {
    event.preventDefault()
    const target = event.currentTarget

    switch (target.dataset.action) {
      case 'add':
        this.object.changes.push({
          key: '',
          mode: 0,
          value: '',
        })
    }
  }

  /** @override */
  async _updateObject(event, formData) {
    this.object = foundry.utils.mergeObject(this.object, formData)

    const activeEffectsData = game.settings.get(SYSTEM_NAME, GlobalActiveEffectDataControl.ACTIVE_EFFECTS_DATA)
    activeEffectsData[this._index] = this.object
    game.settings.set(SYSTEM_NAME, GlobalActiveEffectDataControl.ACTIVE_EFFECTS_DATA, activeEffectsData)
  }

  /** @override */
  async close(options) {
    this._callback.render(true)

    super.close(options)
  }
}
