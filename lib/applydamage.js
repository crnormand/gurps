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
    this._processRandomHitLocation = this._processRandomHitLocation.bind(this)

    // the current value of the "Enter DR:" text field
    this.enteredDR = 0

    // the current damage type value (string)
    this._damageType = null

    // the current select modifier (multiplier)
    this.selectedMod = 1

    // the current value of the 'Enter Modifier:' field
    this.enteredMod = 1

    // the currrent value of the 'Additional Modifier:' field
    this.additionalMods = 0

    // the current value of the hitlocaation string
    this._location = 'Torso'

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

  get location() { return this._location }
  set location(text) {
    this._location = text
    this.dr = this._getHitLocationDR(text)
    this.penetrating = Math.max(0, this.damageData.damage - this.dr)
  }

  _getHitLocationDR(location) {
    if (location === 'Random') return 0

    if (location === 'User Entered') return this.enteredDR

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


  get damageType() { return this._damageType }
  set damageType(type) {
    this._damageType = type
    this.selectedMod = this._getCurrentWoundingModifier(type)
  }

  _getCurrentWoundingModifier(type) {
    if (type === 'none') return 1
    if (type === 'User Entered') return this.enteredMod
    return GURPS.woundModifiers[type].multiplier
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

    data.damageData = this.damageData

    data.hitLocationsWithDR = this.actor.getHitLocationsWithDR()
    data.hitlocation = this.actor.getDefaultHitLocation()
    data.dr = this._getHitLocationDR(data.hitlocation)

    data.applyTo = 'HP'
    data.actor = this.actor
    data.woundingModifiers = GURPS.woundModifiers
    data.selectedDR = this.enteredDR
    data.penetrating = Math.max(0, this.damageData.damage - data.dr)

    data.selectedMod = this.enteredMod
    data.additionalMods = this.additionalMods
    data.totalMods = this.enteredMod + this.additionalMods

    data.tacticalOptions = tacticalOptions
    data.otherSituations = otherSituations
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    let self = this

    const digitsOnly = /^\d*$/
    const digitsAndDecimalOnly = /^\d*\.?\d*$/

    // ==== Directly Apply ====
    // Restrict the damage text to digits only.
    html.find("#damage").inputFilter(value => digitsOnly.test(value))

    html.find('#apply-publicly').on('click', ev => this._submitDirectApply(ev, true))
    html.find('#apply-secretly').on('click', ev => this._submitDirectApply(ev, false))


    // ==== Hit Location and DR ====
    html.find("#select-dr").inputFilter(value => digitsOnly.test(value))

    // Find the default hit location and check the appropriate radio button.
    this.location = this.actor.getDefaultHitLocation()
    if (this.location === 'Random') {
      this._processRandomHitLocation(null, html)
    } else {
      self._updateUI(html)
    }

    // When the 'random' button is clicked, update the hit location.
    html.find('#random-location').on('click', async ev => this._processRandomHitLocation(ev, html))

    // When a new Hit Location is selected, calculate the new results and update the UI.
    html.find('input[name="hitlocation"]').click(function (ev) {
      if ($(this).is(':checked')) {
        self.location = $(this).val()
        self._updateUI(html)
      }
    })

    // When "User Entered" text changes, save the (numeric) value in this object and
    // update the result-dr, if necessary.
    html.find('#select-dr').on('change paste keyup', function () {
      self.enteredDR = $(this).val() === '' ? 0 : parseInt($(this).val())
      // This feels like a hack, but it works -- it triggers the setter for location, 
      // which recalculates the values that are based on DR.
      self.location = self.location
      self._updateUI(html)
    })


    // ==== Type and Wounding Modifiers ====
    html.find("#woundmodifier").inputFilter(value => digitsAndDecimalOnly.test(value))
    html.find("#addmodifier").inputFilter(value => digitsAndDecimalOnly.test(value))

    // Set the Damage Type radio button.
    this.damageType = this.damageData.damageType
    html.find(`input[name='woundmodifier'][value='${this.damageType}']`).prop('checked', true)
    this._updateWoundingModifiers(html)

    // When a new Damage Type is selected, update the result-type and result-modifier.
    html.find('input[name="woundmodifier"]').click(function (ev) {
      if ($(this).is(':checked')) {
        self.damageType = $(this).val()
        self._updateWoundingModifiers(html)
      }
    })

    // When 'User Entered' text changes, save the (numeric) value in this object and
    // update the result-modifier, if necessary.
    html.find('#select-mod').on('change paste keyup', function () {
      self.enteredMod = $(this).val() === '' ? 0 : parseFloat($(this).val())
      self.selectedMod = self._getCurrentWoundingModifier()
      self._updateWoundingModifiers(html)
    })

    // When 'Additional Mods' text changes, save the (numeric) value in this object and
    // update the result-addmodifier, if necessary.
    html.find('#addmodifier').on('change paste keyup', function () {
      self.additionalMods = $(this).val() === '' ? 0 : parseFloat($(this).val())
      self._updateWoundingModifiers(html)
    })
  }

  _updateUI(html) {
    html.find('#result-hitlocation').text(this.location)
    html.find('[name="result-dr"').text(this.dr)
    html.find('#result-penetrating').text(this.penetrating)

    let radio = html.find(`input[name='hitlocation'][value='${this.location}']`)
    radio.prop('checked', true)
  }

  _updateWoundingModifiers(html) {
    let total = this.selectedMod + this.additionalMods
    html.find('#result-totalmod').text(total)
    html.find('#result-addmods').text(this.additionalMods)
    html.find('#result-modifier').text(this.selectedMod)
    html.find('[name="result-type"]').text(this.damageType)

    if (this.additionalMods > 0)
      html.find('#result-type-add').removeClass('invisible')
    else
      html.find('#result-type-add').addClass('invisible')
  }

  async _processRandomHitLocation(ev, html) {
    let roll3d = new Roll('3d6')
    roll3d.roll()
    let total = roll3d.total

    this.location = this.actor.getHitLocationsWithDR().filter(it => it.roll.includes(total))[0]

    if (isNiceDiceEnabled()) {
      game.dice3d.showForRoll(roll3d)
        .then(display => this._updateUI(html))
    } else {
      // play dice sounds
      this._updateUI(html)
    }
  }

  _submitDirectApply(ev, publicly) {
    let form = $(ev.currentTarget).parents('.apply-damage')[0]
    let injury = $(form).find('#damage')[0].value
    let pointType = $('#apply-to option:selected')[0].value

    let current = pointType === 'FP'
      ? this.actor.data.data.FP.value
      : this.actor.data.data.HP.value

    let data = {
      basicDamage: parseInt(injury),
      attacker: game.actors.get(this.damageData.attacker).data.name,
      defender: this.actor.data.name,
      current: current,
      newvalue: current - injury,
      type: pointType
    }

    if (pointType === 'FP') {
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

