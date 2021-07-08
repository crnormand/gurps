import { i18n } from '../../lib/utilities.js'

export const commaSeparatedNumbers = /^\d*([,0-9])*$/

export default class ResolveDiceRoll extends FormApplication {
  constructor(diceTerms, options = {}) {
    super(options)

    this.diceTerms = diceTerms.map(it => {
      return { term: it, text: '' }
    })

    this.applyEnabled = false
  }
  
  async _updateObject(event, formData) {
    //throw new Error("A subclass of the FormApplication must implement the _updateObject method.");
  }

  /**
   * @inheritdoc
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'resolve-dierolls',
      template: 'systems/gurps/templates/resolve-diceroll.hbs',
      resizeable: false,
      minimizable: false,
      width: 250,
      height: 'auto',
      title: i18n('GURPS.resolveDiceRoll', 'Resolve Dice Roll'),
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
      console.log(inputs.length)
      html.find('#apply').prop('disabled', !!inputs.length)
    })

    html.find('#apply').click(async () => {
      for (const diceTerm of this.diceTerms) {
        let result = this.getValues(diceTerm)
        diceTerm.term._loaded = result
      }
      this.applyCallback()
    })

    html.find('#roll').click(async () => {
      this.rollCallback()
    })
  }

  isValid(term, text) {
    let minPerDie = Math.min(1, term.faces)
    let maxPerDie = term.faces

    // if the value does not contain a comma, it must be between min and max
    if (!text.includes(',')) {
      let value = parseInt(text)
      return value >= minPerDie * term.number && value <= maxPerDie * term.number
    }

    let values = text.split(',').map(it => parseInt(it))
    if (values.length === term.number) {
      console.log(values)
      for (const value of values) {
        if (value !== value) return false // NaN
        if (value < minPerDie || value > maxPerDie) return false
      }
      return true
    }
    return false
  }

  getValues(diceTerm) {
    // if text includes a comma, split on the comma and convert to an array of int
    if (diceTerm.text.includes(',')) return diceTerm.text.split(',').map(it => parseInt(it))

    let target = parseInt(diceTerm.text)
    return this.generate({ number: diceTerm.term.number, faces: diceTerm.term.faces }, target)
  }

  /**
   * Given a dice expression like 5d10, randomly select values for each die so
   * that the total is equal to the target value.
   *
   * @param {*} dice - an object literal that describes a dice roll;
   *    Example: 3d6 = {number: 3, faces: 6}
   * @param {int} target - what the sum of the dice in the roll should equal
   * @param {*} results - intermediate results (see return value)
   * @returns Array<int> - an array of values, one per diceExpression#number,
   *    representing what was rolled to add up to the target.
   */
  generate(dice, target, results = []) {
    // let min = 1
    let max = dice.faces

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
