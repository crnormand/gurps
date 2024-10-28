'use strict'

/**
 * @param {string | number} mod
 */
export function displayMod(mod) {
  if (!mod) mod = '0'
  let n = mod.toString().trim()
  if (!n.startsWith('-') && !n.startsWith('+')) n = '+' + n
  return n
}

/* For really big lists, use Select Optgroups.   

The first line is the "title", followed by Optgroup names, then options in 
that optgroup.

Use the function makeSelect() to convert an array of strings into a data 
structure that can be displayed with the following:

  data.posturemods = makeSelect(GURPS.CoverPostureModifiers);

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
/**
 * @param {any[]} array
 */
export function makeSelect(array) {
  /** @type {{ group: string; options: string[]; }[]}  */
  let groups = []

  // The title line. Since we don't allow the select's to change, the first element in the select acts as its title.
  let ans = { title: array[0], groups: groups }

  /** @type {string[]} */
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
/**
 * @param {string} text
 */
export function horiz(text, size = 10) {
  return `<div class='subtitle'>${text}</div>`
}

/*
  Convert XML text into a JSON object
*/
/**
 * @param {string} text
 */
export function xmlTextToJson(text) {
  var xml = new DOMParser().parseFromString(text, 'application/xml')
  return xmlToJson(xml)
}

/*
  Convert a DOMParsed version of the XML, return a JSON object.
*/
/**
 * @param {Node} xml
 */
export function xmlToJson(xml) {
  /** @type {Record<String, any>} Create the return object */
  var obj = {}

  if (xml.nodeType == Node.ELEMENT_NODE) {
    let element = /** @type {Element} */ (/** @type {unknown} */ (xml))
    // do attributes
    if (element.attributes.length > 0) {
      obj['@attributes'] = {}
      for (var j = 0; j < element.attributes.length; j++) {
        var attribute = element.attributes.item(j)
        if (attribute) obj['@attributes'][attribute.nodeName] = attribute?.nodeValue
      }
    }
  } else if (xml.nodeType == Node.TEXT_NODE) {
    return xml.nodeValue
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

/**
 * @param {string} str
 * @param {string | null} flavor
 * @returns {string}
 */
export function d6ify(str, flavor = null) {
  let w = str.replace(/d([^6])/g, `d6${flavor || ''}$1`) // Find 'd's without a 6 behind it, and add it.
  return w.replace(/d$/g, `d6${flavor || ''}`) // and do the same for the end of the line.
}

/**
 * @returns {boolean}
 */
export function isNiceDiceEnabled() {
  // Is Dice So Nice enabled ?
  let niceDice = false
  try {
    niceDice = !!game.settings.get('dice-so-nice', 'settings') // no longer have the enabled flag
  } catch { }
  return niceDice
}

/**
 * Try to parse value as an integer and return it if success. Otherwise
 * return defaultValue.
 *
 * @param {any} value
 * @param {number} defaultValue
 */
export function parseIntFrom(value, defaultValue = 0) {
  if (value === null || value === 'undefined' || value === '') return defaultValue
  return parseInt(value)
}

/**
 * Try to parse value as a float and return it if success. Otherwise
 * return defaultValue.
 *
 * @param {any} value
 * @param {number} defaultValue
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

/**
 * @param {any} value
 * @returns {boolean}
 */
export function isEmpty(value) {
  if (!value && value !== 0) {
    return true
  } else if (isArray(value) && value.length === 0) {
    return true
  } else {
    return false
  }
}

/**
 * @param {any} value
 * @returns {boolean}
 */
export function isEmptyObject(value) {
  if (!value) return true
  return Object.keys(value).length === 0
}

/**
 * @param {number} number
 * @param {number} width
 * @returns {string}
 */
export function zeroFill(number, width = 5) {
  width -= number.toString().length
  if (width > 0) {
    return new Array(width + (/\./.test(number.toString()) ? 2 : 1)).join('0') + number
  }
  return number + '' // always return a string
}

/**
 * @param {string} string
 * @returns {string}
 */
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
/**
 * @param {string} text
 * @returns {number[]}
 */
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

/**
 * @param {Object} list
 * @param {(value: any, key: string, depth: number) => boolean | void | Promise<boolean|void>} fn
 * @param {string} parentkey
 * @param {number} depth
 */
export function recurselist(list, fn, parentkey = '', depth = 0) {
  if (!!list)
    for (const [key, value] of Object.entries(list)) {
      if (fn(value, parentkey + key, depth) !== false) {
        recurselist(value.contains, fn, parentkey + key + '.contains.', depth + 1)
        recurselist(value.collapsed, fn, parentkey + key + '.collapsed.', depth + 1)
      }
    }
}

/**
 * @param {Object} list
 * @param {Promise<any>} pm
 * @param {string} parentkey
 * @param {number} depth
 */
export async function aRecurselist(list, pm, parentkey = '', depth = 0) {
  if (!!list)
    for (const [key, value] of Object.entries(list)) {
      if ((await pm(value, parentkey + key, depth)) !== false) {
        await aRecurselist(value.contains, pm, parentkey + key + '.contains.', depth + 1)
        await aRecurselist(value.collapsed, pm, parentkey + key + '.collapsed.', depth + 1)
      }
    }
}

export function generateUniqueId() {
  return foundry.utils.randomID()
}

/**
 * ASCII to Unicode (decode Base64 to original data)
 * @param {string} b64
 * @returns {string}
 */
export function atou(b64) {
  return decodeURIComponent(escape(atob(b64)))
}

/**
 * Unicode to ASCII (encode data to Base64)
 * @param {string} data
 * @returns {string}
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
  let data = /** @type {{[key: string]: string}} */ ({})
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
 * @param {Object|{ [key: string]: any}} object
 * @returns {any[]} an Array of property values
 */
export function objectToArray(object) {
  return Object.keys(object)
    .sort()
    .map(key => object[key])
}

/**
 * @param {any} condition
 * @param {any} message
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

/**
 * Utility function to map math symbol to their corresponding functions.
 * @param {string} operator
 * @returns {(a: number, b: number) => number}
 */
export function getOperation(operator) {
  let op = function (/** @type {number} */ a, /** @type {number} */ b) {
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
 * @param {string} symbol
 * @returns {(a: number, b: number) => boolean}
 */
export function getComparison(symbol) {
  let comparison = function (/** @type {number} */ a, /** @type {number} */ b) {
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

/**
 * @param {string} value
 * @param {string | undefined} [fallback]
 */
export function i18n(value, fallback) {
  let result = game.i18n.localize(value)
  if (!!fallback) return value === result ? fallback : result
  return result
}

/**
 * @param {string} value
 * @param {Object} data
 * @param {string | undefined} [fallback]
 */
export function i18n_f(value, data, fallback) {
  let template = game.i18n.has(value) ? value : fallback
  if (!template) return value
  let result = game.i18n.format(template, data)
  if (!!fallback) return value === result ? fallback : result
  return result
}

// Take a string of arguments and break them into an array, supporting matched single or double quotes
/**
 * @param {string} str
 */
export function splitArgs(str) {
  var regexp = /[^\s"]+|"([^"]*)"/gi
  var dq = str.indexOf('"')
  var sq = str.indexOf("'")
  var numsq = str.length - str.replace("'", '').length
  if (sq >= 0 && numsq > 1) if (dq == -1 || sq < dq) regexp = /[^\s']+|'([^']*)'/gi
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
 * @param {{dice: number, adds: number}} dice
 * @param {boolean} minimum - if true, set the minimum of 1 flag
 * @param {string} flavor
 * @returns {string}
 */
export function diceToFormula(dice, flavor, minimum = false) {
  return `${dice.dice}d6${minimum ? '!' : ''}${flavor || ''}${dice.adds < 0 ? '-' : '+'}${Math.abs(dice.adds)}`
}

/**
 * @param {string} text
 * @returns {string}
 */
export function makeRegexPatternFrom(text, end = true, start = true) {
  // defaults to exact match
  let pattern = text.split('*').join('.*?').replace(/\(/g, '\\(').replace(/\)/g, '\\)') // Make string into a RegEx pattern
  pattern = pattern.replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\+/g, '\\+')
  pattern = pattern.replace(/\^/g, '\\^')
  let s = start ? '^' : ''
  let e = end ? '$' : ''
  return s + pattern.trim() + e
}

/**
 * @param {string} identifier
 * @returns {Token[]}
 */
export function locateToken(identifier) {
  let pattern = makeRegexPatternFrom(identifier)

  /** @type {Token[]} */ let matches = []

  let tokens = canvas.tokens?.placeables
  if (!!tokens) {
    // try token IDs first
    matches = tokens.filter(it => it.id.match(pattern))

    // No good match on token IDs, try actor IDs
    if (matches.length == 0 || matches.length > 1) {
      matches = tokens.filter(it => it.actor?.id?.match(pattern))
    }

    // No good match on actor IDs, try token names
    if (matches.length == 0 || matches.length > 1) {
      matches = tokens.filter(it => it.name.match(pattern)) // the Tokens which match the pattern
    }

    // No good match on tokens, try the associated actor names
    if (matches.length == 0 || matches.length > 1) {
      matches = tokens.filter(it => it.actor?.name?.match(pattern)) // Tokens can have null actors
    }
  }

  return matches
}

// Sanitize a string for parsing
/**
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
  str = str.replace(/%(?![0-9][0-9a-fA-F]+)/g, '%25')
  str = decodeURIComponent(str) // convert % (not followed by 2 digit hex) to %25, unicode characters into html format
  str = str.replace(/&nbsp;/g, ' ') // we need to convert non-breaking spaces into regular spaces for parsing
  str = str.replace(/&amp;/g, '&') // we need to convert to & for easier parsing
  str = str.replace(/&minus;/g, '-') // we need to convert to - for easier parsing
  str = str.replace(/&plus;/g, '+') // we need to convert to - for easier parsing
  str = str.replace(/(&#215;|&#xD7;|&times)/g, 'x') // we need to convert the multiplication symbol to x for easier parsing
  str = str.replace(/(<([^>]+)>)/gi, '') // remove <html> tags
  str = str.replace(/(\u201c|\u201d)/g, '"') // double quotes
  str = str.replace(/&quot;/g, '"') // double quotes
  str = str.replace(/&#x27;/g, "'") // single quotes
  str = str.replace(/\u2011/g, '-') // replace non-breaking hyphon with a minus sign
  str = str.replace(/\u2212/g, '-') // unicode minus to minus
  return str
}

/**
 * @param {number} millisecondDelay
 */
export function wait(millisecondDelay) {
  return new Promise(resolve => setTimeout(resolve, millisecondDelay))
}

/**
 * This function might be good enough to make most elements draggable, with
 * proper feedback (drag image, css class during drag, etc.)
 *
 * @param {HTMLElement} element
 * @param {string} type DragEvent data transfer type
 * @param {string} cssClass CSS class to apply to element while dragging
 * @param {any} payload drag data
 * @param {Element|undefined} dragImage Element to display while dragging
 * @param {[number, number]} offset drag image offets
 */
export function makeElementDraggable(element, type, cssClass, payload, dragImage, [x, y]) {
  // make the element draggable
  element.setAttribute('draggable', 'true')

  // When drag starts:
  // - set the class of the target to visibly show that its data is being dragged;
  // - set the drag image;
  // - add the data to the event.dataTransfer
  element.addEventListener('dragstart', ev => {
    if (ev.currentTarget && ev.dataTransfer) {
      $(ev.currentTarget).addClass(cssClass)

      if (dragImage) ev.dataTransfer.setDragImage(dragImage, x, y)
      let data = {
        type: type,
        payload: payload,
      }
      return ev.dataTransfer.setData('text/plain', JSON.stringify(data))
    }
  })

  // When drag ends, remove the class on the target.
  element.addEventListener('dragend', ev => {
    if (ev.currentTarget) $(ev.currentTarget).removeClass(cssClass)
  })
}

export function arrayBuffertoBase64(buffer) {
  /*  var binary = ''
  var bytes = new Uint8Array(buffer)
  var len = bytes.byteLength
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return binary
  */
  // User fixc for UTF characers on Mac and Linux hosts
  return new TextDecoder().decode(buffer)
}

export function quotedAttackName(item) {
  let q = '"'
  let n = item.name
  if (n.includes(q)) q = "'"
  if (!!item.mode) n = n + ' (' + item.mode + ')'
  if (n.includes(' ')) n = q + n + q
  return n
}

export function requestFpHp(resp) {
  resp.targets.forEach(tuple => {
    let a = game.canvas.tokens.get(tuple[1]).actor
    let o = !!tuple[0] ? game.users.get(tuple[0]) : game.user
    if (o.isSelf && a.isOwner) {
      setTimeout(
        () =>
          Dialog.confirm({
            title: `${resp.actorname}`,
            content: i18n_f('GURPS.chatWantsToExecute', { command: resp.command, name: a.name }),
            yes: y => {
              let old = GURPS.LastActor
              GURPS.SetLastActor(a)
              GURPS.executeOTF(resp.command).then(p => GURPS.SetLastActor(old))
            },
          }),
        50
      )
    }
  })
}

/**
 * Compares two arrays for equality.
 *
 * @param {Array} arr1 - The first array to compare.
 * @param {Array} arr2 - The second array to compare.
 * @return {boolean} - Returns true if both arrays are equal, otherwise false.
 */
export const arraysEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false
  }
  return true
}

/**
 * Compares two college lists to determine if they are identical.
 *
 * GCA import Spell Colleges as string. Ex. Fire, Water
 * GCS import Spell Colleges as arrays. Ex. ['Fire', 'Water']
 *
 * @param {Array|string} a - The first college list to compare.
 * @param {Array|string} b - The second college list to compare.
 * @returns {boolean} Returns true if both inputs represent the same list of colleges; otherwise, returns false.
 */
export const compareColleges = (a, b) => {
  if (!Array.isArray(a)) {
    a = a.split(',')
  }
  if (!Array.isArray(b)) {
    b = b.split(',')
  }
  return arraysEqual(a, b)
}

export const escapeHtml = text => {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
