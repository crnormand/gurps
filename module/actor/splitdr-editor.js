import { i18n_f } from '../../lib/utilities.js'

export default class SplitDREditor extends Application {
  constructor(actor, key, options) {
    super(options)

    this.actor = actor
    this.key = key
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sheet'],
      width: 300,
      height: 'auto',
      resizeable: false,
    })
  }

  get template() {
    return 'systems/gurps/templates/actor/splitdr-editor.hbs'
  }

  getData() {
    const sheetData = super.getData()
    sheetData.location = this.location
    return sheetData
  }

  get title() {
    return i18n_f('GURPS.drSplitEditorTitle', { where: this.location.where }, 'Split DR ({where})')
  }

  get location() {
    return foundry.utils.getProperty(this.actor, this.key)
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('.splitdr-control').on('change click keyup', this._onSplitDRControl.bind(this, html))
  }

  async _onSplitDRControl(html, event) {
    event.preventDefault()
    const a = event.currentTarget
    const value = a.value ?? null
    const action = a.dataset.action ?? null

    if (event.type === 'change') this._change(action, value, html)
    if (event.type === 'keyup') this._keyup(action, event.key, html)
    if (event.type === 'click') this._click(action, value, html)
  }

  async _click(action, value) {
    switch (action) {
      // click:  action [create] key [null] value [null]
      case 'create':
        {
          // add a new entry
          let entry = {}
          entry[`${this.key}.split`] = { none: 0 }
          await this.actor.update(entry)
        }
        break

      // click:  action [delete] key [00000] value [null]
      case 'delete':
        {
          // remove existing entries
          let entry = {}
          entry[`${this.key}.-=split`] = null
          await this.actor.update(entry)
        }
        break

      default:
        return
    }
    this.render(true)
  }

  async _keyup(action, value, html) {
    // Escape key while in the "other" textfield closes it.
    if (action === 'other' && value === 'Escape') {
      html.find(`#expand-contract-splitdr`).removeClass('contracted')
      this.render(true)
    }
  }

  async _change(action, value, html) {
    let [existingKey, existingValue] = Object.entries(this.location.split)[0]

    switch (action) {
      // change: action [mode] key [00000] value [Ground]
      case 'type':
        {
          // if 'other', don't trigger an update ... just display the hidden field
          if (value === 'other') {
            html.find(`#expand-contract-splitdr`).removeClass('contracted')
            return
          }

          // hide the field and update the actor
          html.find(`#expand-contract-splitdr`).addClass('contracted')
          await this._updateSplitDRKey(existingValue, value)
        }
        break

      // change: action [value] key [00000] value [6]
      case 'value':
        await this._updateSplitDRValue(existingKey, value)
        break

      case 'other':
        html.find(`#expand-contract-splitdr`).removeClass('contracted')
        await this._updateSplitDRKey(existingValue, value)
        break

      default:
        return
    }
    this.render(true)
  }

  async _updateSplitDRValue(existingKey, newValue) {
    let updated = {}
    updated[`${this.key}.split.${existingKey}`] = +newValue
    await this.actor.update(updated)
  }

  async _updateSplitDRKey(existingValue, newKey) {
    let old = {}
    old[`${this.key}.-=split`] = null
    await this.actor.update(old)

    let split = {}
    split[newKey] = existingValue
    let updated = {}
    updated[`${this.key}.split`] = split
    await this.actor.update(updated)
  }
}
