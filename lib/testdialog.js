'use strict'

export default class ApplyDamageDialog extends Application {
  constructor(doofus, damageData, options = {}) {
    super(options)

    this.doofus = doofus
    this.damageData = damageData
    this._processRandomHitLocation = this._processRandomHitLocation.bind(this)
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'apply-damage-dialog'
    options.template = 'systems/gurps/templates/apply-damage-dialog.html'
    // options.height = 800
    // options.width = 800
    options.minimizable = false
    options.title = 'Apply Damage'
    return options
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
      id: 'apply-damage',
      template: 'systems/gurps/templates/apply-damage-dialog.html',
      resizable: true,
      width: 800,
      height: 600,
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
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    let button = html.find('#random-location')
    button.on('click', async ev => this._processRandomHitLocation(ev, html))

    // find the default location and check it
    let defaultLocation = this.doofus.getDefaultHitLocation()
    let selector = `input[name='hitlocation'][value='${defaultLocation}']`
    let element = html.find(selector)
    element.prop('checked', true)

    let type = this.damageData.damageType
    html.find(`input[name='woundmodifier'][value='${type}']`).prop('checked', true)
  }

  async _processRandomHitLocation(event, html) {
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
}