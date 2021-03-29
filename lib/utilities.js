'use strict'

export function displayMod(mod) {
  if (!mod) mod = '0'
  let n = mod.toString()
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
  let s = "<span style='text-decoration:line-through'>"
  let line = s
  for (let i = 0; i < size; i++) line += '&nbsp;'
  line += '</span>'
  line += ' ' + text + ' '
  line += s
  for (let i = 0; i < size; i++) line += '&nbsp;'
  line += '</span>'
  return line
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
