'use strict'

import * as HitLocations from '../module/hitlocation/hitlocation.js'
import { isArray, isEmpty, getComparison, getOperation, i18n, i18n_f } from './utilities.js'
import * as settings from './miscellaneous-settings.js'
import { Maneuvers } from '../module/actor/maneuver.js'

/*
  Called Moustache Wax because it helps Handlebars. Get it?
*/
export default function () {
  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function () {
    var outStr = ''
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg]
      }
    }
    return outStr
  })

  // Add "@index to {{times}} function
  Handlebars.registerHelper('times', function (n, content) {
    let result = ''
    for (let i = 0; i < n; i++) {
      content.data.index = i + 1
      result += content.fn(i)
    }
    return result
  })

  Handlebars.registerHelper('pluralize', function (word, quantity) {
    if (quantity == 1) return word

    if (word.slice(-1) == 's' || word.slice(-1) == 'x') return `${word}es`
    return `${word}s`
  })

  Handlebars.registerHelper('chooseplural', function (quantity, single, plural) {
    if (quantity == 1) return single
    return plural
  })

  Handlebars.registerHelper('i18n', function (value, fallback) {
    return i18n(value, fallback)
  })

  Handlebars.registerHelper('i18n_f', function (value, data, fallback) {
    return i18n_f(value, data, fallback)
  })

  Handlebars.registerHelper('defined', function (a) {
    return a != undefined
  })
  Handlebars.registerHelper('gt', function (a, b) {
    return a > b
  })
  Handlebars.registerHelper('lt', function (a, b) {
    return a < b
  })
  Handlebars.registerHelper('eq', function (a, b) {
    return a == b
  })
  Handlebars.registerHelper('ne', function (a, b) {
    return a != b
  })
  Handlebars.registerHelper('abs', function (a) {
    return Math.abs(a)
  })
  Handlebars.registerHelper('and', function () {
    for (let arg in arguments) {
      if (arguments[arg] == false) {
        return false
      }
    }
    return true
  })
  Handlebars.registerHelper('or', function () {
    for (let arg in arguments) {
      if (arguments[arg] == true) {
        return true
      }
    }
    return false
  })
  Handlebars.registerHelper('not', function (value) {
    return !value
  })
  Handlebars.registerHelper('includes', function (array, value) {
    return array.includes(value)
  })

  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase()
  })

  Handlebars.registerHelper('debug', function (value) {
    if (GURPS.DEBUG == false) return
    console.log('Current context:')
    console.log('================')
    console.log(this)

    if (value) {
      console.log('Value:')
      console.log('================')
      console.log(value)
    }
  })

  Handlebars.registerHelper('jsonStringify', function (object) {
    return JSON.stringify(object)
  })

  /*
   * if value is equal to compareTo, return _default; otherwise return the
   * format string replacing '*' with value.
   */
  Handlebars.registerHelper('printIfNe', function (value, compareTo, format, _default = '') {
    if (value === compareTo) return _default
    let result = format.replace('*', value)
    return result
  })

  Handlebars.registerHelper('objToString', function (str) {
    let o = CONFIG.GURPS.objToString(str)
    console.log(o)
    return o
  })

  Handlebars.registerHelper('simpleRating', function (lvl) {
    if (!lvl) return 'UNKNOWN'
    let l = parseInt(lvl)
    if (l < 10) return 'Poor'
    if (l <= 11) return 'Fair'
    if (l <= 13) return 'Good'
    if (l <= 15) return 'Great'
    if (l <= 18) return 'Super'
    return 'Epic'
  })

  Handlebars.registerHelper('notEmpty', function (obj) {
    return !!obj ? Object.values(obj).length > 0 : false
  })

  Handlebars.registerHelper('hasNoChildren', function (contains, collapsed) {
    let c1 = !!contains ? Object.values(contains).length == 0 : true
    let c2 = !!collapsed ? Object.values(collapsed).length == 0 : true
    return c1 && c2
  })

  Handlebars.registerHelper('length', function (obj) {
    return !!obj ? Object.values(obj).length : 0
  })

  /// NOTE:  To use this, you must use {{{gurpslink sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
  Handlebars.registerHelper('gurpslink', function (str, root, clrdmods = false) {
    // this is a stupid trick to 'unescape' HTML entities, like converting '&uuml;' to 'ü'
    var template = document.createElement('textarea')
    template.innerHTML = str
    str = template.childNodes[0]?.nodeValue || str // hack may not work, so default back to original string

    let actor = root?.data?.root?.actor
    if (!actor) actor = root?.actor
    return new Handlebars.SafeString(game.GURPS.gurpslink(str, root == true || clrdmods == true))
  })

  /// NOTE:  To use this, you must use {{{gurpslinkbr sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
  // Same as gurpslink, but converts \n to <br> for large text values (notes)
  Handlebars.registerHelper('gurpslinkbr', function (str, root, clrdmods = false) {
    let actor = root?.data?.root?.actor
    if (!actor) actor = root?.actor
    return game.GURPS.gurpslink(str, root == true || clrdmods == true).replace(/\n/g, '<br>')
  })

  Handlebars.registerHelper('listeqt', function (context, options) {
    var data
    if (options.data) data = Handlebars.createFrame(options.data)

    let ans = GURPS.listeqtrecurse(context, options, 0, data)
    return ans
  })

  // Only necessary because of the FG import
  Handlebars.registerHelper('hitlocationroll', function (loc, roll, data) {
    if (!roll) {
      // get hitlocation table name
      let tableName = data?.additionalresources?.bodyplan
      if (!tableName) tableName = 'humanoid'
      let table = HitLocations.hitlocationDictionary[tableName]
      if (!table) table = HitLocations.hitlocationDictionary['humanoid']
      roll = table[loc]?.roll
    }
    return roll
  })

  Handlebars.registerHelper('hitlocationpenalty', function (loc, penalty, data) {
    if (!penalty) {
      // get hitlocation table name
      let tableName = data?.additionalresources?.bodyplan
      if (!tableName) tableName = 'humanoid'
      let table = HitLocations.hitlocationDictionary[tableName]
      if (!table) table = HitLocations.hitlocationDictionary['humanoid']
      penalty = table[loc]?.penalty
    }
    return penalty
  })

  Handlebars.registerHelper('fractionalize', function (value, digits) {
    if (typeof value == 'number') {
      let wholeNumber = Math.floor(value)
      if (wholeNumber === value) {
        return value
      }

      let fraction = value - wholeNumber
      let wholeNumberText = wholeNumber === 0 ? '' : `${wholeNumber}`
      if (fraction === 1 / 3) return `${wholeNumberText} 1/3`.trim()
      if (fraction === 2 / 3) return `${wholeNumberText} 2/3`.trim()
      return parseFloat(value.toFixed(digits))
    }
    return value
  })

  /**
   * Helper for ADD wounding modifier row of the results table.
   */
  Handlebars.registerHelper('woundModifierText', function (calc) {
    let add = calc.additionalWoundModifier ? ` + ${calc.additionalWoundModifier} add` : ''
    let vul = calc.isVulnerable ? ` × ${calc.vulnerabilityMultiple} (Vuln.)` : ''

    if (vul.length + add.length === 0) return calc.damageType

    if (vul.length === 0) return `${calc.damageType}${add}`.trim()

    if (add.length === 0) return `${calc.damageType}${vul}`.trim()

    return `(${calc.damageType}${add})${vul}`.trim()
  })

  Handlebars.registerHelper('isWoundModAdjForLocation', function (calc) {
    if (calc.isWoundModifierAdjustedForLocation) {
      let location = calc.effectiveWoundModifiers[calc.damageType]
      return !!location && location.changed === 'hitlocation'
    }
    return false
  })

  Handlebars.registerHelper('isWoundModAdjForInjuryTol', function (calc) {
    if (calc.isWoundModifierAdjustedForInjuryTolerance) {
      let location = calc.effectiveWoundModifiers[calc.damageType]
      return !!location && location.changed === 'injury-tolerance'
    }
    return false
  })

  Handlebars.registerHelper('filter', function (objects, key) {
    // objects - array of object to filter
    // key - property to filter on
    if (isArray(objects)) return objects.filter(!isEmpty)

    // assume this is an object with numeric keys
    if (typeof objects === 'object' && objects !== null) {
      let results = []
      let index = 0
      let entry = objects[`${index}`]

      while (entry) {
        if (!isEmpty(entry.name)) results.push(entry)
        index++
        entry = objects[`${index}`]
      }
      return results
    }
    return []
  })

  Handlebars.registerHelper('listAllBodyPlans', function () {
    return HitLocations.getHitLocationTableNames()
  })

  Handlebars.registerHelper('listAllManeuvers', function () {
    return Maneuvers.getData()
  })

  Handlebars.registerHelper('showTheMath', function () {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_THE_MATH) ? 'checked' : ''
  })

  // Allows handling of multiple page refs, e.g."B101,MA150"
  Handlebars.registerHelper('pdflink', function (link) {
    let txt = link
    if (Array.isArray(link)) txt = link.join(',')
    return !!txt
      ? txt
          .split(',')
          .map(l => game.GURPS.gurpslink(`[PDF:${l}]`))
          .join(', ')
      : ''
  })

  // Allows handling of multiple page refs, e.g."B101,MA150" and external links
  Handlebars.registerHelper('pdflinkext', function (link, externalLink) {
    let txt = link
    if (Array.isArray(link)) txt = link.join(',')
    return !!txt
      ? txt
          .split(',')
          .map(l => {
            if (!!externalLink) return `<a href="${externalLink}">*Link</a>`
            else return game.GURPS.gurpslink(`[PDF:${l}]`)
          })
          .join(', ')
      : ''
  })

  Handlebars.registerHelper('round', function (num) {
    // remove any commas, the grab any leading signed number
    let temp = (num + '')
      .trim()
      .replace(',', '')
      .replace(/^(-?\d+(?:\.\d+)*?) +.*/, '$1')
    return +(Math.round(temp + 'e+2') + 'e-2')
  })

  Handlebars.registerHelper('toLocaleString', function (number) {
    return number.toLocaleString()
  })

  Handlebars.registerHelper('displayNumber', function (num) {
    if (parseInt(num) === 0) return num.toString()
    if (parseInt(num) < 0) return num.toString().replace('-', '–')
    if (num.toString()[0] !== '+') return `+${num}`
    return num.toString()
  })

  Handlebars.registerHelper('optionSetStyle', function (boolean) {
    return !!boolean ? 'buttonpulsatingred' : 'buttongrey'
  })

  Handlebars.registerHelper('threshold-of', function (thresholds, max, value) {
    // return the index of the threshold that the value falls into
    let result = null
    thresholds.some(function (threshold, index) {
      let op = getOperation(threshold.operator)
      let comparison = getComparison(threshold.comparison)
      let testValue = op(max, threshold.value)
      return comparison(value, testValue) ? ((result = index), true) : false
    })
    return result
  })

  Handlebars.registerHelper('thresholdBreakpoints', function (tracker) {
    let results = []
    tracker.thresholds.forEach(threshold => {
      let op = getOperation(threshold.operator)
      let temp = op(tracker.max, threshold.value)
      let isLessThan = threshold.comparison === '≤' || threshold.comparison === '<'
      let value = isLessThan ? Math.ceil(temp) : Math.floor(temp)

      results.push({
        breakpoint: value,
        label: threshold.condition,
        comparison: threshold.comparison,
      })
    })
    return results
  })

  Handlebars.registerHelper('select-if', function (value, expected) {
    return value == expected ? 'selected' : ''
  })

  Handlebars.registerHelper('disabled', function (value) {
    return !!value ? 'disabled' : ''
  })

  Handlebars.registerHelper('isUserCreated', function (obj) {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_USER_CREATED) && !!obj.save
  })

  Handlebars.registerHelper('isFoundryItem', function (obj) {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_FOUNDRY_CREATED) && !!obj.itemid
  })

  Handlebars.registerHelper('ignoreImportQty', function (obj) {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_ignoreImportQty) && !!obj.ignoreImportQty
  })

  Handlebars.registerHelper('displayItemHover', function (obj) {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_FOUNDRY_CREATED) && !!obj.img
  })

  Handlebars.registerHelper('collapsible-content', function (id, data, group, options) {
    let title = data[0]
    let type = !!group && group.length > 0 ? `type='radio' name='${group}'` : `type='checkbox'`
    let content = data
      .slice(1)
      .map(it =>
        it.startsWith('*')
          ? `        <div class='subtitle'>${it.slice(1)}</div>`
          : `        <div class='selectable' value='${it}'>${it}</div>`
      )
      .join('\n')

    let template = `
    <div id='${id}' class='collapsible-wrapper'>
      <input id='collapsible-${id}' class='toggle offscreen-only' ${type}>
      <label for='collapsible-${id}' class='label-toggle'>${title}</label>
      <div class='collapsible-content'>
        <div class='content-inner'>
${content}
        </div>
      </div>
    </div>
`
    return new Handlebars.SafeString(template)
  })

  // === register Handlebars partials ===
  const templates = [
    'systems/gurps/templates/actor/hpfp-tracker.hbs',
    'systems/gurps/templates/actor/resource-tracker.hbs',
    'systems/gurps/templates/actor/resource-controls.hbs',
  ]

  templates.forEach(filename => {
    let name = filename.substr(filename.lastIndexOf('/') + 1).replace(/(.*)\.hbs/, '$1')
    fetch(filename)
      .then(it => it.text())
      .then(async text => {
        Handlebars.registerPartial(name, text)
      })
  })
}
