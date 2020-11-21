'use strict'

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
    data.applyTo = 'Hit Points'
    data.actor = this.doofus
    data.woundingModifiers = GURPS.woundModifiers
    data.selectedDR = 0
    data.tacticalOptions = tacticalOptions
    data.otherSituations = otherSituations
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('#random-location')
      .on('click', async ev => this._processRandomHitLocation(ev, html))

    // find the default location and check it
    let defaultLocation = this.doofus.getDefaultHitLocation()
    if (defaultLocation === 'Random') {
      this._processRandomHitLocation(null, html)
    } else {
      html.find(`input[name='hitlocation'][value='${defaultLocation}']`).prop('checked', true)
    }

    let type = this.damageData.damageType
    html.find(`input[name='woundmodifier'][value='${type}']`).prop('checked', true)

    html.find('#apply-publicly')
      .on('click', ev => this._submitDirectApply(ev, true))

    html.find('#apply-secretly')
      .on('click', ev => this._submitDirectApply(ev, false))
  }

  async _processRandomHitLocation(ev, html) {
    let roll3d = new Roll('3d6')
    roll3d.roll()
    let total = roll3d.total

    let location = this.doofus.getHitLocationsWithDR().filter(it => it.roll.includes(total))[0]
    console.log(location)

    game.dice3d.showForRoll(roll3d)
      .then(display => {
        let value = html.find(`input[name='hitlocation'][value='${location.where}']`)
        console.log(value)
        value.prop('checked', true)
      })

    return
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
        if (this.doofus.hasPlayerOwner) {
          let users = this.doofus.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true)
          let ids = users.map(it => it._id)
          messageData.whisper = ids
          messageData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
        }
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

