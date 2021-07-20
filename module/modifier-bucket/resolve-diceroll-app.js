import { generateUniqueId, i18n } from '../../lib/utilities.js'

export const commaSeparatedNumbers = /^\d*([ ,0-9\.\+-])*$/

export default class ResolveDiceRoll extends Application {
  constructor(diceTerms, options = {}, id = generateUniqueId()) {
    super(options)

    this.diceTerms = diceTerms.map(it => {
      return { term: it, text: '' }
    })

    this.applyEnabled = false
    this.fakeId = id
  }

  // async _updateObject(event, formData) {
  //   //throw new Error("A subclass of the FormApplication must implement the _updateObject method.");
  // }

  /**
   * @inheritdoc
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'resolve-dierolls',
      template: 'systems/gurps/templates/resolve-diceroll.hbs',
      resizeable: false,
      minimizable: false,
      width: 350,
      height: 'auto',
      title: i18n('GURPS.resolveDiceRoll', 'What Did You Roll?'),
      //      closeOnSubmit: true,
    })
  }

  /**
   * @override
   * @inheritdoc
   */
  getData(options) {
    const data = super.getData(options)
    data.diceTerm = this.diceTerms
    return data
  }

  /**
   * @override
   * @inheritdoc
   */
  activateListeners(html) {
    super.activateListeners(html)

    // accept only digits and commas
    html.find('input').inputFilter(value => commaSeparatedNumbers.test(value))

    html.find('input').change(ev => {
      let inputs = html.find('input.invalid')
      this.applyEnabled = !inputs.length
    })

    // update the diceTerm text
    html.find('input').change(ev => {
      let diceTerm = this.diceTerms.find(it => it.term.id === ev.currentTarget.id)
      diceTerm.text = ev.currentTarget.value
    })

    // set/remove invalid from an input
    html.find('input').on('input keydown keyup mousedown mouseup select contextmenu drop', ev => {
      let target = ev.currentTarget
      let id = target.id
      let diceTerm = this.diceTerms.find(it => it.term.id === id)
      let valid = this.isValid(diceTerm.term, target.value)
      if (valid) {
        target.oldValue = target.value
        target.oldSelectionStart = target.oldSelectionStart
        target.oldSelectionEnd = target.selectionEnd
        diceTerm.text = target.value
      } else if (target.hasOwnProperty('oldValue')) {
        target.value = target.oldValue
        target.setSelectionRange(target.oldSelectionStart, target.oldSelectionEnd)
      } else {
        target.value = ''
      }

      valid ? $(target).removeClass('gurps-invalid') : $(target).addClass('gurps-invalid')

      // enable the apply button if all inputs have valid entries
      let inputs = html.find('input.gurps-invalid')
      html.find('#apply').prop('disabled', !!inputs.length)
    })

    html.find('input').on('keypress', ev => {
      if (ev.keyCode == 13) {
        let apply = $(html.find('#apply'))
        if (apply.is(':disabled')) return
        apply.click()
      }
    })

    html.find('#apply').click(() => this._applyCallback())
    html.find('#roll').click(() => this._rollCallback())
    
    html.find('input').focus()
  }

  _applyCallback() {
    for (const diceTerm of this.diceTerms) {
      let result = this.getValues(diceTerm)
      diceTerm.term._loaded = result
    }
    this.applyCallback(true)
  }

  _rollCallback() {
    this.rollCallback(false)
  }

  isValid(term, text) {
    let minPerDie = Math.min(1, term.faces)
    let maxPerDie = term.faces

    // if the value does not contain a comma, it must be between min and max
    if (!this.isIndividualDieResults(text)) {
      let value = parseInt(text)
      return value >= minPerDie * term.number && value <= maxPerDie * term.number
    }

    let values = this.convertToArryOfInt(text)

    if (values.length === term.number) {
      for (const value of values) {
        if (value !== value) return false // NaN
        if (value < minPerDie || value > maxPerDie) return false
      }
      return true
    }
    return false
  }

  getValues(diceTerm) {
    let text = diceTerm.text

    // if text includes a comma, split on the comma and convert to an array of int
    if (this.isIndividualDieResults(text)) return this.convertToArryOfInt(text)

    let target = parseInt(text)
    return this.generate({ number: diceTerm.term.number, faces: diceTerm.term.faces }, target)
  }

  isIndividualDieResults(text) {
    return text.includes(',') || text.includes(' ') || text.includes('.') || text.includes('+') || text.includes('-')
  }

  convertToArryOfInt(text) {
    return text
      .replaceAll('-', ',') // replace minus with commas
      .replaceAll('+', ',') // replace plus with commas
      .replaceAll('.', ',') // replace periods with commas
      .replaceAll(' ', ',') // replace spaces with commas
      .replaceAll(',,', ',') // replace two consecutive commas with one
      .split(',') // split on comma to create array of String
      .map(it => parseInt(it)) // convert to array of int
  }

  /**
   * Given a dice expression like 5d10, randomly select values for each die so
   * that the total is equal to the target value.
   *
   * @param {*} dice - an object literal that describes a dice roll;
   *    Example: 3d6 = {number: 3, faces: 6}
   * @param {int} target - what the sum of the dice in the roll should equal
   * @param {*} results - intermediate results (see return value)
   * @returns Array<int> - an array of values, one per dice#number,
   *    representing what was rolled to add up to the target.
   */
  generate(dice, target, results = []) {
    if (dice.number === 1) results.push(target)
    else {
      dice.number--
      let offset = Math.max(0, target - 1 - dice.faces * dice.number)
      let range = Math.min(dice.faces, target - dice.number) - offset

      let value = Math.ceil(CONFIG.Dice.randomUniform() * range) + offset

      results.push(value)

      this.generate(dice, target - value, results)
    }
    return results
  }
}
