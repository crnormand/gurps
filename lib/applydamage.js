'use strict'

import { isNiceDiceEnabled } from '../lib/utilities.js'
import { GURPS } from '../module/gurps.js'


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



export default class ApplyDamageDialog extends Application {
  constructor(doofus, damageData, options = {}) {
    super(options)

    this.doofus = doofus
    this.damageData = damageData
    this._processRandomHitLocation = this._processRandomHitLocation.bind(this)

    this.enteredDR = 0

    // the current damage type value (string)
    this.damageType = null

    // the current select modifier (multiplier)
    this.selectedMod = 1

    // the value entered in the 'Enter Modifier' field
    this.enteredMod = 1

    // the value entered in the 'Additional Modifier' field
    this.additionalMods = 0

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

  /* EXAMPLE DAMAGE DATA
  let damageData = {
    dice: '3d+5',
    modifiers: [
      '+2 damage (Strong Attack)',
      '+2 damage (Mighty Blow) *Cost 1FP'
    ]
    damage: 21,
    damageType: 'cut',
    isB378: false
  }
  */

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
    data.hitLocationsWithDR = this.doofus.getHitLocationsWithDR()
    data.damageData = this.damageData
    data.applyTo = 'HP'
    data.actor = this.doofus
    data.woundingModifiers = GURPS.woundModifiers
    data.selectedDR = this.enteredDR

    data.selectedMod = this.enteredMod
    data.additionalMods = this.additionalMods
    data.totalMods = this.enteredMod + this.additionalMods

    data.tacticalOptions = tacticalOptions
    data.otherSituations = otherSituations
    data.hitlocation = this.doofus.getDefaultHitLocation()
    data.dr = this._getHitLocationDR(data.hitlocation)
    return data
  }

  _getHitLocationDR(location) {
    if (location === 'Random') return 0

    if (location === 'User Entered') return this.enteredDR

    let locations = this.doofus.getHitLocationsWithDR()
    if (location === 'Large-Area') {
      // find the location with the lowest DR
      let lowestDR = Number.POSITIVE_INFINITY
      let torsoDR = 0
      for (const [key, value] of Object.entries(this.doofus.data.data.hitlocations)) {
        let theDR = parseInt(value.dr)
        if (theDR < lowestDR) lowestDR = theDR
        if (value.where === 'Torso') torsoDR = theDR
      }

      let effectiveDR = Math.ceil((lowestDR + torsoDR) / 2)
      return effectiveDR
    }

    return locations.filter(it => it.where === location).map(it => it.dr)[0]
  }

  activateListeners(html) {
    super.activateListeners(html)

    let self = this

    const digitsOnly = /^\d*$/
    const digitsAndDecimalOnly = /^\d*\.?\d*$/

    // ==== Directly Apply ====
    // Restrict the damage text to digits only.
    html.find("#damage").inputFilter(value => digitsOnly.test(value))

    // On "Apply" button clicked, update the target's HP or FP (publicly).
    html.find('#apply-publicly').on('click', ev => this._submitDirectApply(ev, true))

    // On "Apply (Quietly)" button clicked, update the target's HP or FP (whispered).
    html.find('#apply-secretly').on('click', ev => this._submitDirectApply(ev, false))


    // ==== Hit Location and DR ====
    // Restrict "Enter DR" text to digits only.
    html.find("#select-dr").inputFilter(value => digitsOnly.test(value))

    // Find the default hit location and check the appropriate radio button.
    let defaultLocation = this.doofus.getDefaultHitLocation()
    if (defaultLocation === 'Random') {
      this._processRandomHitLocation(null, html)
    } else {
      html.find(`input[name='hitlocation'][value='${defaultLocation}']`).prop('checked', true)
    }

    // When the 'random' button is clicked, update the hit location.
    html.find('#random-location').on('click', async ev => this._processRandomHitLocation(ev, html))

    // When a new Hit Location is selected, update the result-location and result-dr.
    html.find('input[name="hitlocation"]').click(function (ev) {
      if ($(this).is(':checked')) {
        let location = $(this).val()
        html.find('#result-hitlocation').text(location)
        let dr = self._getHitLocationDR(location)
        html.find('#result-dr').text(dr)
      }
    })

    // When "User Entered" text changes, save the (numeric) value in this object and
    // update the result-dr, if necessary.
    html.find('#select-dr').on('change paste keyup', function () {
      self.enteredDR = $(this).val() === '' ? 0 : parseInt($(this).val())

      // if current hitlocation is 'User Entered', update the result field
      let location = html.find(`input[name='hitlocation']:checked`)
      if (location.val() === 'User Entered')
        html.find('#result-dr').text(self.enteredDR)
    })


    // ==== Type and Wounding Modifiers ====
    // Restrict "Enter Modifier" text to a decimal value.
    html.find("#woundmodifier").inputFilter(value => digitsAndDecimalOnly.test(value))

    // Restrict "Additional Modifier" text to a decimal value.
    html.find("#addmodifier").inputFilter(value => digitsAndDecimalOnly.test(value))

    // Set the Damage Type radio button.
    this.damageType = this.damageData.damageType
    html.find(`input[name='woundmodifier'][value='${this.damageType}']`).prop('checked', true)
    this.selectedMod = this._getCurrent()
    this._updateWoundingModifiers(html)

    // When a new Damage Type is selected, update the result-type and result-modifier.
    html.find('input[name="woundmodifier"]').click(function (ev) {
      if ($(this).is(':checked')) {
        self.damageType = $(this).val()
        self.selectedMod = self._getCurrent()
        self._updateWoundingModifiers(html)
      }
    })

    // When 'User Entered' text changes, save the (numeric) value in this object and
    // update the result-modifier, if necessary.
    html.find('#select-mod').on('change paste keyup', function () {
      self.enteredMod = $(this).val() === '' ? 0 : parseFloat($(this).val())
      self.selectedMod = self._getCurrent()
      self._updateWoundingModifiers(html)
    })

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    html.find('#addmodifier').on('change paste keyup', function () {
      self.additionalMods = $(this).val() === '' ? 0 : parseFloat($(this).val())
      self._updateWoundingModifiers(html)
    })
  }

  _getCurrent() {
    if (this.damageType === 'none') return 1
    if (this.damageType === 'User Entered') return this.enteredMod
    return GURPS.woundModifiers[this.damageType].multiplier
  }

  _updateWoundingModifiers(html) {
    let total = this.selectedMod + this.additionalMods
    html.find('#result-totalmod').text(total)
    html.find('#result-addmods').text(this.additionalMods)
    html.find('#result-modifier').text(this.selectedMod)
    html.find('#result-type').text(this.damageType)
  }

  async _processRandomHitLocation(ev, html) {
    let roll3d = new Roll('3d6')
    roll3d.roll()
    let total = roll3d.total

    let location = this.doofus.getHitLocationsWithDR().filter(it => it.roll.includes(total))[0]
    console.log(location)

    let _updateHitLocation = function () {
      let value = html.find(`input[name='hitlocation'][value='${location.where}']`)
      console.log(value)
      value.click()
      // value.prop('checked', true)
    }

    if (isNiceDiceEnabled()) {
      game.dice3d.showForRoll(roll3d)
        .then(display => _updateHitLocation())
    } else {
      // play dice sounds
      _updateHitLocation()
    }
  }

  _submitDirectApply(ev, publicly) {
    let form = $(ev.currentTarget).parents('.apply-damage')[0]
    let injury = $(form).find('#damage')[0].value
    let pointType = $('#apply-to option:selected')[0].value

    let current = pointType === 'FP'
      ? this.doofus.data.data.FP.value
      : this.doofus.data.data.HP.value

    let data = {
      basicDamage: parseInt(injury),
      attacker: game.actors.get(this.damageData.attacker).data.name,
      defender: this.doofus.data.name,
      current: current,
      newvalue: current - injury,
      type: pointType
    }

    if (pointType === 'FP') {
      this.doofus.update({ "data.FP.value": data.newvalue })
    } else {
      this.doofus.update({ "data.HP.value": data.newvalue })
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
        let users = this.doofus.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true)
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

