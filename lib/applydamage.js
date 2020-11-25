'use strict'

import { isNiceDiceEnabled } from '../lib/utilities.js'
import { GURPS } from '../module/gurps.js'
import * as settings from '../lib/miscellaneous-settings.js'


/*   Tactical Combat */
let tacticalOptions = [
  {
    id: 'applyshock',
    apply: true,
    label: 'Apply Shock condition',
    ref: 'B419'
  },
  {
    id: 'woundmods',
    apply: true,
    label: 'Use per-location wounding modifiers',
    ref: 'B552'
  },
  {
    id: 'maxdamage',
    apply: true,
    label: 'Enforce max damage for location',
    ref: 'B552'
  },
  {
    id: 'armordivisor',
    apply: true,
    label: 'Apply armor divisor',
    ref: 'B102'
  }
]

let otherSituations = [
  {
    id: 'unliving',
    apply: false,
    label: 'Unliving',
    ref: 'B380'
  },
  {
    id: 'homogenous',
    apply: false,
    label: 'Homogenous',
    ref: 'B380'
  },
  {
    id: 'diffuse',
    apply: false,
    label: 'Diffuse',
    ref: 'B380'
  },
]


/*
  Displays the Apply Damage Dialog and contains all the logic behind calculating
  and applying damage to a character.

  Takes as input a GurpsActor and DamageData.

  EXAMPLE DamageData:
    let damageData = {
      dice: '3d+5',
      modifiers: [
        '+2 damage (Strong Attack)',
        '+2 damage (Mighty Blow) *Cost 1FP'
      ],
      damage: 21,
      damageType: 'cut',
      isB378: false
    }
 */
export default class ApplyDamageDialog extends Application {
  constructor(actor, damageData, options = {}) {
    super(options)

    this.actor = actor
    this.damageData = damageData
    this.isSimpleDialog = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SIMPLE_DAMAGE)

    this._processRandomHitLocation = this.processRandomHitLocation.bind(this)

    // current Basic damage value
    this.basicDamage = damageData.damage

    // the current damage type value (string)
    this._damageType = damageData.damageType

    // the current value of the hitlocaation string
    this._location = 'Torso'

    // the current value of the "Enter DR:" text field
    this.userEnteredDR = 0

    // apply 1/2 Damage due to range
    this.isHalfDamage = false

    // the currently selected wound modifier (multiplier)
    this.selectedMod = 1

    // the current value of the 'Enter Modifier:' field
    this.userEnteredMod = 1

    // the currrent value of the 'Additional Modifier:' field
    this.additionalMods = 0

    // total wounding modifier
    this.totalWoundingModifier = this.additionalMods + this.selectedMod

    // total amount of HP to apply
    this.injury = 0


    // add the inputFilter method to jquery
    // Restricts input for the set of matched elements to the given inputFilter function.
    jQuery.fn.inputFilter = function (inputFilter) {
      return this.on("input keydown keyup mousedown mouseup select contextmenu drop", function () {
        if (inputFilter(this.value)) {
          this.oldValue = this.value
          this.oldSelectionStart = this.selectionStart
          this.oldSelectionEnd = this.selectionEnd
        } else if (this.hasOwnProperty('oldValue')) {
          this.value = this.oldValue
          this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd)
        } else {
          this.value = '';
        }
      })
    }
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['boilerplate', 'sheet', 'actor'],
      id: 'apply-damage-dialog',
      template: 'systems/gurps/templates/damage/apply-damage-dialog.html',
      resizable: true,
      minimizable: false,
      width: 800,
      height: 800,
      title: 'Apply Damage'
    });
  }

  getData() {
    let data = super.getData()

    data.actor = this.actor

    data.basicDamage = this.basicDamage
    data.hitLocationsWithDR = this.actor.getHitLocationsWithDR()
    // data.hitlocation = this.actor.getDefaultHitLocation()
    // data.dr = this.getHitLocationDR(data.hitlocation)
    data.selectedDR = this.userEnteredDR

    // data.applyTo = 'HP'
    data.woundingModifiers = GURPS.woundModifiers
    data.penetrating = 0
    data.injury = 0

    data.selectedMod = this.userEnteredMod
    data.additionalMods = this.additionalMods
    data.totalMods = this.userEnteredMod + this.additionalMods

    data.tacticalOptions = tacticalOptions
    data.otherSituations = otherSituations
    return data
  }


  get location() { return this._location }
  set location(text) {
    this._location = text
    this.updateAllValues()
  }

  get damageType() { return this._damageType }
  set damageType(type) {
    this._damageType = type
    this.updateAllValues()
  }

  updateAllValues() {
    this.dr = this.getHitLocationDR(this._location)
    this.halfDamage = this.isHalfDamage ? Math.floor(this.basicDamage / 2) : this.basicDamage
    this.penetrating = Math.max(0, this.halfDamage - this.dr)
    this.selectedMod = this.getCurrentWoundingModifier(this.damageType)
    this.totalWoundingModifier = this.selectedMod + this.additionalMods
    this.injury = Math.floor(this.penetrating * this.totalWoundingModifier)

    console.log(this.basicDamage)
    console.log(this.isHalfDamage)
    console.log(this.halfDamage)
    console.log(this.dr)
    console.log(this.penetrating)
    console.log(this.totalWoundingModifier)
    console.log(this.injury)
  }

  getHitLocationDR(location) {
    if (location === 'Random') return 0

    if (location === 'User Entered') return this.userEnteredDR

    let locations = this.actor.getHitLocationsWithDR()
    if (location === 'Large-Area') {
      // find the location with the lowest DR
      let lowestDR = Number.POSITIVE_INFINITY
      let torsoDR = 0
      for (const [key, value] of Object.entries(this.actor.data.data.hitlocations)) {
        let theDR = parseInt(value.dr)
        if (theDR < lowestDR) lowestDR = theDR
        if (value.where === 'Torso') torsoDR = theDR
      }

      let effectiveDR = Math.ceil((lowestDR + torsoDR) / 2)
      return effectiveDR
    }

    return locations.filter(it => it.where === location).map(it => it.dr)[0]
  }

  getCurrentWoundingModifier(type) {
    if (type === 'none') return 1
    if (type === 'User Entered') return this.userEnteredMod
    return GURPS.woundModifiers[type].multiplier
  }

  /*
   * Wire the logic to the UI.
   */
  activateListeners(html) {
    super.activateListeners(html)

    let self = this

    const digitsOnly = /^\d*$/
    const digitsAndDecimalOnly = /^\d*\.?\d*$/

    // If this isSimpleDialog, hide the advanced panel and resize the window.
    if (this.isSimpleDialog) {
      html.find('#apply-damage-advanced').addClass('invisible')
      $('#apply-damage-dialog').css({ 'height': '125', 'width': '800' })
    }
    else {
      // else restore visibility and size.
      html.find('#apply-damage-advanced').removeClass('invisible')
      $('#apply-damage-dialog').css({ 'height': '800', 'width': '800' })
    }

    // ==== Directly Apply ====
    // Restrict the damage text to digits only.
    html.find("#damage").inputFilter(value => digitsOnly.test(value))

    html.find('#apply-publicly').on('click', ev => this.submitDirectApply(ev, true))
    html.find('#apply-secretly').on('click', ev => this.submitDirectApply(ev, false))

    // if the "damage" text field is changed, update basicDamage and recalculation values
    html.find('#damage').on('change paste keyup', function () {
      self.basicDamage = $(this).val() === '' ? 0 : parseFloat($(this).val())
      self.updateAllValues()
      self.updateUI(html)
    })

    // ==== Hit Location and DR ====
    html.find("#select-dr").inputFilter(value => digitsOnly.test(value))

    // Find the default hit location and check the appropriate radio button.
    // (Updating location automatically calls updateAllValues().)
    this.location = this.actor.getDefaultHitLocation()
    if (this.location === 'Random') {
      this.processRandomHitLocation(null, html)
    } else {
      self.updateUI(html)
    }

    // When the 'random' button is clicked, update the hit location.
    html.find('#random-location').on('click', async ev => this.processRandomHitLocation(ev, html))

    // When a new Hit Location is selected, calculate the new results and update the UI.
    html.find('input[name="hitlocation"]').click(function (ev) {
      if ($(this).is(':checked')) {
        self.location = $(this).val()
        self.updateUI(html)
      }
    })

    // When "User Entered" text changes, save the (numeric) value in this object and
    // update the result-dr, if necessary.
    html.find('#select-dr').on('change paste keyup', function () {
      self.userEnteredDR = $(this).val() === '' ? 0 : parseInt($(this).val())
      self.updateAllValues()
      self.updateUI(html)
    })

    html.find('#range12D').click(function (ev) {
      self.isHalfDamage = $(this).is(':checked')
      self.updateAllValues()
      self.updateUI(html)
    })

    // ==== Type and Wounding Modifiers ====
    html.find("#woundmodifier").inputFilter(value => digitsAndDecimalOnly.test(value))
    html.find("#addmodifier").inputFilter(value => digitsAndDecimalOnly.test(value))

    // Set the Damage Type radio button.
    this.damageType = this.damageData.damageType
    html.find(`input[name='woundmodifier'][value='${this.damageType}']`).prop('checked', true)
    this.updateUI(html)

    // When a new Damage Type is selected, update the result-type and result-modifier.
    html.find('input[name="woundmodifier"]').click(function (ev) {
      if ($(this).is(':checked')) {
        self.damageType = $(this).val()
        self.updateUI(html)
      }
    })

    // When 'User Entered' text changes, save the (numeric) value in this object and
    // update the result-modifier, if necessary.
    html.find('#select-mod').on('change paste keyup', function () {
      self.userEnteredMod = $(this).val() === '' ? 0 : parseFloat($(this).val())
      self.selectedMod = self.getCurrentWoundingModifier()
      self.updateUI(html)
    })

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    html.find('#addmodifier').on('change paste keyup', function () {
      self.additionalMods = $(this).val() === '' ? 0 : parseFloat($(this).val())
      self.updateAllValues()
      self.updateUI(html)
    })

    // ==== Results ====
    html.find('#apply-injury-publicly').on('click', ev => this.submitInjuryApply(ev, true))
    html.find('#apply-injury-secretly').on('click', ev => this.submitInjuryApply(ev, false))
  }

  updateUI(html) {
    html.find('[name="result-basic"]').text(this.basicDamage)
    html.find('[name="result-dr"]').text(this.dr)
    html.find('[name="result-hitlocation"]').text(this.location)
    html.find('[name="result-penetrating"]').text(this.penetrating)
    html.find(`input[name='hitlocation'][value='${this.location}']`).prop('checked', true)

    html.find('[name="result-totalmod"]').text(this.totalWoundingModifier)
    html.find('[name="result-addmods"]').text(this.additionalMods)
    html.find('[name="result-modifier"]').text(this.selectedMod)
    html.find('[name="result-type"]').text(this.damageType)
    html.find('[name="result-injury"]').text(this.injury)

    html.find('#result-apply-injury').prop('value', this.injury)

    if (this.additionalMods > 0)
      html.find('[name="result-type-add"]').removeClass('invisible')
    else
      html.find('[name="result-type-add"]').addClass('invisible')

    if (this.isHalfDamage) {
      if (html.find('[name="result-half"]').length === 0) {
        $(`<div name='result-half'>(${this.basicDamage} &divide; 2)</div>`).insertAfter(html.find('[name="result-insert"]'))
        $(`<div name='result-half'>${this.halfDamage}</div>`).insertAfter(html.find('[name="result-insert"]'))
        $(`<div name='result-half'>&frac12; DAMAGE</div>`).insertAfter(html.find('[name="result-insert"]'))
      }
    }
    else {
      html.find('[name="result-half"]').remove()
    }
  }

  async processRandomHitLocation(ev, html) {
    let roll3d = new Roll('3d6')
    roll3d.roll()
    let total = roll3d.total

    this.location = this.actor.getHitLocationsWithDR().filter(it => it.roll.includes(total))[0].where

    if (isNiceDiceEnabled()) {
      game.dice3d.showForRoll(roll3d)
        .then(display => this.updateUI(html))
    } else {
      // play dice sounds
      this.updateUI(html)
    }
  }

  submitDirectApply(ev, publicly) {
    let form = $(ev.currentTarget).parents('.apply-damage')[0]
    let injury = parseInt($(form).find('#damage')[0].value)
    let type = $('#apply-to option:selected')[0].value

    this.resolveInjury(injury, type, publicly)
  }

  submitInjuryApply(ev, publicly) {
    let injury = this.injury
    let type = this.damageType === 'fat' ? 'FP' : 'HP'

    this.resolveInjury(injury, type, publicly)
  }

  resolveInjury(injury, type, publicly) {
    let current = type === 'FP'
      ? this.actor.data.data.FP.value
      : this.actor.data.data.HP.value

    let data = {
      basicDamage: injury,
      attacker: game.actors.get(this.damageData.attacker).data.name,
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

