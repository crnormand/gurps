'use strict'

import { DamageCalculator } from './damagecalculator.js'
import { isNiceDiceEnabled } from './utilities.js'
import * as settings from './miscellaneous-settings.js'
import { digitsAndDecimalOnly, digitsOnly } from './jquery-helper.js'

const standardDialogHeight = 800
const simpleDialogHeight = 130

/*   Tactical Combat */
let tacticalOptions = [
  {
    id: 'blunttrauma',
    apply: true,
    label: 'Blunt Trauma',
    ref: 'B379'
  },
  {
    id: 'armordivisor',
    apply: true,
    label: 'Armor Divisor',
    ref: 'B378'
  },
  {
    id: 'perlocationmodifier',
    apply: true,
    label: 'Hit Location Wounding Modifiers',
    ref: 'B398'
  }
]

let otherSituations = [
  {
    id: 'range12D',
    apply: false,
    label: 'Ranged, Half Damage (1/2D)',
    ref: 'B378'
  },
]

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
    data.tacticalOptions = tacticalOptions
    data.otherSituations = otherSituations
    data.isSimpleDialog = this.isSimpleDialog
    return data
  }

  _advancedPanel(html) { return html.find('#apply-damage-advanced') }
  _basicDamageInput(html) { return html.find('#basicDamage') }
  _directlyApplyPublicly(html) { return html.find('#apply-publicly') }
  _directlyApplySecretly(html) { return html.find('#apply-secretly') }
  _applyToDropdown(html) { return html.find('#apply-to') }
  _userEnteredDRInput(html) { return html.find("#user-entered-dr") }
  _randomizeHitLocationButton(html) { return html.find('#random-location') }
  _allHitLocationRadioButtons(html) { return html.find('input[name="hitlocation"]') }
  _hitLocationWithValue(html, value) { return html.find(`input[name='hitlocation'][value='${value}']`) }
  _userEnteredWoundModifierInput(html) { return html.find("#user-entered-woundmod") }
  _allDamageTypeRadioButtons(html) { return html.find('input[name="woundmodifier"], input[name="_woundmodifier"]') }
  _damageTypeButtonWithValue(html, value) { return html.find(`input[name='woundmodifier'][value='${value}']`) }
  _additionalWoundModifierInput(html) { return html.find("#addmodifier") }
  _armorDivisorCheckbox(html) { return html.find('#tactical-armordivisor') }
  _bluntTraumaCheckbox(html) { return html.find('#tactical-blunttrauma') }
  _locationWoundModifierCheckbox(html) { return html.find('#tactical-perlocationmodifier') }
  _rangeHalfDamageCheckbox(html) { return html.find('#specials-range12D') }
  _injuryApplyPublicly(html) { return html.find('#apply-injury-publicly') }
  _injuryApplySecretly(html) { return html.find('#apply-injury-secretly') }
  _pointsToApplyInput(html) { return html.find('#result-apply-injury') }
  _resultAdditionalWoundingModifierText(html) { return html.find('#result-type-add') }
  _resultModifierFootnote(html) { return html.find('#modifier-footnote-wrapper') }
  _isVulnerableCheckbox(html) { return html.find('#vulnerable') }
  _allVulnerabilityRadios(html) { return html.find('[name="vulnerability"]') }
  _vulnerabilityRadioWithValue(html, value) { return html.find(`[name="vulnerability"][value="vulnerability-${value}"]`) }
  _isHardenedCheckbox(html) { return html.find('#hardened') }
  _allHardenedRadios(html) { return html.find('input[type="radio"][name="hardened"]') }
  _hardenedRadioWithValue(html, value) { return html.find(`input[type='radio'][name='hardened'][value='hardened-${value}']`) }
  _injuryToleranceRadioWithValue(html, value) { return html.find(`input[type='radio'][name='injury-tolerance'][value='${value}']`) }

  _parseIntFrom(value, defaultValue = 0) {
    if (value === null || value === 'undefined' || value === '') return defaultValue
    return parseInt(value)
  }

  _parseFloatFrom(value, defaultValue = 0) {
    if (value === null || value === 'undefined' || value === '') return defaultValue
    return parseFloat(value)
  }

  /**
   * 
   */
  _updateModelFromIntInput(element, property, html) {
    this._calculator[property] = this._parseIntFrom(element.val())

    // removes leading zeros or replaces blank with zero
    if (element.val() !== this._calculator[property].toString())
      element.val(this._calculator[property])

    this.updateUI(html)
  }

  _updateModelFromFloatInput(element, property, html) {
    this._calculator[property] = this._parseFloatFrom(element.val())

    // removes leading zeros or replaces blank with zero
    if (element.val() !== this._calculator[property].toString())
      element.val(this._calculator[property])

    this.updateUI(html)
  }

  _updateModelFromRadioValue(element, property, html) {
    if (element.is(':checked')) {
      this._calculator[property] = element.val()
      this.updateUI(html)
    }
  }

  _updateModelFromBooleanElement(element, property, html) {
    this._calculator[property] = element.is(':checked')
    this.updateUI(html)
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
    this._basicDamageInput(html).on('change', ev =>
      this._updateModelFromIntInput($(ev.currentTarget), "basicDamage", html))

    this._directlyApplyPublicly(html).on('click', () => this.submitDirectApply(true))
    this._directlyApplySecretly(html).on('click', () => this.submitDirectApply(false))

    // Set Apply To dropdown value.
    // When dropdown changes, update the calculator and refresh GUI.
    this._applyToDropdown(html).val(this._calculator.applyTo)
    this._applyToDropdown(html).on('change', ev => {
      this._calculator.applyTo = $(ev.currentTarget).find('option:selected').val()
      this.updateUI(html)
    })

    // ==== Hit Location and DR ====
    // When user-entered DR input changes, update the calculator.
    this._userEnteredDRInput(html).on('change', ev =>
      this._updateModelFromIntInput($(ev.currentTarget), "userEnteredDR", html))

    // Find the default hit location and check the appropriate radio button.
    if (this._calculator.hitLocation === 'Random') this._randomizeHitLocation(html)

    // When the 'random' button is clicked, update the hit location.
    this._randomizeHitLocationButton(html).on('click', async () => this._randomizeHitLocation(html))

    // When a new Hit Location is selected, calculate the new results and update the UI.
    this._allHitLocationRadioButtons(html).click(ev =>
      this._updateModelFromRadioValue($(ev.currentTarget), 'hitLocation', html))

    // ==== Type and Wounding Modifiers ====
    this._allDamageTypeRadioButtons(html).click(ev => {
      if ($(ev.currentTarget).is(':checked')) {
        this._calculator.damageType = $(ev.currentTarget).val()
        this.updateUI(html)
      }
    })

    this._damageTypeButtonWithValue(html, this._calculator.damageType).prop('checked', true)

    this._userEnteredWoundModifierInput(html).on('change', ev =>
      this._updateModelFromFloatInput($(ev.currentTarget), "userEnteredWoundModifier", html))

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    this._additionalWoundModifierInput(html).on('change', ev =>
      this._updateModelFromFloatInput($(ev.currentTarget), "additionalWoundModifier", html))

    // ==== Tactical Rules ====
    // apply armor divisor
    this._armorDivisorCheckbox(html).click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'useArmorDivisor', html))

    this._bluntTraumaCheckbox(html).click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'useBluntTrauma', html))

    this._locationWoundModifierCheckbox(html).click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'useLocationModifiers', html))

    // ==== Other situations ====
    this._rangeHalfDamageCheckbox(html).click(ev =>
      this._updateModelFromBooleanElement($(ev.currentTarget), 'isRangedHalfDamage', html))

    this._isVulnerableCheckbox(html).click(ev => {
      let checked = $(ev.currentTarget).is(':checked')
      // enable the radio buttons
      this._allVulnerabilityRadios(html).prop('disabled', !checked)
      this._calculator.isVulnerable = checked
      this.updateUI(html)
    })

    this._allVulnerabilityRadios(html).click(ev => {
      if ($(ev.currentTarget).is(':checked')) {
        let string = $(ev.currentTarget).val()
        let value = parseFloat(string.replace('vulnerability-', ''))
        this._calculator.vulnerabilityMultiple = value
        this.updateUI(html)
      }
    })

    this._isHardenedCheckbox(html).click(ev => {
      let checked = $(ev.currentTarget).is(':checked')
      // enable the radio buttons
      this._allHardenedRadios(html).prop('disabled', !checked)
      this._calculator.isHardenedDR = checked
      this.updateUI(html)
    })

    this._allHardenedRadios(html).click(ev => {
      if ($(ev.currentTarget).is(':checked')) {
        let string = $(ev.currentTarget).val()
        let value = parseFloat(string.replace('hardened-', ''))
        this._calculator.hardenedDRLevel = value
        this.updateUI(html)
      }
    })

    html.find('#injury-tolerance').click(ev => {
      let checked = $(ev.currentTarget).is(':checked')
      this._calculator.isInjuryTolerance = checked
      this.updateUI(html)
    })

    html.find('input[type="radio"][name="injury-tolerance"]').click(ev => {
      if ($(ev.currentTarget).is(':checked')) {
        let string = $(ev.currentTarget).val()
        this._calculator.injuryToleranceType = string
        this.updateUI(html)
      }
    })

    this._injuryToleranceRadioWithValue(html, this._calculator.injuryToleranceType).prop('checked', true)

    // ==== Results ====
    this._injuryApplyPublicly(html).click(ev => this.submitInjuryApply(ev, true))
    this._injuryApplySecretly(html).click(ev => this.submitInjuryApply(ev, false))

    this.updateUI(html)
  }

  /**
   * Ask the calculator to randomly select a hit location, and return the roll used.
   * @param {*} html 
   */
  async _randomizeHitLocation(html) {
    let roll3d = this._calculator.randomizeHitLocation()

    if (isNiceDiceEnabled()) {
      game.dice3d.showForRoll(roll3d).then(display => this.updateUI(html))
    } else {
      game.audio.play({
        src: CONFIG.sounds.dice,
        volume: 1.0,
        autoplay: true,
        loop: false
      }, true)
      this.updateUI(html)
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
   * @param {*} html 
   */
  updateUI(html) {
    // set up the Damage Type and Wounding Modifiers table
    // {
    //   let insertPoint = html.find('section#wound-modifier-table')
    //   insertPoint.empty()
    //   this._allDamageTypeRadioButtons(html).off('click')
    //   this._renderTemplate('dialog-wounding-modifier-table.html', { CALC: this._calculator }).then(section => {
    //     insertPoint.append(section)

    //     // Set the Damage Type radio button.
    //     this._allDamageTypeRadioButtons(html).click(ev => {
    //       if ($(ev.currentTarget).is(':checked')) {
    //         this._calculator.damageType = $(ev.currentTarget).val()
    //         this.updateUI(html)
    //       }
    //     })

    //     this._damageTypeButtonWithValue(html, this._calculator.damageType).prop('checked', true)
    //   })
    // }

    this._hitLocationWithValue(html, this._calculator.hitLocation).prop('checked', true)

    this._pointsToApplyInput(html).val(this._calculator.pointsToApply)
    this._armorDivisorCheckbox(html).prop('checked', this._calculator.useArmorDivisor)
    this._bluntTraumaCheckbox(html).prop('checked', this._calculator.useBluntTrauma)
    this._locationWoundModifierCheckbox(html).prop('checked', this._calculator.useLocationModifiers)
    this._isVulnerableCheckbox(html).prop('checked', this._calculator.isVulnerable)
    this._vulnerabilityRadioWithValue(html, this._calculator.vulnerabilityMultiple).prop('checked', true)
    this._isHardenedCheckbox(html).prop('checked', this._calculator.isHardenedDR)
    this._hardenedRadioWithValue(html, this._calculator.hardenedDRLevel).prop('checked', true)
    this._allHardenedRadios(html).prop('disabled', !this._calculator.isHardenedDR)

    html.find('[name="result-basic"]').text(this._calculator.basicDamage)
    html.find('[name="result-dr"]').text(this._calculator.DR)
    html.find('[name="result-hitlocation"]').text(this._calculator.hitLocation)
    html.find('[name="result-penetrating"]').text(this._calculator.penetratingDamage)
    html.find('[name="result-apply-to"]').text(this._calculator.applyTo)
    html.find('[name="result-totalmod"]').text(this.fractionalize(this._calculator.totalWoundingModifier, 2))
    html.find('[name="result-modifier"]').text(this._calculator.woundingModifier)
    html.find('[name="result-injury"]').text(this._calculator.injury)
    html.find('[name="result-effective-dr"]').text(this._calculator.effectiveDR)
    html.find('[name="result-halfdamage"]').text(this._calculator.effectiveDamage)

    html.find('[name="result-addmods"]').text(this._getAdditionalWoundingModifierText())

    this._toggleVisibility(this._resultAdditionalWoundingModifierText(html),
      this._calculator.hasAdditionalWoundingModifiers)

    this._toggleVisibility(this._resultModifierFootnote(html), this._calculator.isAdjustedForHitLocation)

    // Always remove the effective damage result; if necessary they will be re-added with potentially new values.
    // if necessary, add the effective damage result row.
    html.find('[name="result-effective-dmg"]').remove()
    if (this._calculator.isRangedHalfDamage) {
      let insertPoint = html.find('#result-dr')[0]
      this._renderTemplate('result-ranged12d.html', this._calculator).then(html => {
        $(html).insertBefore(insertPoint)
      })
    }

    // add the Diffuse footnote if necessary
    {
      let insertPoint = html.find('[name="result-penetrating-footnote"]')
      insertPoint.empty()
      if (this._calculator.maxInjuryForDiffuse) {
        insertPoint.append(` (Max: ${this._calculator.maxInjuryForDiffuse})* <span class="pdflink">B380</span>`)
        $(insertPoint).find('.pdflink').click(async ev => game.GURPS.handleOnPdf(ev))
      }
    }

    // Always remove the effective DR results; if necessary they will be re-added with potentiatlly new values.
    // if necessary, add the effective DR result row.
    html.find('[name="result-divisor"]').remove()
    if (this._calculator.useArmorDivisor && this._calculator.armorDivisor !== 0) {
      this.insertArmorDivisor(html, html.find('#result-penetrating'))
    }

    html.find('[name="flexible-armor"]').remove()
    if (this._calculator.useBluntTrauma) {
      // add the Flexible Armor checkbox/textfield combo
      this.insertBluntTrauma(html, html.find('#specials-insert-point'))
    }

    html.find('[name="result-effect"]').remove()
    let insertPoint = html.find('#result-effects')
    this._populateResultEffects(html, insertPoint).then(() => {
      insertPoint.find('[name="result-effect"] .pdflink').click(async ev => game.GURPS.handleOnPdf(ev))
      insertPoint.find('button').click(async ev => this._handleEffectButtonClick(ev))
    })

    html.find('[name="result-location-max"]').remove()
    if (this._calculator.isInjuryReducedByLocation) {
      let insertPoint = html.find('#result-injury-total')
      this._renderTemplate('result-crippled.html', this._calculator).then(html => {
        $(html).insertAfter(insertPoint)
      })
    }

    this.render(false)
  }

  fractionalize(value, digits, prefix = '') {
    if (typeof value == 'number') {
      let wholeNumber = Math.floor(value)
      if (wholeNumber === value) {
        return prefix + value
      }

      return prefix + parseFloat(value.toFixed(digits))
    }
    return value
  }

  /**
   * This method determines the third column of the ADD Results table for Wounding Modifiers.
   */
  _getAdditionalWoundingModifierText() {
    let add = (this._calculator.additionalWoundModifier) ? ` + ${this._calculator.additionalWoundModifier} add` : ''
    let vul = (this._calculator.isVulnerable) ? ` × ${this._calculator.vulnerabilityMultiple} (Vulnerable)` : ''

    if (vul.length + add.length === 0)
      return this._calculator.damageType

    if (vul.length === 0)
      return `${this._calculator.damageType}${add}`

    if (add.length === 0)
      return `${this._calculator.damageType}${vul}`

    return `(${this._calculator.damageType}${add})${vul}`.trim()
  }

  async _renderTemplate(template, data) {
    return renderTemplate('systems/gurps/templates/apply-damage/' + template, data)
  }

  async _handleEffectButtonClick(ev) {
    console.log(ev)
    let stringified = ev.currentTarget.attributes['data-struct'].value
    let object = JSON.parse(stringified)
    console.log(object)

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
      message = await this._renderTemplate('chat-knockback.html',
        {
          name: this.actor.data.name,
          yards: object.amount,
          dxCheck: object.modifier === 0 ? 'DX' : `DX-${object.modifier}`,
          acroCheck: object.modifier === 0 ? 'S:Acrobatics' : `S:Acrobatics-${object.modifier}`,
          judoCheck: object.modifier === 0 ? 'S:Judo' : `S:Judo-${object.modifier}`
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
   * Add the result effect lines to the list
   * @param {*} html 
   * @param {*} insertPoint 
   */
  async _populateResultEffects(html, insertPoint) {
    if (this._calculator.effects.length > 0) {
      for (let effect of this._calculator.effects) {
        let element = await this._renderTemplate(`effect-${effect.type}.html`, effect)
        insertPoint.append(element)
      }
    }
  }

  /**
   * Add the presentation for the flexible armor/blunt trauma result line.
   * @param {*} html 
   * @param {*} insertPoint 
   */
  insertBluntTrauma(html, insertPoint) {
    this._renderTemplate('dialog-flexible-armor-checkbox.html', {
      classText: !!this._calculator._bluntTrauma ? 'user-entered' : '',
      effectiveBluntTrauma: this._calculator.effectiveBluntTrauma,
      isEnabled: this._calculator.isFlexibleArmor
    }).then((element) => {
      insertPoint.append(element)

      html.find('#blunt-trauma-field button').click(() => {
        this._calculator.bluntTrauma = null
        this.updateUI(html)
      })

      // configure the textfield
      let textInput = html.find('#blunt-trauma')
      // restrict entry to digits only
      // TODO - may remove this when the template is 'unified'
      textInput.inputFilter(value => digitsOnly.test(value))
      // on change, update blunt trauma
      textInput.on('change', ev => {
        let currentValue = $(ev.currentTarget).val()
        this._calculator.bluntTrauma = (currentValue === '' || currentValue === this._calculator.calculatedBluntTrauma)
          ? null
          : parseFloat(currentValue)
        this.updateUI(html)
      })

      // configure checkbox
      let checkbox = html.find('#flexible-armor')
      checkbox.prop('checked', this._calculator.isFlexibleArmor)
      checkbox.click(ev => {
        this._calculator.isFlexibleArmor = $(ev.currentTarget).is(':checked')
        this.updateUI(html)
      })
    })

  }

  /**
   * Add the presentation for Armor Divisor result line.
   * @param {*} html 
   * @param {*} insertPoint 
   */
  insertArmorDivisor(html, insertPoint) {
    let armorDivisorText = `${this._calculator.armorDivisor}`
    if (this._calculator.isHardenedDR) {
      armorDivisorText = `(${this._calculator.effectiveArmorDivisor} = (${this._calculator.armorDivisor}) w/Hard–${this._calculator.hardenedDRLevel})`
    }

    this._renderTemplate(`result-armor-divisor.html`, {
      effectiveDR: this._calculator.effectiveDR,
      DR: this._calculator.DR,
      armorDivisor: armorDivisorText,
      // if DR is zero and we have a fractional divisor, add the footnote
      showFootnote: this._calculator.DR === 0 && this._calculator.armorDivisor < 1
    }).then((html) => {
      $(html).insertBefore(insertPoint)
      // enable the PDFLink on the footnote
      $(html).find('#divisor-footnote').click(async ev => game.GURPS.handleOnPdf(ev))
    })
  }

  /**
   * Handle clicking on the Apply (Publicly or Secretly) buttons.
   * @param {*} html 
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  submitDirectApply(publicly) {
    let injury = this._calculator.basicDamage
    let type = this._calculator.applyTo
    this.resolveInjury(injury, type, publicly)
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
    this.resolveInjury(injury, type, publicly, clone)
  }

  /**
   * Handle the actual loss of HP or FP on the actor and display the results in the chat.
   * @param {*} injury 
   * @param {*} type 
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  resolveInjury(injury, type, publicly, results = null) {
    let current = type === 'FP' ? this._calculator.FP.value : this._calculator.HP.value

    let attackingActor = game.actors.get(this._calculator.attacker)

    let data = {
      id: this._generateUniqueId(),
      basicDamage: injury,
      attacker: (attackingActor) ? attackingActor.data.name : 'Unknown',
      defender: this.actor.data.name,
      current: current,
      newvalue: current - injury,
      type: type,
      resultsTable: results
    }

    if (type === 'FP') {
      this.actor.update({ "data.FP.value": data.newvalue })
    } else {
      this.actor.update({ "data.HP.value": data.newvalue })
    }

    this._renderTemplate('chat-damage-results.html', data).then(html => {
      const speaker = { alias: game.user.data.name, _id: game.user._id }
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
      this.close()
    })
  }

  _generateUniqueId() {
    let now = new Date().getTime()

    if (GURPS.uniqueId >= now) {
      now = GURPS.uniqueId + 1
    }
    GURPS.uniqueID = now
    return now
  }
}