'use strict'

import * as HitLocations from '../module/hitlocation/hitlocation.js'
import {
  isArray,
  isEmpty,
  getComparison,
  getOperation,
  i18n,
  i18n_f,
  zeroFill,
  recurselist,
  quotedAttackName,
} from './utilities.js'
import * as settings from './miscellaneous-settings.js'
import Maneuvers from '../module/actor/maneuver.js'
import { parseDecimalNumber } from './parse-decimal-number/parse-decimal-number.js'
import { MoveModes } from '../module/actor/actor.js'
import { multiplyDice } from '../module/utilities/damage-utils.js'
import { gurpslink } from '../module/utilities/gurpslink.js'

export function findTracker(data, trackerName) {
  if (!!data && !!data.additionalresources?.tracker) {
    // find the tracker with name
    let tracker = Object.values(data.additionalresources?.tracker).find(it => it.name === trackerName)
    if (!!tracker) {
      let found = Object.keys(data.additionalresources.tracker).find(
        it => data.additionalresources.tracker[it].name === trackerName
      )
      tracker.key = found
      return tracker
    }
  }
  return null
}

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

  /**
   * move is a single entry of the form { mode: string, value: number }
   * returns array of options.
   */
  Handlebars.registerHelper('moveOptions', function (move) {
    let options = [MoveModes.Ground, MoveModes.Air, MoveModes.Water, MoveModes.Space]

    if (options.includes(move.mode)) return options
    options.push(move.mode)
    return options
  })

  Handlebars.registerHelper('damageTypeOptions', function (type) {
    let options = Object.values(GURPS.DamageTables.translationTable)
    if (options.includes(type)) return options
    options.push(type)
    return options
  })

  Handlebars.registerHelper('sum', function (...args) {
    const arr = []
    for (const arg of args) {
      if (parseInt(arg)) arr.push(arg)
    }
    return arr.reduce((a, b) => a + b, 0)
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
    if (!!fallback?.hash)
      // Allow i18n to work using the old localize syntax
      return i18n_f(value, fallback.hash)
    else return i18n(value, fallback)
  })

  Handlebars.registerHelper('i18n_f', function (value, data, fallback) {
    return i18n_f(value, data, fallback)
  })

  Handlebars.registerHelper('defined', function (a) {
    return a != undefined
  })
  /** Remove helpers already defined by Foundry
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
  */
  Handlebars.registerHelper('abs', function (a) {
    return Math.abs(a)
  })
  Handlebars.registerHelper('isNum', function (value) {
    if (value == null) return false
    if (value == '0') return true
    if (value == '') return false
    return !isNaN(parseInt(value)) // Used to allow "numbers" like '12F' or '11U' for fencing/unwieldy parry
  })
  Handlebars.registerHelper('includes', function (array, value) {
    return array.includes(value)
  })

  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase()
  })

  Handlebars.registerHelper('zeroFill', function (number, width) {
    return zeroFill(number, width)
  })

  Handlebars.registerHelper('toNumber', function (value) {
    if (typeof value == 'string') return parseDecimalNumber(value)
    return value
  })

  Handlebars.registerHelper('debug', function (value) {
    if (GURPS.DEBUG == false) return
    console.log('Current context:')
    console.log('================')
    // @ts-ignore
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

  Handlebars.registerHelper('jsonToObject', function (json) {
    return JSON.parse(json)
  })

  Handlebars.registerHelper('replace', function () {
    let format = arguments[0]
    for (let index = 1; index < arguments.length; index++) {
      let value = arguments[index]
      format = format.replace(`$${index}`, arguments[index])
    }
    return format
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
    let o = GURPS.objToString(str)
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

  Handlebars.registerHelper('empty', function (obj) {
    return !obj || Object.values(obj).length === 0
  })

  Handlebars.registerHelper('hasNoChildren', function (contains, collapsed) {
    let c1 = !!contains ? Object.values(contains).length == 0 : true
    let c2 = !!collapsed ? Object.values(collapsed).length == 0 : true
    return c1 && c2
  })

  Handlebars.registerHelper('length', function (obj) {
    if (foundry.utils.getType(obj) === 'Object') return Object.values(obj).length
    if (foundry.utils.getType(obj) === 'Array') return obj.length
    return 0
  })

  /// NOTE:  To use this, you must use {{{gurpslink sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
  Handlebars.registerHelper('gurpslink', function (str, root, clrdmods = false) {
    // this is a stupid trick to 'unescape' HTML entities, like converting '&uuml;' to 'ü'
    var template = document.createElement('textarea')
    template.innerHTML = str
    str = template.childNodes[0]?.nodeValue || str // hack may not work, so default back to original string

    let actor = root?.data?.root?.actor
    if (!actor) actor = root?.actor
    return new Handlebars.SafeString(gurpslink(str, root == true || clrdmods == true))
  })

  /// NOTE:  To use this, you must use {{{gurpslinkbr sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
  // Same as gurpslink, but converts \n to <br> for large text values (notes)
  Handlebars.registerHelper('gurpslinkbr', function (str, root, clrdmods = false) {
    let actor = root?.data?.root?.actor
    if (!actor) actor = root?.actor
    return gurpslink(str, root == true || clrdmods == true).replace(/\\n/g, '<br/>')
  })

  Handlebars.registerHelper('listeqt', function (context, options) {
    var data
    if (options.data) data = Handlebars.createFrame(options.data)

    let ans = GURPS.listeqtrecurse(context, options, 0, data)
    return ans
  })

  /**
   * Convert a hierarchy of contained items into a flat map.
   *
   * The input is expected to be a map containing data elements; each element may also contain
   * another map of the exact same type as either a 'contains' or 'collapsed' property.
   *
   * What is returned is a single map in which all elements appear, with the appropriate property
   * keys. The individual elements will no longer contain the 'contains' or 'collapsed' properties.
   * The element will also be enhanced with the 'nesting level' of the data as an 'indent' property.
   */
  Handlebars.registerHelper('flatlist', function (context) {
    let data = {}
    flatlist(context, 0, '', data, false)
    return data
  })

  // Provides the same information as flatlist, but may check equipped status (based on system setting)
  Handlebars.registerHelper('attackflatlist', function (context) {
    let data = {}
    flatlist(
      context,
      0,
      '',
      data,
      false,
      game.settings.get(settings.SYSTEM_NAME, settings.SETTING_REMOVE_UNEQUIPPED) ? this.actor : null
    )
    return data
  })

  // Translate dynamic keys in Moustache templates
  Handlebars.registerHelper('localizeKey', function (key) {
    const localizedString = game.i18n.localize(key.toString())
    return new Handlebars.SafeString(localizedString)
  })

  const flatlist = function (context, level, parentkey, data, isCollapsed, actorToCheckEquipment) {
    if (!context) return data

    for (let key in context) {
      let item = context[key]
      let display = true
      if (actorToCheckEquipment) {
        // if we have been given an actor, then check to see if the melee or ranged item is equipped in the inventory
        let checked = false
        recurselist(actorToCheckEquipment.system.equipment.carried, e => {
          // check
          if (item.name.startsWith(e.name)) {
            checked = true
            if (!e.equipped) display = false
          }
        })
        if (!checked)
          recurselist(actorToCheckEquipment.system.equipment.other, e => {
            if (item.name.startsWith(e.name)) display = false
          })
      }
      if (display) {
        let newKey = parentkey + key

        let newItem = { indent: level }
        for (let propertyKey in item) {
          if (!['contains', 'collapsed', 'indent'].includes(propertyKey)) {
            newItem[propertyKey] = item[propertyKey]
          }
        }
        newItem['hasCollapsed'] = !!item?.collapsed && Object.values(item?.collapsed).length > 0
        newItem['hasContains'] = !!item?.contains && Object.values(item?.contains).length > 0
        newItem['isCollapsed'] = isCollapsed

        data[newKey] = newItem

        if (newItem['hasContains']) flatlist(item.contains, level + 1, newKey + '.contains.', data, isCollapsed)
        if (newItem['hasCollapsed']) flatlist(item.collapsed, level + 1, newKey + '.collapsed.', data, true)
      }
    }
  }

  Handlebars.registerHelper('listattack', function (src, key, options) {
    var data
    if (options.data) data = Handlebars.createFrame(options.data)

    let context = src[key]
    let ans = GURPS.listeqtrecurse(context, options, 0, data, '', src)
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
    // @ts-ignore
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
    return Maneuvers.getAllData()
  })

  Handlebars.registerHelper('getManeuver', function (name) {
    return Maneuvers.get(name)
  })

  Handlebars.registerHelper('listAllPostures', function () {
    const postures = GURPS.StatusEffect.getAllPostures()
    return postures
  })

  Handlebars.registerHelper('getPosture', function (name) {
    const postures = GURPS.StatusEffect.getAllPostures()
    return (
      postures[name] ?? {
        id: 'standing',
        img: 'systems/gurps/icons/statuses/dd-condition-standing.webp',
        name: 'GURPS.STATUSStanding',
      }
    ) // synthetic "Standing" object
  })

  Handlebars.registerHelper('showTheMath', function () {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_THE_MATH) ? 'checked' : ''
  })

  Handlebars.registerHelper('inCombat', function (data) {
    if (data.actor && !!game.combats.active) {
      return game.combats.active.combatants.contents
        .map(it => it.actor?.id)
        .filter(e => !!e)
        .includes(data?.actor?.id)
    }
    return false
  })

  // Allows handling of multiple page refs, e.g."B101,MA150"
  Handlebars.registerHelper('pdflink', function (link) {
    let txt = link
    if (Array.isArray(link)) txt = link.join(',')
    return !!txt
      ? txt
          .split(',')
          .map((/** @type {string} */ l) => gurpslink(`[PDF:${l}]`))
          .join(', ')
      : ''
  })

  // Allows handling of multiple page refs, e.g."B101,MA150" and external links
  Handlebars.registerHelper('pdflinkext', function (obj) {
    if (!obj) return ''
    let txt = obj.pageref
    if (Array.isArray(txt)) txt = txt.join(',')
    if (!txt) return ''
    return txt
      .split(',')
      .map((/** @type {string} */ l) => {
        if (!!obj.externallink) return `<a href="${obj.externallink}">*Link</a>`
        else if (l.match(/https?:\/\//i)) {
          return `<a href="${l}">*Link</a>`
        } else return gurpslink(`[PDF:${l}]`)
      })
      .join(', ')
  })

  Handlebars.registerHelper('round', function (num) {
    // remove any commas, the grab any leading signed number
    let temp = (num + '')
      .trim()
      .replace(',', '')
      .replace(/^(-?\d+(?:\.\d+)*?) +.*/, '$1')
    // @ts-ignore
    return +(Math.round(temp + 'e+2') + 'e-2')
  })

  Handlebars.registerHelper('toLocaleString', function (number) {
    return !!number ? number.toLocaleString() : '' // Add data protection
  })

  /**
   * Usage: {{displayNumber -1}} or {{displayNummber 1}} -- shows the number with a leading sign, such as "-1" or "+1".
   * Converts the negative sign (hyphen) into a &minus;.
   *
   * Use {{displayNumber 1 showPlus=false}} to prevent the "+" prefix for positive numbers.
   */
  Handlebars.registerHelper('displayNumber', function (num, options) {
    const hyphen = String.fromCharCode(45)

    let showPlus = options.hash?.showPlus === undefined ? true : options.hash?.showPlus || options.data?.root?.showPlus
    if (num != null) {
      if (parseInt(num) === 0) return showPlus ? '+0' : '0'
      if (parseInt(num) < 0) return num.toString().replace(hyphen, '&minus;')
      if (showPlus && num.toString()[0] !== '+') return `+${num}`
      return num.toString()
    } else return '' // null or undefined
  })

  Handlebars.registerHelper('invoke', function (object, options) {
    let name = options.hash?.method
    return object[name]()
  })

  Handlebars.registerHelper('displayDecimal', function (num, options) {
    if (num != null) {
      num = parseFloat(num.toString())

      let places = options.hash?.number ?? 1
      num = num.toFixed(places).toString()
      if (options.hash?.removeZeros) {
        while (num.toString().endsWith('0')) num = num.substr(0, num.length - 1)
        if (num.toString().endsWith('.')) num = num.substr(0, num.length - 1)
      }

      if (parseFloat(num) < 0) return num.toString().replace('-', '&minus;')

      if (options.hash?.forceSign && num.toString()[0] !== '+') return `+${num}`
      return num.toString()
    } else return '' // null or undefined
  })

  Handlebars.registerHelper('optionSetStyle', function (boolean) {
    return !!boolean ? 'buttonpulsatingred' : 'buttongrey'
  })

  /**
   * Find the key of the tracker with the given name.
   */
  Handlebars.registerHelper('trackerIndex', function (data, trackerName) {
    if (!!data && !!data.additionalresources?.tracker) {
      let tracker = data.additionalresources.tracker
      // find the tracker with trackerName
      let found = Object.keys(tracker).find(it => tracker[it].name === trackerName)
      if (!!found) {
        return found
      }
    }
    return null
  })

  /**
   * Find the tracker with the given name.
   */
  Handlebars.registerHelper('tracker', findTracker)

  /**
   * Returns the index of the first threshold that matches the value.
   */
  Handlebars.registerHelper('threshold-of', function (thresholds, max, value) {
    // return the index of the threshold that the value falls into
    let result = null
    thresholds.some(
      function (
        /** @type {{ operator: string; comparison: string; value: number; }} */ threshold,
        /** @type {number} */ index
      ) {
        let op = getOperation(threshold.operator)
        let comparison = getComparison(threshold.comparison)
        let testValue = op(max, threshold.value)
        return comparison(value, testValue) ? ((result = index), true) : false
      }
    )
    return result
  })

  /**
   * Unlike the 'threshold-of' method above, this returns the *last* threshold whose condition matches.
   */
  Handlebars.registerHelper('breakpoint-of', function (thresholds, max, value) {
    // return the index of the threshold that the value falls into
    let matches = thresholds.filter(function (threshold, index) {
      let op = getOperation(threshold.operator)
      let comparison = getComparison(threshold.comparison)
      let testValue = op(max, threshold.value)
      return comparison(value, testValue)
    })

    return matches.pop()
  })

  /**
   * Unlike the 'threshold-of' method above, this returns the index of the *last* threshold whose condition matches.
   */
  Handlebars.registerHelper('breakpointIndex-of', function (thresholds, max, value) {
    // return the index of the threshold that the value falls into
    let matches = thresholds.filter(function (threshold, index) {
      let op = getOperation(threshold.operator)
      let comparison = getComparison(threshold.comparison)
      let testValue = op(max, threshold.value)
      return comparison(value, testValue)
    })

    return thresholds.lastIndexOf(matches.pop())
  })

  /**
   * Return an array of the calculated breakpoint values along with the matching threshold.
   */
  Handlebars.registerHelper('thresholdBreakpoints', function (tracker) {
    let results = []
    tracker.thresholds.forEach(threshold => {
      let op = getOperation(threshold.operator)
      let temp = op(tracker.max, threshold.value)
      let value = tracker.isDamageTracker ? Math.ceil(temp) : Math.floor(temp)

      results.push({
        breakpoint: value,
        threshold: threshold,
      })
    })
    return results
  })

  Handlebars.registerHelper('truthy', function (value) {
    return !!value
  })

  /**
   * TODO Maybe unnecessary -- just use 'thresholdBreakpoints', above??
   */
  Handlebars.registerHelper('controlBreakpoints', function (tracker) {
    let results = []
    tracker.thresholds.forEach(threshold => {
      let op = getOperation(threshold.operator)
      let temp = op(tracker.max, threshold.value)
      let value = Math.ceil(temp)

      results.push({
        breakpoint: value,
        label: threshold.condition,
        comparison: threshold.comparison,
        color: threshold.color,
        abbreviation: threshold.abbreviation,
      })
    })
    return results
  })

  Handlebars.registerHelper('include-if', function (condition, iftrue, iffalse) {
    if (arguments.length == 3) iffalse = ''
    return !!condition ? iftrue : iffalse
  })

  Handlebars.registerHelper('select-if', function (value, expected) {
    return value == expected ? 'selected' : ''
  })

  Handlebars.registerHelper('disabled', function (value) {
    return !!value ? 'disabled' : ''
  })

  Handlebars.registerHelper('gmod', function (value) {
    return !!value ? 'gmod' : ''
  })

  Handlebars.registerHelper('rollable', function (value) {
    return !!value ? 'rollable' : ''
  })

  Handlebars.registerHelper('isUserCreated', function (obj) {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_USER_CREATED) && !!obj.save
  })

  Handlebars.registerHelper('isFoundryItem', function (obj) {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_FOUNDRY_CREATED) && !!obj.itemid
  })

  Handlebars.registerHelper('isFoundryGlobalItem', function (obj, doc) {
    let item
    const actor = doc.data?.root?.document
    item = actor?.items?.get(obj.itemid)
    return (
      game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_FOUNDRY_GLOBAL_ITEMS) && !!item?.system.globalid
    )
  })

  Handlebars.registerHelper('isImportedItem', function (obj) {
    return !!obj.fromItem
  })

  Handlebars.registerHelper('parentItemTooltip', function (obj, doc) {
    // Find parent item using fromItem
    const actor = doc.data?.root?.document
    let parentItem = actor?.items?.get(obj.fromItem)
    return !!parentItem
      ? new Handlebars.SafeString(
          game.i18n.format('GURPS.parentItemTooltip', { name: parentItem.name, ['type']: parentItem.type })
        )
      : ''
  })

  Handlebars.registerHelper('globalItemTooltip', function (obj, doc) {
    // Find global item using globalid
    const actor = doc.data?.root?.document
    let item = actor?.items?.get(obj.itemid)
    if (!!item?.system.globalid) item = game.items.find(it => it.id === item.system.globalid.split('.').pop())
    return !!item
      ? new Handlebars.SafeString(
          game.i18n.format('GURPS.parentItemTooltip', { name: item.name, ['type']: `game ${item.type}` })
        )
      : game.i18n.localize('GURPS.droppedItem')
  })

  Handlebars.registerHelper('ignoreImportQty', function (obj) {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_ignoreImportQty) && !!obj.ignoreImportQty
  })

  Handlebars.registerHelper('displayItemHover', function (obj, doc) {
    if (!game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_FOUNDRY_CREATED)) return
    if (!!obj.img && obj.img !== 'icons/svg/item-bag.svg') return obj.img
    const actor = doc.data?.root?.document
    const item = actor?.items.get(obj.itemid)
    return item?.img
  })

  Handlebars.registerHelper('showItemImage', function (obj, doc) {
    const show = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_ITEM_IMAGE)
    const actor = doc.data?.root?.document
    const item = actor?.items.get(obj.itemid)
    return !!show[item?.type] && !!item?.img
  })

  Handlebars.registerHelper('getItemImage', function (obj, doc) {
    const actor = doc.data?.root?.document
    const item = actor?.items.get(obj.itemid)
    return item?.img
  })

  Handlebars.registerHelper('automaticEncumbrance', function () {
    return game.settings.get(settings.SYSTEM_NAME, settings.SETTING_AUTOMATIC_ENCUMBRANCE)
  })

  Handlebars.registerHelper('DRisModified', function (obj) {
    return !!obj.drMod && obj.drMod !== 0
  })

  Handlebars.registerHelper('DRTooltip', function (obj) {
    const actor = obj.data?.root?.document
    if (!actor) return ''
    return actor.getDRTooltip(obj.data.key)
  })

  Handlebars.registerHelper('first', function (array) {
    return array[0]
  })

  Handlebars.registerHelper('multiplyDice', function (formula, count) {
    return multiplyDice(formula, count)
  })

  Handlebars.registerHelper('collapsible-content', function (id, data, group, options) {
    let title = data[0]
    let type = !!group && group.length > 0 ? `type='radio' name='${group}'` : `type='checkbox'`
    let content = data
      .slice(1)
      .map((/** @type {string} */ it) =>
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

  Handlebars.registerHelper('damageTerm', function (calc, options) {
    let armorDivisor =
      calc.useArmorDivisor && calc.armorDivisor //
        ? calc.armorDivisor == -1
          ? '(∞)'
          : `(${calc.armorDivisor})` //
        : ''

    let damageType =
      calc.damageType !== 'dmg' && calc.damageType !== 'injury' && calc.damageType !== 'none' ? calc.damageType : ''
    let damageModifier = calc.damageModifier || ''
    return [armorDivisor, damageType, damageModifier].join(' ').trim()
  })

  /**
   * Added to color the rollable parts of the character sheet.
   * Made this part eslint compatible...
   * ~Stevil
   */
  // eslint-disable-next-line no-undef
  Handlebars.registerHelper('switch', function (value, options) {
    this.switch_value = value
    this.switch_break = false
    return options.fn(this)
  })

  // eslint-disable-next-line no-undef
  Handlebars.registerHelper('case', function (value, options) {
    if (value === this.switch_value) {
      this.switch_break = true
      return options.fn(this)
    }
  })

  // eslint-disable-next-line no-undef
  Handlebars.registerHelper('default', function (value, options) {
    if (this.switch_break == false) {
      return value
    }
  })

  Handlebars.registerHelper('quotedAttackName', function (prefix, item) {
    return prefix + ':' + quotedAttackName(item)
  })

  // === register Handlebars partials ===
  // Partial name will be the last component of the path name, e.g.: 'systems/gurps/templates/actor/foo.hbs" -- the name is "foo".
  // Use it in an HTML/HBS file like this: {{> foo }}.
  // See https://handlebarsjs.com/guide/partials.html#partials for more documentation.
  const templates = [
    'systems/gurps/templates/actor/sections/advantages.hbs',
    'systems/gurps/templates/actor/sections/attributes.hbs',
    'systems/gurps/templates/actor/sections/basic-attributes.hbs',
    'systems/gurps/templates/actor/sections/ci-editor.hbs',
    'systems/gurps/templates/actor/sections/conditional-injury.hbs',
    'systems/gurps/templates/actor/sections/conditionalmods.hbs',
    'systems/gurps/templates/actor/sections/conditions.hbs',
    'systems/gurps/templates/actor/sections/description.hbs',
    'systems/gurps/templates/actor/sections/dr-tooltip.hbs',
    'systems/gurps/templates/actor/sections/encumbrance.hbs',
    'systems/gurps/templates/actor/sections/footer.hbs',
    'systems/gurps/templates/actor/sections/equipment.hbs',
    'systems/gurps/templates/actor/sections/hpfp-editor.hbs',
    'systems/gurps/templates/actor/sections/hpfp-tracker.hbs',
    'systems/gurps/templates/actor/sections/identity.hbs',
    'systems/gurps/templates/actor/sections/lifting.hbs',
    'systems/gurps/templates/actor/sections/locations.hbs',
    'systems/gurps/templates/actor/sections/melee.hbs',
    'systems/gurps/templates/actor/sections/miscellaneous.hbs',
    'systems/gurps/templates/actor/sections/notes.hbs',
    'systems/gurps/templates/actor/sections/points.hbs',
    'systems/gurps/templates/actor/sections/portrait.hbs',
    'systems/gurps/templates/actor/sections/quicknote.hbs',
    'systems/gurps/templates/actor/sections/ranged.hbs',
    'systems/gurps/templates/actor/sections/reactions.hbs',
    'systems/gurps/templates/actor/sections/resource-controls.hbs',
    'systems/gurps/templates/actor/sections/resource-tracker.hbs',
    'systems/gurps/templates/actor/sections/secondary-attributes.hbs',
    'systems/gurps/templates/actor/sections/skills.hbs',
    'systems/gurps/templates/actor/sections/speed-range-table.hbs',
    'systems/gurps/templates/actor/sections/spells.hbs',
    'systems/gurps/templates/actor/sections/trackers.hbs',
    'systems/gurps/templates/item/sections/items.hbs',
    'systems/gurps/templates/item/sections/features.hbs',
    'systems/gurps/templates/item/sections/skill.hbs',
    'systems/gurps/templates/item/sections/spell.hbs',
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
