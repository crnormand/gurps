'use strict'

import { CompositeDamageCalculator } from './damagecalculator.js'
import {
  isNiceDiceEnabled,
  parseFloatFrom,
  parseIntFrom,
  generateUniqueId,
  objectToArray,
  i18n,
  displayMod,
  locateToken,
} from '../../lib/utilities.js'
import * as settings from '../../lib/miscellaneous-settings.js'
import { digitsAndDecimalOnly, digitsOnly } from '../../lib/jquery-helper.js'
import { GurpsActor } from '../actor.js'

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
  /**
   * Create a new ADD.
   *
   * @param {GurpsActor} actor
   * @param {Array} damageData
   * @param {*} options
   */
  constructor(actor, damageData, options = {}) {
    super(options)

    if (!Array.isArray(damageData)) damageData = [damageData]

    this._calculator = new CompositeDamageCalculator(actor, damageData)
    this.actor = actor
    this.isSimpleDialog = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE)
    this.timesToApply = 1

    let trackers = objectToArray(actor._additionalResources.tracker)
    this._resourceLabels = trackers.filter(it => !!it.isDamageType).filter(it => !!it.alias)

    console.log(this._resourceLabels)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['boilerplate', 'sheet', 'actor'],
      id: 'apply-damage-dialog',
      template: 'systems/gurps/templates/apply-damage/apply-damage-dialog.html',
      resizable: true,
      minimizable: false,
      width: 800,
      height: game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE) ? simpleDialogHeight : 'auto',
      title: game.i18n.localize('GURPS.addApplyDamageDialog'),
    })
  }

  getData() {
    let data = super.getData()
    data.actor = this.actor
    data.CALC = this._calculator
    data.timesToApply = this.timesToApply
    data.isSimpleDialog = this.isSimpleDialog
    data.resourceLabels = this._resourceLabels
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

    // ==== Multiple Dice ====
    html.find('#pagination-left').on('click', ev => {
      if (this._calculator.viewId === 'all') return
      if (this._calculator.viewId === 0) this._calculator.viewId = 'all'
      else this._calculator.viewId = this._calculator.viewId - 1

      this.updateUI()
    })

    html.find('#pagination-right').on('click', ev => {
      if (this._calculator.viewId === 'all') this._calculator.viewId = 0
      else {
        let index = this._calculator.viewId + 1
        if (index >= this._calculator.length) return
        this._calculator.viewId = index
      }
      this.updateUI()
    })

    for (let index = 0; index < this._calculator.length; index++) {
      html.find(`#pagination-${index}`).on('click', ev => {
        this._calculator.viewId = index
        this.updateUI()
      })
    }

    html.find('#pagination-all').on('click', ev => {
      this._calculator.viewId = 'all'
      this.updateUI()
    })

    // ==== Simple Damage ====
    html
      .find('#basicDamage')
      .on('change', ev => this._updateModelFromInputText($(ev.currentTarget), 'basicDamage', parseIntFrom))

    html.find('#apply-publicly').on('click', ev => {
      this.submitDirectApply(ev.shiftKey, true)
    })

    html.find('#apply-secretly').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitDirectApply(ev.shiftKey, false)
    })

    html.find('#apply-keep').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitDirectApply(true, true)
    })

    html.find('#apply-secretly-keep').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitDirectApply(true, false)
    })

    html.find('#apply-split').on('click', ev => {
      let content = html.find('#apply-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
    })

    // When dropdown changes, update the calculator and refresh GUI.
    html.find('#apply-to').on('change', ev => {
      this._calculator.applyTo = $(ev.currentTarget).find('option:selected').val()
      this.updateUI()
    })

    // ==== Hit Location and DR ====
    // When user-entered DR input changes, update the calculator.
    html
      .find('#override-dr input')
      .on('change', ev => this._updateModelFromInputText($(ev.currentTarget), 'userEnteredDR', parseIntFrom))

    // clear the user override of the Override DR value
    html.find('#override-dr button').click(() => {
      this._calculator.userEnteredDR = null
      this.updateUI()
    })

    html.find('#apply-multiple').on('change', ev => {
      let temp = $(ev.currentTarget).val()
      temp = parseIntFrom(temp, 1)
      this.timesToApply = temp
    })

    // If the current hit location is Random, resolve the die roll and update the hit location.
    if (this._calculator.hitLocation === 'Random') this._randomizeHitLocation()

    // When the 'random' button is clicked, update the hit location.
    html.find('#random-location').on('click', async () => this._randomizeHitLocation())

    // When a new Hit Location is selected, calculate the new results and update the UI.
    html
      .find('input[name="hitlocation"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'hitLocation'))

    // ==== Type and Wounding Modifiers ====
    html
      .find('input[name="woundmodifier"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'damageType'))

    html
      .find('#user-entered-woundmod')
      .on('change', ev =>
        this._updateModelFromInputText($(ev.currentTarget), 'userEnteredWoundModifier', parseFloatFrom)
      )

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    html
      .find('#addmodifier')
      .on('change', ev =>
        this._updateModelFromInputText($(ev.currentTarget), 'additionalWoundModifier', parseFloatFrom)
      )

    // ==== Tactical Rules ====
    // use armor divisor rules
    html
      .find('#tactical-armordivisor')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'useArmorDivisor'))

    // armor divisor level
    html
      .find('select[name="tactical-armordivisor"]')
      .on('change', ev => this._updateModelFromSelect($(ev.currentTarget), 'armorDivisor', parseFloat))

    // use blunt trauma rules
    html
      .find('#tactical-blunttrauma')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'useBluntTrauma'))

    // use hit location wounding modifiers rules
    html
      .find('#tactical-locationmodifier')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'useLocationModifiers'))

    // ==== Other situations ====
    // is a ranged attack and at 1/2 damage or further range
    html
      .find('#specials-range12D')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isRangedHalfDamage'))

    // target is vulnerable to this attack
    html.find('#vulnerable').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isVulnerable'))

    // Vulnerability level
    html
      .find('input[name="vulnerability"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'vulnerabilityMultiple', parseFloat))

    // target has Hardened DR
    html.find('#hardened').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isHardenedDR'))

    // Hardened DR level
    html
      .find('input[name="hardened"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'hardenedDRLevel', parseFloat))

    html
      .find('select[name="hardened"]')
      .on('change', ev => this._updateModelFromSelect($(ev.currentTarget), 'hardenedDRLevel', parseInt))

    // target has Injury Tolerance
    html
      .find('#injury-tolerance')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isInjuryTolerance'))

    // type of Injury Tolerance
    html
      .find('input[name="injury-tolerance"]')
      .click(ev => this._updateModelFromRadioValue($(ev.currentTarget), 'injuryToleranceType'))

    // if checked, target has Injury Tolerance (Damage Reduction)
    html.find('#damage-reduction').click(ev => {
      if (!$(ev.currentTarget).is(':checked')) {
        this._calculator.damageReductionLevel = null
        this.updateUI()
      }
      this._updateModelFromCheckedElement($(ev.currentTarget), 'useDamageReduction')
    })

    // damage reduction level field
    html
      .find('#damage-reduction-field input')
      .on('change', ev => this._updateModelFromInputText($(ev.currentTarget), 'damageReductionLevel', parseIntFrom))

    // clear the damage reduction level field
    html.find('#damage-reduction-field button').click(() => {
      this._calculator.damageReductionLevel = null
      this.updateUI()
    })

    // if checked, target has flexible armor; check for blunt trauma
    html
      .find('#flexible-armor')
      .click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isFlexibleArmor'))

    // Blunt Trauma user override text field
    html.find('#blunt-trauma-field input').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.bluntTrauma =
        currentValue === '' || currentValue === this._calculator.calculatedBluntTrauma ? null : parseFloat(currentValue)
      this.updateUI()
    })

    // clear the user override of the Blunt trauma value
    html.find('#blunt-trauma-field button').click(() => {
      this._calculator.bluntTrauma = null
      this.updateUI()
    })

    // if checked, target has flexible armor; check for blunt trauma
    html.find('#explosion-damage').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isExplosion'))

    html.find('#explosion-yards').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.hexesFromExplosion = currentValue === '' || currentValue === '0' ? 1 : parseInt(currentValue)
      this.updateUI()
    })

    html.find('#shotgun-damage').click(ev => this._updateModelFromCheckedElement($(ev.currentTarget), 'isShotgun'))

    html.find('#shotgun-rof-multiplier').on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.shotgunRofMultiplier = currentValue === '' || currentValue === '0' ? 1 : parseInt(currentValue)
      this.updateUI()
    })

    // ==== Results ====
    html.find('#result-effects button').click(async ev => this._handleEffectButtonClick(ev))

    html.find('#apply-injury-split').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
    })

    html.find('#apply-injury-publicly').click(ev => {
      this.submitInjuryApply(ev, ev.shiftKey, true)
    })

    html.find('#apply-injury-secretly').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitInjuryApply(ev, ev.shiftKey, false)
    })

    html.find('#apply-injury-keep').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitInjuryApply(ev, true, true)
    })

    html.find('#apply-injury-secretly-keep').on('click', ev => {
      let content = html.find('#apply-injury-dropdown')
      this._toggleVisibility(content, content.hasClass('invisible'))
      this.submitInjuryApply(ev, true, false)
    })
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
    if (element.val() !== this._calculator[property].toString()) element.val(this._calculator[property])

    this.updateUI()
  }

  /**
   * Update the model based on the property name.
   * @param {*} element
   * @param {*} property
   * @param {*} converter
   */
  _updateModelFromRadioValue(
    element,
    property,
    converter = value => {
      return value
    }
  ) {
    if (element.is(':checked')) {
      this._calculator[property] = converter(element.val())
      this.updateUI()
    }
  }

  /**
   *
   * @param {HtmlElement} select
   * @param {String} property of model to update
   * @param {Function} converter optional converter function; by default its the identity function
   */
  _updateModelFromSelect(
    select,
    property,
    converter = value => {
      return value
    }
  ) {
    let valueText = select.find('option:selected').val()
    this._calculator[property] = converter(valueText)
    this.updateUI()
  }

  /**
   * Update the damage calculator property from a UI element that has the 'checked' attribute
   * @param {*} element
   * @param {*} property
   */
  _updateModelFromCheckedElement(element, property) {
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

    let token = null
    if (this.actor.isToken) {
      token = this.actor?.token
    } else {
      let tokens = locateToken(this.actor.id)
      token = tokens.length === 1 ? tokens[0] : null
    }

    let message = ''

    if (object.type === 'shock') {
      let button = `/st + shock${object.amount}`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      message = await this._renderTemplate('chat-shock.html', {
        name: !!token ? token.name : this.actor.data.name,
        modifier: object.amount,
        doubled: object.amount * 2,
        button: button,
      })
    }

    if (object.type === 'majorwound') {
      let htCheck =
        object.modifier === 0 ? 'HT' : object.modifier < 0 ? `HT+${-object.modifier}` : `HT-${object.modifier}`
      let button = `/if ! [${htCheck}] {/st + stun \\\\ /st + prone}`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      message = await this._renderTemplate('chat-majorwound.html', {
        name: !!token ? token.name : this.actor.data.name,
        button: button,
        htCheck: htCheck.replace('HT', i18n('GURPS.attributesHT')),
      })
    }

    if (object.type === 'headvitalshit') {
      let htCheck =
        object.modifier === 0 ? 'HT' : object.modifier < 0 ? `HT+${-object.modifier}` : `HT-${object.modifier}`
      let button = `/if ! [${htCheck}] {/st + stun \\\\ /st + prone}`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      message = await this._renderTemplate('chat-headvitalshit.html', {
        name: !!token ? token.name : this.actor.data.name,
        button: button,
        location: object.detail,
        htCheck: htCheck.replace('HT', i18n('GURPS.attributesHT')),
      })
    }

    if (object.type === 'knockback') {
      let dx = i18n('GURPS.attributesDX')
      let dxCheck = object.modifier === 0 ? dx : `${dx}-${object.modifier}`
      let acro = i18n('GURPS.skillAcrobatics')
      let acroCheck = object.modifier === 0 ? acro : `${acro}-${object.modifier}`
      let judo = i18n('GURPS.skillJudo')
      let judoCheck = object.modifier === 0 ? judo : `${judo}-${object.modifier}`

      let button = `/if ! [${dxCheck}|Sk:${acroCheck}|Sk:${judoCheck}] /st + prone`
      if (!!token) button = `/sel ${token.id} \\\\ ${button}`

      let templateData = {
        name: !!token ? token.name : this.actor.data.name,
        button: button,
        yards: object.amount,
        pdfref: i18n('GURPS.pdfKnockback'),
        unit: object.amount > 1 ? i18n('GURPS.yards') : i18n('GURPS.yard'),
        dx: dxCheck.replace('-', '−'),
        acrobatics: acroCheck.replace('-', '−'),
        judo: judoCheck.replace('-', '−'),
        classStart: '<span class="pdflink">',
        classEnd: '</span>',
      }

      message = await this._renderTemplate('chat-knockback.html', templateData)
    }

    if (object.type === 'crippling') {
      message = await this._renderTemplate('chat-crippling.html', {
        name: this.actor.data.name,
        location: object.detail,
        groundModifier: 'DX-1',
        swimFlyModifer: 'DX-2',
      })
    }

    let msgData = {
      content: message,
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OOC,
    }
    if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_WHISPER_STATUS_EFFECTS)) {
      let users = this.actor.getOwners()
      let ids = users.map(it => it.id)
      msgData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
      msgData.whisper = ids
    }

    ChatMessage.create(msgData)
  }

  _getModifierText(value) {
    let result = displayMod(value)
    if (result === '0') result = ''
    return result
  }

  /**
   * Handle clicking on the Apply (Publicly or Secretly) buttons.
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  submitDirectApply(keepOpen, publicly) {
    let injury = this._calculator.basicDamage
    this.resolveInjury(keepOpen, injury, publicly)
  }

  /**
   * Handle clicking on the Apply Injury (public or secret) buttons.
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  async submitInjuryApply(ev, keepOpen, publicly) {
    let injury = this._calculator.pointsToApply

    let dialog = $(ev.currentTarget).parents('.gurps-app')
    let results = $(dialog).find('.results-table')
    let clone = results.clone().html()

    for (let index = 0; index < this.timesToApply; index++) {
      await this.resolveInjury(keepOpen, injury, publicly, clone)
    }
  }

  /**
   * Handle the actual loss of HP or FP on the actor and display the results in the chat.
   * @param {boolean} keepOpen - if true, apply the damage and keep this window open.
   * @param {int} injury
   * @param {String} type - a valid damage type (including resources)
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  async resolveInjury(keepOpen, injury, publicly, results = null) {
    let [resource, path] = this._calculator.resource

    if (!resource || !path) {
      ui.notifications.warn(
        `Actor ${this.actor.data.name} does not have a resource named "${this._calculator.damageType}"!!`
      )
      return
    }

    let attackingActor = game.actors.get(this._calculator.attacker)

    let data = {
      id: generateUniqueId(),
      injury: injury,
      defender: this.actor.data.name,
      current: resource.value,
      location: this._calculator.resourceType === 'HP' ? this._calculator.hitLocation : null,
      type: this._calculator.resourceType,
      resultsTable: results,
    }

    let newValue = resource.isDamageTracker ? resource.value + injury : resource.value - injury

    let update = {}
    update[`${path}.value`] = newValue
    await this.actor.update(update)

    this._renderTemplate('chat-damage-results.html', data).then(html => {
      let speaker = {
        alias: game.user.data.name,
        _id: game.user.id,
      }
      if (!!attackingActor)
        speaker = {
          alias: attackingActor.data.name,
          _id: attackingActor.id,
          actor: attackingActor,
        }
      let messageData = {
        user: game.user.id,
        speaker: speaker,
        content: html,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      }

      if (!publicly) {
        let users = this.actor.getOwners()
        let ids = users.map(it => it.id)
        messageData.whisper = ids
        messageData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
      }

      ChatMessage.create(messageData)
      if (!keepOpen) this.close()
    })
  }
}
