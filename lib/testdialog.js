'use strict'

export default class TestDialog extends Application {
  constructor(options = {}) {
    super(options)
  }

  getData(options) {
    const data = super.getData(options)
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find('#testdialog').click(this._onClick.bind(this))
  }

  refresh() {
    this.render(true);
  }

  async _onClick(event) {
    event.preventDefault()

    new ApplyDamageDialog(new Mock()).render(true)
  }
}

class Mock {

}

class ApplyDamageDialog extends Application {
  constructor(actor, options = {}) {
    super(options)

    this.actor = actor
  }

  static get defaultOptions() {
    const options = super.defaultOptions
    options.id = 'apply-damage'
    options.template = 'systems/gurps/templates/apply-damage-dialog.html'
    options.resizable = true
    options.width = 800
    options.title = "Apply Damage"

    return options
  }

  getData() {
    let data = super.getData()

    data.hitLocationsWithDR = this.getHitLocationsWithDR()
    return data
  }

  getHitLocationsWithDR() {
    // normally retrieve this from the actor
    return [
      { where: 'Eyes', dr: 0, roll: [] },
      { where: 'Skull', dr: 2, roll: [3, 4] },
      { where: 'Face', dr: 0, roll: [5] },
      { where: 'Right Leg', dr: 1, roll: [6, 7] },
      { where: 'Right Arm', dr: 1, roll: [8] },
      { where: 'Torso', dr: 3, roll: [9, 10] },
      { where: 'Groin', dr: 2, roll: [11] },
      { where: 'Left Arm', dr: 1, roll: [12] },
      { where: 'Left Leg', dr: 1, roll: [13, 14] },
      { where: 'Hand', dr: 0, roll: [15] },
      { where: 'Foot', dr: 1, roll: [16] },
      { where: 'Neck', dr: 0, roll: [17, 18] },
    ]
  }

  getDefaultHitLocation() {
    // retrieve from a system setting
    return 'Torso'
  }

  activateListeners(html) {
    let self = this
    html.find('#random-location').click(ev => {
      let roll3d = new Roll('3d6')
      roll3d.roll()
      let total = roll3d.total

      let location = this.getHitLocationsWithDR.filter(it => it.roll.contains(total))[0]

      game.dice3d.showForRoll(roll3d)
        .then(display => {

          let element = html.find('input').name('hitlocation').val(location)
          
          // use html to check the location
        })
    })

    // find the default location and check it
  }
}