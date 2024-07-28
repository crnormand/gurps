import { generateUniqueId, i18n } from '../../lib/utilities.js'
import { GurpsDie } from './bucket-app.js'

export const commaSeparatedNumbers = /^\d*([ ,0-9\.\+-])*$/

/**
 * @typedef {{term: GurpsDie, text: string}} RollResult
 * @typedef {{oldValue?: string, oldSelectionStart?: number|null, oldSelectionEnd?: number|null}} SelectionHistory
 */

export default class ResolveDiceRoll extends Application {
  /**
   * @param {GurpsDie} diceTerm
   */
  constructor(diceTerm, options = {}, id = generateUniqueId()) {
    super(options)

    this.diceTerms = []
    this.diceTerms.push({ term: diceTerm, text: '' })

    this.applyEnabled = false
    this.fakeId = id

    this.applyCallback = () => {}
    this.rollCallback = () => {}
  }

  /**
   * @inheritdoc
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'resolve-dierolls',
      template: 'systems/gurps/templates/resolve-diceroll.hbs',
      resizeable: false,
      minimizable: false,
      width: 350,
      height: 'auto',
      title: i18n('GURPS.resolveDiceRoll'),
    })
  }

  /**
   * @inheritdoc
   * @typedef {{diceTerm: RollResult[]}} ResolveDiceRollData
   * @param {Application.RenderOptions | undefined} [options]
   * @returns {ResolveDiceRollData}
   */
  getData(options) {
    const data = /** @type {ResolveDiceRollData}*/ (/** type {undefined} */ super.getData(options))
    data.diceTerm = this.diceTerms
    return data
  }

  /**
   * @inheritdoc
   * @param {JQuery<HTMLElement>} html
   */
  activateListeners(html) {
    super.activateListeners(html)

    // accept only digits and commas
    // @ts-ignore
    html.find('input').inputFilter(value => commaSeparatedNumbers.test(value))

    html.find('input').on('change', ev => {
      let inputs = html.find('input.invalid')
      this.applyEnabled = !inputs.length
    })

    // update the diceTerm text
    html.find('input').on('change', ev => {
      let diceTerm = this.diceTerms.find(it => it.term.id === ev.currentTarget.id)
      if (!!diceTerm) diceTerm.text = ev.currentTarget.value
    })

    // set/remove invalid from an input
    html.find('input').on('input keydown keyup mousedown mouseup select contextmenu drop', ev => {
      /** @type {HTMLInputElement & SelectionHistory} */
      let target = ev.currentTarget
      let id = target.id
      let diceTerm = this.diceTerms.find(it => it.term.id === id)
      let valid = !!diceTerm ? this.isValid(diceTerm.term, target.value) : false

      if (!!diceTerm) {
        if (valid) {
          target.oldValue = target.value
          target.oldSelectionStart = target.selectionStart
          target.oldSelectionEnd = target.selectionEnd
          diceTerm.text = target.value
        } else if (target.hasOwnProperty('oldValue')) {
          target.value = target.oldValue || target.value
          target.setSelectionRange(target.oldSelectionStart || null, target.oldSelectionEnd || null)
        } else {
          target.value = ''
        }
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
        apply.trigger('click')
      }
    })

    html.find('#apply').on('click', () => this._applyCallback())
    html.find('#roll').on('click', () => this._rollCallback())
    html.find('input').focus()
  }

  _applyCallback() {
    for (const diceTerm of this.diceTerms) {
      let result = this.getValues(diceTerm)
      result.forEach(n => diceTerm.term.results.push({ active: true, result: n }))
      // diceTerm.term._loaded = result
    }
    // @ts-ignore
    this.applyCallback(true)
  }

  _rollCallback() {
    // @ts-ignore
    this.rollCallback(false)
  }

  /**
   * @param {GurpsDie} term
   * @param {string} text
   */
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

  /**
   * @param {RollResult} diceTerm
   */
  getValues(diceTerm) {
    let text = diceTerm.text

    // if text includes a comma, split on the comma and convert to an array of int
    if (this.isIndividualDieResults(text)) return this.convertToArryOfInt(text)

    let target = parseInt(text)
    return this.generate({ number: diceTerm.term.number, faces: diceTerm.term.faces }, target)
  }

  /**
   * @param {string} text
   */
  isIndividualDieResults(text) {
    return text.includes(',') || text.includes(' ') || text.includes('.') || text.includes('+') || text.includes('-')
  }

  /**
   * @param {string} text
   */
  convertToArryOfInt(text) {
    return text
      .replace(/-/g, ',') // replace minus with commas
      .replace(/\+/g, ',') // replace plus with commas
      .replace(/\./g, ',') // replace periods with commas
      .replace(/ /g, ',') // replace spaces with commas
      .replace(/,,/g, ',') // replace two consecutive commas with one
      .split(',') // split on comma to create array of String
      .map(it => parseInt(it)) // convert to array of int
  }

  /**
   * Given a dice expression like 5d10 and a target value, randomly select
   * values for each die so that the total is equal to the target value.
   *
   * @param {{number: number, faces: number}} dice - an object literal that
   *    describes a dice roll; Example: 3d6 = {number: 3, faces: 6}
   * @param {number} target - what the sum of dice in the roll should equal
   * @param {number[]} results - intermediate results (see return value)
   * @returns {number[]} - the array of values, one per dice.number, that
   *    add up to the target value.
   */
  generate(dice, target, results = []) {
    if (dice.number === 1) results.push(target)
    else {
      dice.number--
      let offset = Math.max(0, target - 1 - dice.faces * dice.number)
      let range = Math.min(dice.faces, target - dice.number) - offset

      let value = Math.ceil(CONFIG.Dice.randomUniform() * range) + offset

      results.push(value)

      this.generate(dice, target - value, results) // recurse!
    }
    return results
  }
}
