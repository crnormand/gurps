'use strict'

export function displayMod(mod) {
  if (!mod) mod = '0'
  let n = mod.toString().trim()
  if (n[0] != '-' && n[0] != '+') n = '+' + n
  return n
}

/* For really big lists, use Select Optgroups.   

The first line is the "title", followed by Optgroup names, then options in 
that optgroup.

Use the function makeSelect() to convert an array of strings into a data 
structure that can be displayed with the following:

  data.posturemods = makeSelect(game.GURPS.CoverPostureModifiers);

  <select id="modposture">
    <option>{{posturemods.title}}</option>
    {{#each posturemods.groups}}
      <optgroup label="{{this.group}}">
      {{#each this.options}}
        <option value="{{this}}">{{this}}</option>
      {{/each}}
      </optgroup>
    {{/each}}
  </select>
*/
export function makeSelect(array) {
  let groups = []

  // The title line. Since we don't allow the select's to change, the first element in the select acts as its title.
  let ans = { title: array[0], groups: groups }

  let current = []
  for (let i = 1; i < array.length; i++) {
    let line = array[i]
    if (line[0] == '*') {
      current = []
      groups.push({ group: line.substr(1), options: current })
    } else {
      current.push(line)
    }
  }
  return ans
}

// Trick to make a nice break between items, instead of "---"
export function horiz(text, size = 10) {
  return `<div class='subtitle'>${text}</div>`
}

/*
  Convert XML text into a JSON object
*/
export function xmlTextToJson(text) {
  var xml = new DOMParser().parseFromString(text, 'application/xml')
  return xmlToJson(xml)
}

/*
  Convert a DOMParsed version of the XML, return a JSON object.
*/
export function xmlToJson(xml) {
  // Create the return object
  var obj = {}

  if (xml.nodeType == 1) {
    // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj['@attributes'] = {}
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j)
        obj['@attributes'][attribute.nodeName] = attribute.nodeValue
      }
    }
  } else if (xml.nodeType == 3) {
    // text
    obj = xml.nodeValue
  }

  // do children
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i)
      var nodeName = item.nodeName
      if (typeof obj[nodeName] == 'undefined') {
        obj[nodeName] = xmlToJson(item)
      } else {
        if (typeof obj[nodeName].push == 'undefined') {
          var old = obj[nodeName]
          obj[nodeName] = []
          obj[nodeName].push(old)
        }
        obj[nodeName].push(xmlToJson(item))
      }
    }
  }
  return obj
}

export function d6ify(str) {
  let w = str.replace(/d([^6])/g, 'd6$1') // Find 'd's without a 6 behind it, and add it.
  return w.replace(/d$/g, 'd6') // and do the same for the end of the line.
}

export function isNiceDiceEnabled() {
  // Is Dice So Nice enabled ?
  let niceDice = false
  try {
    niceDice = game.settings.get('dice-so-nice', 'settings').enabled
  } catch {}
  return niceDice
}

/**
 * Try to parse value as an integer and return it if success. Otherwise
 * return defaultValue.
 * @param {any} value
 * @param {int} defaultValue
 */
export function parseIntFrom(value, defaultValue = 0) {
  if (value === null || value === 'undefined' || value === '') return defaultValue
  return parseInt(value)
}

/**
 * Try to parse value as a float and return it if success. Otherwise
 * return defaultValue.
 * @param {any} value
 * @param {float} defaultValue
 */
export function parseFloatFrom(value, defaultValue = 0) {
  if (value === null || value === 'undefined' || value === '') return defaultValue
  return parseFloat(value)
}

export const isArray =
  Array.isArray ||
  function (value) {
    return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false
  }

export function isEmpty(value) {
  if (!value && value !== 0) {
    return true
  } else if (isArray(value) && value.length === 0) {
    return true
  } else {
    return false
  }
}

export function zeroFill(number, width) {
  width -= number.toString().length
  if (width > 0) {
    return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number
  }
  return number + '' // always return a string
}

export function extractP(string) {
  let v = ''
  if (!!string) {
    let s = string.split('\n')
    for (let b of s) {
      if (!!b) {
        if (b.startsWith('@@@@')) {
          b = b.substr(4)
          v += atou(b) + '\n'
        } else v += b + '\n'
      }
    }
  }
  // Maybe a temporary fix? There are junk characters at the start and end of
  // this string after decoding. Example: ";p&gt;Heavy Mail Hauberk↵/p>↵"
  return v
    .replace(/^;p&gt;/, '')
    .replace(/\n$/, '')
    .replace(/\/p\>$/, '')
}

// Take a string like "", "-", "3", "4-5" and convert it into an array of int.
// The resulting array will contain all ints between the first number and the last.
// E.g, if the input is '2-5' the result will be [2,3,4,5]. Non-numeric inputs
// result in the empty array.
export function convertRollStringToArrayOfInt(text) {
  let elements = text.split('-')
  let range = elements.map(it => parseInt(it))

  if (range.length === 0) return []

  for (let i = 0; i < range.length; i++) {
    if (typeof range[i] === 'undefined' || isNaN(range[i])) return []
  }

  let results = []
  for (let i = range[0]; i <= range[range.length - 1]; i++) results.push(i)

  return results
}

export function recurselist(list, fn, parentkey = '', depth = 0) {
  if (!!list)
    for (const [key, value] of Object.entries(list)) {
      if (fn(value, parentkey + key, depth) != false) {
        recurselist(value.contains, fn, parentkey + key + '.contains.', depth + 1)
        recurselist(value.collapsed, fn, parentkey + key + '.collapsed.', depth + 1)
      }
    }
}

export function getAllActorsInActiveScene() {
  let activeScene = game.scenes.active
  let tokens = activeScene.data.tokens
  let actorIds = tokens.map(it => it.actorId)
  let targets = []
  actorIds.forEach(id => targets.push(game.actors.get(id)))
  return targets
}

export function generateUniqueId() {
  return randomID()
}

/**
 * ASCII to Unicode (decode Base64 to original data)
 * @param {string} b64
 * @return {string}
 */
export function atou(b64) {
  return decodeURIComponent(escape(atob(b64)))
}

/**
 * Unicode to ASCII (encode data to Base64)
 * @param {string} data
 * @return {string}
 */
export function utoa(data) {
  return btoa(unescape(encodeURIComponent(data)))
}

/**
 * Converts any Array into an Object. Each element of the array will be a property of
 * the returned object, with a key equal to the index into the array converted to a
 * String of length <indexLength>. The String is padded with leading zeros to get the
 * required length.
 *
 * @param {Array<any>} array
 * @param {Number} indexLength - number of characters to use as the property key
 * @returns Object
 */
export function arrayToObject(array, indexLength = 4) {
  let data = {}
  array.forEach((item, index) => {
    data[zeroFill(index, indexLength)] = item
  })
  return data
}

/**
 * Converts an object into an array of its property values. The order of properties will be the
 * natural sorting order of the keys.
 *
 * WARNING:
 * The intent is to provide the reverse of the arrayToObject function (above), where an array is
 * converted into an Object. The property values in that case are the elements of the array, and
 * the keys are the element's index converted into a zero-padded string: 0 -> "0000", 1 -> "0001",
 * 12 -> "0012", etc.
 *
 * However, there are no sanity checks of any kind done to ensure that the object matches the
 * output of the arrayToObject() method; any object will be converted to an array of its property
 * values, losing the values of its keys if they do not correspond to the array index.
 *
 * @param {Object} object
 * @returns an Array of property values
 */
export function objectToArray(object) {
  let array = []
  Object.entries(object)
    .sort(it => it.key) // ensure entries are in index order
    .forEach(([_, value]) => {
      array.push(value)
    })
  return array
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

/**
 * Utility function to map math symbol to their corresponding functions.
 * @param {*} threshold
 * @returns
 */
export function getOperation(operator) {
  let op = function (a, b) {
    return a + b
  }

  if (operator === '×')
    op = function (a, b) {
      return a * b
    }
  else if (operator === '÷')
    op = function (a, b) {
      return a / b
    }
  else if (operator === '−')
    op = function (a, b) {
      return a - b
    }

  return op
}

/**
 * Utility function to map comparison symbols (like '>') to the appropriate boolean function.
 * @param {} threshold
 * @returns
 */
export function getComparison(symbol) {
  let comparison = function (a, b) {
    return a < b
  }

  if (symbol === '>')
    comparison = function (a, b) {
      return a > b
    }
  else if (symbol === '≥')
    comparison = function (a, b) {
      return a >= b
    }
  else if (symbol === '≤')
    comparison = function (a, b) {
      return a <= b
    }

  return comparison
}

export function i18n(value, fallback) {
  let result = game.i18n.localize(value)
  if (!!fallback) return value === result ? fallback : result
  return result
}

export function i18n_f(value, data, fallback) {
  let template = game.i18n.has(value) ? value : fallback
  let result = game.i18n.format(template, data)
  if (!!fallback) return value === result ? fallback : result
  return result
}

// Take a string of arguments and break them into an array, supporting matched single or double quotes
export function splitArgs(str) {
  var regexp = /[^\s"]+|"([^"]*)"/gi
  var dq = str.indexOf('"')
  var sq = str.indexOf("'")
  if (sq >= 0) if (dq == -1 || sq < dq) regexp = /[^\s']+|'([^']*)'/gi
  var answer = []

  do {
    //Each call to exec returns the next regex match as an array
    var match = regexp.exec(str)
    if (match != null) {
      //Index 1 in the array is the captured group if it exists
      //Index 0 is the matched text, which we use if no captured group exists
      answer.push(match[1] ? match[1] : match[0])
    }
  } while (match != null)
  return answer
}

/**
 * Takes an object literal like { dice: 2, adds: -1 } and returns a Foundry dice formula.
 * @param {*} dice
 * @param {Boolean} minimum - if true, set the minimum of 1 flag
 */
export function diceToFormula(dice, minimum = false) {
  return `${dice.dice}d6${minimum ? '!' : ''}${dice.adds < 0 ? '-' : '+'}${Math.abs(dice.adds)}`
}

export function makeRegexPatternFrom(text, end = true, start = true) {
  // defaults to exact match
  let pattern = text.split('*').join('.*?').replace(/\(/g, '\\(').replace(/\)/g, '\\)') // Make string into a RegEx pattern
  pattern = pattern.replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\+/g, '\\+')
  let s = start ? '^' : ''
  let e = end ? '$' : ''
  return s + pattern.trim() + e
}

export function locateToken(identifier) {
  let pattern = makeRegexPatternFrom(identifier)

  let tokens = canvas.tokens.placeables // all Placeables on canvas
    .filter(it => it.constructor.name === 'Token') // only Tokens

  // try token IDs first
  let matches = tokens.filter(it => it.id.match(pattern))

  // No good match on token IDs, try actor IDs
  if (matches.length == 0 || matches.length > 1) {
    matches = tokens.filter(it => it?.actor.id.match(pattern))
  }

  // No good match on actor IDs, try token names
  if (matches.length == 0 || matches.length > 1) {
    matches = tokens.filter(it => it.name.match(pattern)) // the Tokens which match the pattern
  }

  // No good match on tokens, try the associated actor names
  if (matches.length == 0 || matches.length > 1) {
    matches = tokens.filter(it => it.actor?.name.match(pattern)) // Tokens can have null actors
  }

  return matches
}

// Sanitize a string for parsing
export function sanitize(str) {
  str = str.replace(/%(?![0-9][0-9a-fA-F]+)/g, '%25')
  str = decodeURIComponent(str) // convert % (not followed by 2 digit hex) to %25, unicode characters into html format
  str = str.replace(/&nbsp;/g, ' ') // we need to convert non-breaking spaces into regular spaces for parsing
  str = str.replace(/&amp;/g, '&') // we need to convert to & for easier parsing
  str = str.replace(/(&#215;|&#xD7;|&times)/g, 'x') // we need to convert the multiplication symbol to x for easier parsing
  str = str.replace(/(<([^>]+)>)/gi, '') // remove <html> tags
  str = str.replace(/(\u201c|\u201d)/g, '"') // double quotes
  str = str.replace(/&quot;/g, '"') // double quotes
  str = str.replace(/(\u2018|\u2019)/g, "'") // single quotes
  str = str.replace(/\u2011/g, '-') // replace non-breaking hyphon with a minus sign
  return str
}

export function wait(millisecondDelay) {
  return new Promise(resolve => setTimeout(resolve, millisecondDelay))
}
