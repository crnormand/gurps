'use strict'

import { DamageCalculator } from './damagecalculator.js'
import { isNiceDiceEnabled, parseFloatFrom, parseIntFrom, generateUniqueId } from '../../lib/utilities.js'
import * as settings from '../../lib/miscellaneous-settings.js'
import { digitsAndDecimalOnly, digitsOnly } from '../../lib/jquery-helper.js'

const standardDialogHeight = 800
const simpleDialogHeight = 130

/**
 * Displays the Apply Damage Dialog. Delegates all the logic behind calculating
 * and applying damage to a character to instance variable _calculator.
 *
 * Takes as input a GurpsActor and DamageData.
 *
 * EXAMPLE DamageData:
 *   let damageData = {
 *     attacker: actor,
 *     dice: '3d+5',
 *     damage: 21,
 *     damageType: 'cut',
 *     armorDivisor: 2
 *   }
 */
export default class ApplyDamageDialog extends Application {
  constructor(actor, damageData, options = {}) {
    super(options)

    this._calculator = new DamageCalculator(actor, damageData)
    this.actor = actor
    this.isSimpleDialog = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['boilerplate', 'sheet', 'actor'],
      id: 'apply-damage-dialog',
      template: 'systems/gurps/templates/apply-damage/apply-damage-dialog.html',
      resizable: true,
      minimizable: false,
      width: 800,
      height: game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE) ? simpleDialogHeight : standardDialogHeight,
      title: 'Apply Damage Calculator'
    })
  }

  getData() {
    let data = super.getData()
    data.actor = this.actor
    data.CALC = this._calculator
    data.isSimpleDialog = this.isSimpleDialog
    return data
  }

  /*
   * Wire the logic to the UI.
   */
  activateListeners(html) {
    super.activateListeners(html)

    // Activate all PDF links
    html.find('.pdflink').click(async ev => game.GURPS.handleOnPdf(ev))
    html.find('.digits-only').inputFilter(value => digitsOnly.test(value))
    html.find('.decimal-digits-only').inputFilter(value => digitsAndDecimalOnly.test(value))

    // ==== Simple Damage ====
    html.find('#basicDamage').on('change', ev =>
      this._updateModelFromInputText($(ev.currentTarget), "basicDamage", parseIntFrom))

    html.find('#apply-publicly').on('click', (ev) => this.submitDirectApply(ev, true))
    html.find('#apply-secretly').on('click', (ev) => this.submitDirectApply(ev, false))

    // Set Apply To dropdown value.
    // When dropdown changes, update the calculator and refresh GUI.
    html.find('#apply-to').on('change', ev => {
      this._calculator.applyTo = $(ev.currentTarget).find('option:selected').val()
      this.updateUI()
    })

    // ==== Hit Location and DR ====
    // When user-entered DR input changes, update the calculator.
    html.find("#user-entered-dr").on('change', ev =>
      this._updateModelFromInputText($(ev.currentTarget), "userEnteredDR", parseIntFrom))

    // If the current hit location is Random, resolve the die roll and update the hit location.
    if (this._calculator.hitLocation === 'Random') this._randomizeHitLocation()

    // When the 'random' button is clicked, update the hit location.
    html.find('#random-location').on('click', async () => this._randomizeHitLocation())

    // When a new Hit Location is selected, calculate the new results and update the UI.
    html.find('input[name="hitlocation"]').click(ev =>
      this._updateModelFromRadioValue($(ev.currentTarget), 'hitLocation'))

    // ==== Type and Wounding Modifiers ====
    html.find('input[name="woundmodifier"]').click(ev =>
      this._updateModelFromRadioValue($(ev.currentTarget), 'damageType'))

    html.find("#user-entered-woundmod").on('change', ev =>
      this._updateModelFromInputText($(ev.currentTarget), "userEnteredWoundModifier", parseFloatFrom))

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    html.find("#addmodifier").on('change', ev =>
      this._updateModelFromInputText($(ev.currentTarget), "additionalWoundModifier", parseFloatFrom))

    // ==== Tactical Rules ====
    // use armor divisor rules
    html.find('#tactical-armordivisor').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'useArmorDivisor'))

    // use blunt trauma rules
    html.find('#tactical-blunttrauma').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'useBluntTrauma'))

    // use hit location wounding modifiers rules
    html.find('#tactical-locationmodifier').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'useLocationModifiers'))

    // ==== Other situations ====
    // is a ranged attack and at 1/2 damage or further range
    html.find('#specials-range12D').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'isRangedHalfDamage'))

    // target is vulnerable to this attack
    html.find('#vulnerable').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'isVulnerable'))

    // Vulnerability level
    html.find('input[name="vulnerability"]').click(ev =>
      this._updateModelFromRadioValue($(ev.currentTarget), "vulnerabilityMultiple", parseFloat))

    // target has Hardened DR
    html.find('#hardened').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'isHardenedDR'))

    // Hardened DR level
    html.find('input[name="hardened"]').click(ev =>
      this._updateModelFromRadioValue($(ev.currentTarget), "hardenedDRLevel", parseFloat))

    // target has Injury Tolerance
    html.find('#injury-tolerance').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'isInjuryTolerance'))

    // type of Injury Tolerance
    html.find('input[name="injury-tolerance"]').click(ev =>
      this._updateModelFromRadioValue($(ev.currentTarget), "injuryToleranceType"))

    // if checked, target has flexible armor; check for blunt trauma
    html.find('#flexible-armor').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'isFlexibleArmor'))

    // Blunt Trauma user override text field
    html.find('#blunt-trauma-field input').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.bluntTrauma = (currentValue === '' || currentValue === this._calculator.calculatedBluntTrauma)
        ? null
        : parseFloat(currentValue)
      this.updateUI()
    })

    // clear the user override of the Blunt trauma value
    html.find('#blunt-trauma-field button').click(() => {
      this._calculator.bluntTrauma = null
      this.updateUI()
    })

    // if checked, target has flexible armor; check for blunt trauma
    html.find('#explosion-damage').click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'isExplosion'))

    html.find('#explosion-yards').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.hexesFromExplosion = (currentValue === '' || currentValue === '0')
        ? 1
        : parseInt(currentValue)
      this.updateUI()
    })

    // ==== Results ====
    html.find('#result-effects button').click(async ev => this._handleEffectButtonClick(ev))

    html.find('#apply-injury-publicly').click(ev => this.submitInjuryApply(ev, true))
    html.find('#apply-injury-secretly').click(ev => this.submitInjuryApply(ev, false))
  }

  /**
   * 
   * @param {node} element to get value from
   * @param {string} property name in the model to update
   * @param {function(string) : any} converter function to covert element value (string) to model data type
   */
  _updateModelFromInputText(element, property, converter) {
    this._calculator[property] = converter(element.val())

    // removes leading zeros or replaces blank with zero
    if (element.val() !== this._calculator[property].toString())
      element.val(this._calculator[property])

    this.updateUI()
  }

  _updateModelFromRadioValue(element, property, converter = (value) => { return value }) {
    if (element.is(':checked')) {
      this._calculator[property] = converter(element.val())
      this.updateUI()
    }
  }

  _updateModelFromBooleanElement(element, property) {
    this._calculator[property] = element.is(':checked')
    this.updateUI()
  }

  /**
   * Ask the calculator to randomly select a hit location, and return the roll used.
   */
  async _randomizeHitLocation() {
    let roll3d = this._calculator.randomizeHitLocation()

    if (isNiceDiceEnabled()) {
      game.dice3d.showForRoll(roll3d).then(display => this.updateUI())
    } else {
      AudioHelper.play({ src: CONFIG.sounds.dice })
      this.updateUI()
    }
  }

  _toggleVisibility(element, isVisible) {
    if (isVisible) {
      element.removeClass('invisible')
    } else {
      element.addClass('invisible')
    }
  }

  /**
   * Updates the UI based on the current state of the _calculator.
   */
  updateUI() {
    this.render(false)
  }

  async _renderTemplate(template, data) {
    return renderTemplate('systems/gurps/templates/apply-damage/' + template, data)
  }

  /**
   * Create and show the chat message for the Effect.
   * @param {*} ev 
   */
  async _handleEffectButtonClick(ev) {
    let stringified = ev.currentTarget.attributes['data-struct'].value
    let object = JSON.parse(stringified)

    let message = ''
    if (object.type === 'shock') {
      message = await this._renderTemplate('chat-shock.html',
        {
          name: this.actor.data.name,
          modifier: object.amount,
          doubled: object.amount * 2
        })
    }

    if (object.type === 'majorwound') {
      message = await this._renderTemplate('chat-majorwound.html',
        {
          name: this.actor.data.name,
          htCheck: object.modifier === 0 ? 'HT' : `HT-${object.modifier}`
        })
    }

    if (object.type === 'headvitalshit') {
      message = await this._renderTemplate('chat-headvitalshit.html',
        {
          name: this.actor.data.name,
          location: object.detail,
          htCheck: object.modifier === 0 ? 'HT' : `HT-${object.modifier}`
        })
    }

    if (object.type === 'knockback') {
      let dxCheck = object.modifier === 0 ? 'DX' : `DX-${object.modifier}`
      let acroCheck = object.modifier === 0 ? 'S:Acrobatics' : `S:Acrobatics-${object.modifier}`
      let judoCheck = object.modifier === 0 ? 'S:Judo' : `S:Judo-${object.modifier}`
      message = await this._renderTemplate('chat-knockback.html',
        {
          name: this.actor.data.name,
          yards: object.amount,
          combinedCheck: `${dxCheck}|${acroCheck}|${judoCheck}`
        })
    }

    if (object.type === 'crippling') {
      message = await this._renderTemplate('chat-crippling.html', {
        name: this.actor.data.name,
        location: object.detail,
        groundModifier: 'DX-1',
        swimFlyModifer: 'DX-2'
      })
    }

    let msgData = {
      content: message,
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.OOC
    }
    if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_WHISPER_STATUS_EFFECTS)) {
      let users = this.actor.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true)
      let ids = users.map(it => it._id)
      msgData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
      msgData.whisper = ids
    }

    ChatMessage.create(msgData)
  }

  /**
   * Handle clicking on the Apply (Publicly or Secretly) buttons.
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  submitDirectApply(ev, publicly) {
    let injury = this._calculator.basicDamage
    let type = this._calculator.applyTo
    this.resolveInjury(ev, injury, type, publicly)
  }

  /**
   * Handle clicking on the Apply Injury (public or secret) buttons.
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  submitInjuryApply(ev, publicly) {
    let injury = this._calculator.pointsToApply
    let type = this.damageType === 'fat' ? 'FP' : 'HP'

    let dialog = $(ev.currentTarget).parents('.gurps-app')
    let results = $(dialog).find('.results-table')
    let clone = results.clone().html()
    this.resolveInjury(ev, injury, type, publicly, clone)
  }

  /**
   * Handle the actual loss of HP or FP on the actor and display the results in the chat.
   * @param {*} injury 
   * @param {*} type 
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  resolveInjury(ev, injury, type, publicly, results = null) {
    let current = type === 'FP' ? this._calculator.FP.value : this._calculator.HP.value

    let attackingActor = game.actors.get(this._calculator.attacker)

    let data = {
      id: generateUniqueId(),
      injury: injury,
      defender: this.actor.data.name,
      current: current,
      location: this._calculator.hitLocation,
      type: type,
      resultsTable: results
    }

    if (type === 'FP') {
      this.actor.update({ "data.FP.value": this._calculator.FP.value - injury })
    } else {
      this.actor.update({ "data.HP.value": this._calculator.HP.value - injury })
    }

    this._renderTemplate('chat-damage-results.html', data).then(html => {
      let speaker = {
        alias: game.user.data.name,
        _id: game.user._id
      }
      if (!!attackingActor) speaker = {
        alias: attackingActor.data.name,
        _id: attackingActor._id,
        actor: attackingActor
      }
      let messageData = {
        user: game.user._id,
        speaker: speaker,
        content: html,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      }

      if (!publicly) {
        let users = this.actor.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true)
        let ids = users.map(it => it._id)
        messageData.whisper = ids
        messageData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
      }

      CONFIG.ChatMessage.entityClass.create(messageData)
      if (!ev.shiftKey) this.close()
    })
  }
}