'use strict'

import { isNiceDiceEnabled } from './utilities.js'
import { GURPS } from '../module/gurps.js'
import * as settings from './miscellaneous-settings.js'
import { digitsAndDecimalOnly, digitsOnly } from './jquery-helper.js'

const standardDialogHeight = 800
const simpleDialogHeight = 130

/*   Tactical Combat */
let tacticalOptions = [
  // {
  //   id: 'applyshock',
  //   apply: true,
  //   label: 'Apply Shock condition',
  //   ref: 'B419'
  // },
  // {
  //   id: 'woundmods',
  //   apply: true,
  //   label: 'Use per-location wounding modifiers',
  //   ref: 'B552'
  // },
  // {
  //   id: 'maxdamage',
  //   apply: true,
  //   label: 'Enforce max damage for location',
  //   ref: 'B552'
  // },
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
  // {
  //   id: 'unliving',
  //   apply: false,
  //   label: 'Unliving',
  //   ref: 'B380'
  // },
  // {
  //   id: 'homogenous',
  //   apply: false,
  //   label: 'Homogenous',
  //   ref: 'B380'
  // },
  // {
  //   id: 'diffuse',
  //   apply: false,
  //   label: 'Diffuse',
  //   ref: 'B380'
  // },
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
      template: 'systems/gurps/templates/damage/apply-damage-dialog.html',
      resizable: true,
      minimizable: false,
      width: 800,
      height: (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE) ? simpleDialogHeight : standardDialogHeight),
      title: 'Apply Damage Calculator'
    });
  }

  getData() {
    let data = super.getData()
    data.actor = this.actor
    data.CALC = this._calculator
    data.tacticalOptions = tacticalOptions
    data.otherSituations = otherSituations
    data.woundingModifiers = GURPS.woundModifiers
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
  _allDamageTypeRadioButtons(html) { return html.find('input[name="woundmodifier"]') }
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

  _parseIntFrom(value, defaultValue) {
    if (value === null || value === 'undefined' || value === '') return defaultValue
    return parseInt(value)
  }

  _parseFloatFrom(value, defaultValue) {
    if (value === null || value === 'undefined' || value === '') return defaultValue
    return parseFloat(value)
  }

  /*
   * Wire the logic to the UI.
   */
  activateListeners(html) {
    super.activateListeners(html)

    // Activate all PDF links
    html.find('.pdflink').click(async ev => game.GURPS.handleOnPdf(ev))
    // this.onClickPdf);

    // If this isSimpleDialog, hide the advanced panel.
    if (this.isSimpleDialog) {
      this._advancedPanel(html).addClass('invisible')
    }
    else {
      this._advancedPanel(html).removeClass('invisible')
    }

    // ==== Directly Apply ====
    // Restrict the basicDamage input to digits only.
    // If the basicDamage text field is changed, update the calculator.
    this._basicDamageInput(html).inputFilter(value => digitsOnly.test(value))
    this._basicDamageInput(html).on('change paste keyup', () => {
      this._calculator.basicDamage = this._parseIntFrom(this._basicDamageInput(html).val(), 0)
      this.updateUI(html)
    })

    this._directlyApplyPublicly(html).on('click', () => this.submitDirectApply(true))
    this._directlyApplySecretly(html).on('click', () => this.submitDirectApply(false))

    // Set Apply To dropdown value.
    // When dropdown changes, update the calculator and refresh GUI.
    this._applyToDropdown(html).find(`[value = '${this._calculator.applyTo}']`)[0].selected = true
    this._applyToDropdown(html).on('change', () => {
      this._calculator.applyTo = this._applyToDropdown(html).find('option:selected')[0].value
      this.updateUI(html)
    })

    // ==== Hit Location and DR ====
    // Restrict the user-entered DR input value to digits only.
    // When user-entered DR input changes, update the calculator.
    this._userEnteredDRInput(html).inputFilter(value => digitsOnly.test(value))
    this._userEnteredDRInput(html).on('change paste keyup', () => {
      this._calculator.userEnteredDR = this._parseIntFrom(this._userEnteredDRInput(html).val(), 0)
      this.updateUI(html)
    })

    // Find the default hit location and check the appropriate radio button.
    if (this._calculator.hitLocation === 'Random') {
      this.processRandomHitLocation(html)
    }

    // When the 'random' button is clicked, update the hit location.
    this._randomizeHitLocationButton(html).on('click', async () => this.processRandomHitLocation(html))

    // When a new Hit Location is selected, calculate the new results and update the UI.
    this._allHitLocationRadioButtons(html).click(ev => {
      if ($(ev.currentTarget).is(':checked')) {
        this._calculator.hitLocation = $(ev.currentTarget).val()
        this.updateUI(html)
      }
    })

    // ==== Type and Wounding Modifiers ====
    // Set the Damage Type radio button.
    this._allDamageTypeRadioButtons(html).click(ev => {
      if ($(ev.currentTarget).is(':checked')) {
        this._calculator.damageType = $(ev.currentTarget).val()
        this.updateUI(html)
      }
    })

    this._userEnteredWoundModifierInput(html).inputFilter(value => digitsAndDecimalOnly.test(value))
    this._userEnteredWoundModifierInput(html).on('change paste keyup', ev => {
      this._calculator.userEnteredWoundModifier = this._parseFloatFrom($(ev.currentTarget).val(), 0)
      this.updateUI(html)
    })

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    this._additionalWoundModifierInput(html).inputFilter(value => digitsAndDecimalOnly.test(value))
    this._additionalWoundModifierInput(html).on('change paste keyup', ev => {
      this._calculator.additionalWoundModifier = this._parseFloatFrom($(ev.currentTarget).val(), 0)
      this.updateUI(html)
    })

    // ==== Tactical Rules ====
    // apply armor divisor
    this._armorDivisorCheckbox(html).click(ev => {
      this._calculator.useArmorDivisor = $(ev.currentTarget).is(':checked')
      this.updateUI(html)
    })

    this._bluntTraumaCheckbox(html).click(ev => {
      this._calculator.useBluntTrauma = $(ev.currentTarget).is(':checked')
      this.updateUI(html)
    })

    this._locationWoundModifierCheckbox(html).click(ev => {
      this._calculator.useLocationModifiers = $(ev.currentTarget).is(':checked')
      this.updateUI(html)
    })

    this._rangeHalfDamageCheckbox(html).click(ev => {
      this._calculator.isRangedHalfDamage = $(ev.currentTarget).is(':checked')
      this.updateUI(html)
    })

    // ==== Results ====
    this._injuryApplyPublicly(html).on('click', () => this.submitInjuryApply(true))
    this._injuryApplySecretly(html).on('click', () => this.submitInjuryApply(false))

    this.updateUI(html)
  }

  /**
   * Ask the calculator to randomly select a hit location, and return the roll used.
   * @param {*} html 
   */
  async processRandomHitLocation(html) {
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
    this._hitLocationWithValue(html, this._calculator.hitLocation).prop('checked', true)
    this._damageTypeButtonWithValue(html, this._calculator.damageType).prop('checked', true)
    this._pointsToApplyInput(html).val(this._calculator.pointsToApply)
    this._armorDivisorCheckbox(html).prop('checked', this._calculator.useArmorDivisor)
    this._bluntTraumaCheckbox(html).prop('checked', this._calculator.useBluntTrauma)
    this._locationWoundModifierCheckbox(html).prop('checked', this._calculator.useLocationModifiers)

    html.find('[name="result-basic"]').text(this._calculator.basicDamage)
    html.find('[name="result-dr"]').text(this._calculator.DR)
    html.find('[name="result-hitlocation"]').text(this._calculator.hitLocation)
    html.find('[name="result-penetrating"]').text(this._calculator.penetratingDamage)
    html.find('[name="result-apply-to"]').text(this._calculator.applyTo)
    html.find('[name="result-totalmod"]').text(this._calculator.totalWoundingModifier)
    html.find('[name="result-addmods"]').text(this._calculator.additionalWoundModifier)
    html.find('[name="result-modifier"]').text(this._calculator.woundingModifier)
    html.find('[name="result-type"]').text(this._calculator.damageType)
    html.find('[name="result-injury"]').text(this._calculator.injury)
    html.find('[name="result-effective-dr"]').text(this._calculator.effectiveDR)
    html.find('[name="result-halfdamage"]').text(this._calculator.effectiveDamage)

    this._toggleVisibility(this._resultAdditionalWoundingModifierText(html), this._calculator.additionalWoundModifier > 0)
    this._toggleVisibility(this._resultModifierFootnote(html), this._calculator.isAdjustedForHitLocation)

    // Always remove the effective damage result; if necessary they will be re-added with potentiatlly new values.
    // if necessary, add the effective damage result row.
    html.find('[name="result-effective-dmg"]').remove()
    if (this._calculator.isRangedHalfDamage) {
      let insertPoint = html.find('#result-dr')[0]
      $(`<div name='result-effective-dmg'>RANGED 1/2D</div>`).insertBefore(insertPoint)
      $(`<div name='result-effective-dmg'>${this._calculator.effectiveDamage}</div>`).insertBefore(insertPoint)
      $(`<div name='result-effective-dmg'>(${this._calculator.basicDamage} &divide; 2)</div>`).insertBefore(insertPoint)
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
    for (let effect of this._calculator.effects) {
      let template = `systems/gurps/templates/damage/apply-damage-effect-${effect.type}.html`
      renderTemplate(template, effect).then(html => {
        insertPoint.append(html);
      })
    }
  }

  /**
   * Add the presentation for the flexible armor/blunt trauma result line.
   * @param {*} html 
   * @param {*} insertPoint 
   */
  insertBluntTrauma(html, insertPoint) {
    let classText = !!this._calculator._bluntTrauma ? 'user-entered' : ''

    insertPoint.append($(`<input id='flexible-armor' name='flexible-armor' type='checkbox' value='flexible-armor'>`),
      $(`<label name='flexible-armor' for='flexible-armor'>Flexible Armor, Blunt Trauma:</label>`),
      $(`<div id='blunt-trauma-field' name='flexible-armor' class='with-button'>
  <input id='blunt-trauma' class='${classText}' value='${this._calculator.effectiveBluntTrauma}' type='number' ${this._calculator.isFlexibleArmor ? '' : 'disabled'}>
  <button name='clear'><span class='fas fa-times-circle'></button>
</div>`))

    html.find('#blunt-trauma-field button').click(() => {
      this._calculator.bluntTrauma = null
      this.updateUI(html)
    })

    // configure the textfield
    let textInput = html.find('#blunt-trauma')
    // restrict entry to digits only
    textInput.inputFilter(value => digitsOnly.test(value))
    // on change, update blunt trauma
    textInput.on('change', ev => {
      let currentValue = $(ev.currentTarget).val()
      this._calculator.bluntTrauma = (currentValue === '' || currentValue === this._calculator.calculatedBluntTrauma)
        ? null
        : parseFloat(currentValue)
      this.updateUI(html)
    })
    // textInput.click(ev => ev.preventDefault())

    // configure checkbox
    let checkbox = html.find('#flexible-armor')
    checkbox.prop('checked', this._calculator.isFlexibleArmor)
    checkbox.click(ev => {
      this._calculator.isFlexibleArmor = $(ev.currentTarget).is(':checked')
      this.updateUI(html)
    })
  }

  /**
   * Add the presentation for Armor Divisor result line.
   * @param {*} html 
   * @param {*} element 
   */
  insertArmorDivisor(html, element) {
    // if DR is zero and we have a fractional divisor, add the footnote
    let footnote = ''
    if (this._calculator.DR === 0 && this._calculator.armorDivisor < 1)
      footnote = '* <span id="divisor-footnote" class="pdflink">B379</span>'

    let label = `<div name='result-divisor'>DR W/DIVISOR</div>`
    let value = `<div name='result-divisor'>${this._calculator.effectiveDR}</div>`
    let description = `<div name='result-divisor'><span>(${this._calculator.DR} &divide; ${this._calculator.armorDivisor})${footnote}</span></div>`

    $(label).insertBefore(element)
    $(value).insertBefore(element)
    $(description).insertBefore(element)

    // enable the PDFLink on the footnote
    html.find('#divisor-footnote').click(async ev => game.GURPS.handleOnPdf(ev))
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
  submitInjuryApply(publicly) {
    let injury = this._calculator.pointsToApply
    let type = this.damageType === 'fat' ? 'FP' : 'HP'
    this.resolveInjury(injury, type, publicly)
  }

  /**
   * Handle the actual loss of HP or FP on the actor and display the results in the chat.
   * @param {*} injury 
   * @param {*} type 
   * @param {boolean} publicly - if true, display to everyone; else display to GM and owner.
   */
  resolveInjury(injury, type, publicly) {
    let current = type === 'FP' ? this._calculator.FP.value : this._calculator.HP.value

    let data = {
      basicDamage: injury,
      attacker: game.actors.get(this._calculator.attacker).data.name,
      defender: this.actor.data.name,
      current: current,
      newvalue: current - injury,
      type: type
    }

    if (type === 'FP') {
      this.actor.update({ "data.FP.value": data.newvalue })
    } else {
      this.actor.update({ "data.HP.value": data.newvalue })
    }

    renderTemplate('systems/gurps/templates/damage/direct-damage-results-chat.html', data).then(html => {
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

      CONFIG.ChatMessage.entityClass.create(messageData);
      this.close()
    })
  }
}


/*
  Crippling injury:

  Limb (arm, leg, wing, striker, or prehensile tail): Injury over HP/2.
  Extremity (hand, foot, tail, fin, or extraneous head): Injury over HP/3.
  Eye: Injury over HP/10.
 */
const bluntTraumaTypes = ['cr', 'cut', 'imp', 'pi-', 'pi', 'pi+', 'pi++']
const limbs = ['Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
const extremities = ['Hand', 'Foot']
const head = ['Skull', 'Face', 'Eye']
const piercing = ['pi-', 'pi', 'pi+', 'pi++']
const crippleableLocations = [...limbs, ...extremities, 'Eye']

export class DamageCalculator {
  constructor(defender, damageData) {
    this._useBluntTrauma = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BLUNT_TRAUMA)
    this._useLocationModifiers = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_LOCATION_MODIFIERS)
    this._useArmorDivisor = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_APPLY_DIVISOR)

    this._defender = defender
    this._attacker = damageData.attacker
    this._damageType = damageData.damageType
    this._armorDivisor = damageData.armorDivisor
    this._basicDamage = damageData.damage

    this._applyTo = (this._damageType === 'fat') ? 'FP' : 'HP'

    this._hitLocation = this._defender.defaultHitLocation
    this._userEnteredDR = 0

    // the wounding modifier selected using the radio buttons
    this._userEnteredWoundModifier = 1
    this._additionalWoundModifier = 0
    this._isWoundModifierAdjustedForLocation = false

    this._isRangedHalfDamage = false
    this._isFlexibleArmor = false
    this._bluntTrauma = null
  }

  get attacker() { return this._attacker }
  get HP() { return this._defender.data.data.HP }
  get FP() { return this._defender.data.data.FP }
  get attributes() { return this._defender.data.data.attributes }
  get allHitLocations() { return this._defender.data.data.hitlocations }
  get hitLocationsWithDR() { return this._defender.hitLocationsWithDR }

  // figure out the current DR modified by armor divisor, if necessary
  get effectiveDR() {
    let dr = this.DR
    if (this._useArmorDivisor && this._armorDivisor && this._armorDivisor !== 0) {
      let tempDR = (this._armorDivisor < 1 && dr === 0) ? 1 : dr
      return Math.floor(tempDR / this._armorDivisor)
    }
    return dr
  }

  // return the DR indicated by the Hit Location
  get DR() {
    if (this._hitLocation === 'Random') return 0

    if (this._hitLocation === 'User Entered') return this._userEnteredDR

    if (this._hitLocation === 'Large-Area') {
      let lowestDR = Number.POSITIVE_INFINITY
      let torsoDR = 0

      // find the location with the lowest DR
      for (let value of this._defender.hitLocationsWithDR.filter(it => it.roll.length > 0)) {
        if (value.dr < lowestDR) lowestDR = value.dr
        if (value.where === 'Torso') torsoDR = value.dr
      }
      // return the average of torso and lowest dr
      return Math.ceil((lowestDR + torsoDR) / 2)
    }

    return this._defender.hitLocationsWithDR.filter(it => it.where === this._hitLocation).map(it => it.dr)[0]
  }

  get woundingModifier() {
    if (this._damageType === 'none') return 1
    if (this._damageType === 'User Entered') return this._userEnteredWoundModifier

    if (this._useLocationModifiers) {
      this._isWoundModifierAdjustedForLocation = true
      switch (this._hitLocation) {
        case 'Vitals':
          if (['imp', ...piercing].includes(this._damageType))
            return 3;
          // TODO if (this.isTightBeamAttack() && this.damageType === 'burn') 
          //   return 2;
          break;

        case 'Skull':
        case 'Eye':
          if (this._damageType !== 'tox')
            return 4;
          break;

        case 'Face':
          if (this._damageType === 'cor')
            return 1.5;
          break;

        case 'Neck':
          if (['cr', 'cor'].includes(this._damageType))
            return 1.5;
          if (this._damageType === 'cut')
            return 2;
          break;

        case 'Right Arm':
        case 'Left Arm':
        case 'Right Leg':
        case 'Left Leg':
        case 'Hand':
        case 'Foot':
          if (['imp', 'pi+', 'pi++'].includes(this._damageType))
            return 1;
          break;
      }
    }

    this._isWoundModifierAdjustedForLocation = false
    return GURPS.woundModifiers[this._damageType].multiplier
  }

  get effectiveDamage() {
    return this._isRangedHalfDamage ? Math.floor(this._basicDamage / 2) : this._basicDamage
  }

  get penetratingDamage() { return Math.max(0, this.effectiveDamage - this.effectiveDR) }

  get totalWoundingModifier() { return this.woundingModifier + this._additionalWoundModifier }

  get calculatedBluntTrauma() {
    if (this._basicDamage === 0 || this.penetratingDamage > 0) return 0
    if (!bluntTraumaTypes.includes(this._damageType)) return 0;
    if (this._damageType === 'cr') return Math.floor(this._basicDamage / 5)
    return Math.floor(this._basicDamage / 10)
  }

  /**
   * Injury is equal to penetrating damage x total wounding modifiers, to a max of 
   * the amount needed to cripple a limb/extremity.
   */
  get injury() {
    let injury = Math.floor(this.penetratingDamage * this.totalWoundingModifier)
    if (this.isCripplingInjury) {
      injury = this.locationMaxHP
    }
    return injury
  }

  /**
   * Actual number of HP to apply is the amount of injury, or the effective blunt trauma.
   */
  get pointsToApply() {
    return (this.injury === 0) ? this._isFlexibleArmor ? this.effectiveBluntTrauma : 0 : this.injury
  }

  get effectiveBluntTrauma() {
    return this._bluntTrauma === null ? this.calculatedBluntTrauma : this._bluntTrauma
  }

  get calculatedShock() {
    let factor = Math.max(1, Math.floor(this.HP.max / 10))
    let shock = Math.min(4, Math.floor(this.pointsToApply / factor))
    return shock
  }

  get isMajorWound() { return (this.pointsToApply > (this.HP.max / 2)) }

  get penaltyToHTRollForStunning() {
    if (['Face', 'Vitals', 'Groin'].includes(this._hitLocation)) return -5;
    if (this.isMajorWound && ['Eye', 'Skull'].includes(this._hitLocation)) return -10;
    return 0
  }

  get isCripplingInjury() {
    if (crippleableLocations.includes(this._hitLocation)) {
      return this.pointsToApply > this.locationMaxHP
    }
    return false
  }

  get locationMaxHP() {
    if (limbs.includes(this._hitLocation)) return this.HP.max / 2
    if (extremities.includes(this._hitLocation)) return this.HP.max / 3
    if (this._hitLocation === 'Eye') return this.HP.max / 10
    return this.HP.max
  }

  get isKnockbackEligible() {
    if (this._damageType === 'cr' && this._basicDamage > 0)
      return true

    return (this._damageType === 'cut' && this._basicDamage > 0 && this.penetratingDamage === 0)
  }

  /*
   * let effect = {
   *   type: <string: 'shock' | 'majorwound' | 'headvitalshit' | 'crippling' | 'knockback'>, 
   *   modifier: <int: any penalty/modifier due to effect>,
   *   amount: <int: any associated value/level of effect>,
   *   detail: <string: any required information for effect>
   * }
   */
  get effects() {
    let _effects = []

    if (this.pointsToApply > 0) {

      if (this.calculatedShock > 0) {
        _effects.push({ type: 'shock', amount: this.calculatedShock })
      }

      if (this.isMajorWound) {
        _effects.push({ type: 'majorwound', modifier: this.penaltyToHTRollForStunning })
      } else if ([...head, 'Vitals'].includes(this._hitLocation) && (this.calculatedShock > 0)) {
        _effects.push({ type: 'HeadVitalsHit', modifier: this.penaltyToHTRollForStunning })
      }

      if (this.isCripplingInjury) {
        _effects.push({
          type: 'crippling',
          amount: Math.floor(this.locationMaxHP),
          detail: this._hitLocation
        })
      }
    }

    if (this.isKnockbackEligible) {
      let knockback = Math.floor(this._basicDamage / (this.attributes.ST.value - 2))
      if (knockback > 0) {
        let modifier = knockback - 1
        _effects.push({
          type: 'knockback',
          amount: knockback,
          modifier: modifier
        })
      }
    }

    console.log(this)
    return _effects
  }

  randomizeHitLocation() {
    let roll3d = new Roll('3d6')
    roll3d.roll()
    let total = roll3d.total

    this._hitLocation = this._defender.hitLocationsWithDR.filter(it => it.roll.includes(total))[0].where
    return roll3d
  }

  get basicDamage() { return this._basicDamage }
  set basicDamage(value) { this._basicDamage = value }

  get armorDivisor() { return this._armorDivisor }

  get damageType() { return this._damageType }
  set damageType(type) { this._damageType = type }

  get applyTo() { return this._applyTo }
  set applyTo(value) { this._applyTo = value }

  get hitLocation() { return this._hitLocation }
  set hitLocation(text) { this._hitLocation = text }

  get userEnteredDR() { return this._userEnteredDR }
  set userEnteredDR(value) { this._userEnteredDR = value }

  get useArmorDivisor() { return this._useArmorDivisor }
  set useArmorDivisor(value) { this._useArmorDivisor = value }

  /**
   * @param {number} value
   */
  set userEnteredWoundModifier(value) { this._userEnteredWoundModifier = value }

  get additionalWoundModifier() { return this._additionalWoundModifier }
  set additionalWoundModifier(value) { this._additionalWoundModifier = value }

  get useBluntTrauma() { return this._useBluntTrauma }
  set useBluntTrauma(value) { this._useBluntTrauma = value }

  get bluntTrauma() { return this._bluntTrauma }
  set bluntTrauma(value) { this._bluntTrauma = value }

  get isFlexibleArmor() { return this._isFlexibleArmor }
  set isFlexibleArmor(value) { this._isFlexibleArmor = value }

  get useLocationModifiers() { return this._useLocationModifiers }
  set useLocationModifiers(value) { this._useLocationModifiers = value }

  get isRangedHalfDamage() { return this._isRangedHalfDamage }
  set isRangedHalfDamage(value) { this._isRangedHalfDamage = value }
}