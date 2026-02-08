/**
 * Parsing CSS in JavaScript / jQuery
 * https://jsfiddle.net/developit/vzkckrw4/
 * Rewrote and made file eslint compatible...
 * ~Stevil
 */

import { objectToArray } from '../../lib/utilities.js'
import { cssColors, cssSettings, url } from '../../module/color-character-sheet/color-character-sheet-settings.js'

export async function readCSSfile() {
  const theSettings = objectToArray(cssSettings.findCSS)
  const resp = await fetch(url)
  const cssData = await resp.text()
  const parsedCSS = await parseCss(cssData)
  for (const CSSfind of theSettings) {
    cssColors.push(await findSelectorRule(parsedCSS, CSSfind.selector, CSSfind.rule))
  }
}

export async function parseCss(text) {
  const tokenizer = /([\s\S]+?)\{([\s\S]*?)\}/gi
  const rules = []
  let rule
  let token
  let style
  text = text.replace(/\/\*[\s\S]*?\*\//g, '')
  while ((token = tokenizer.exec(text))) {
    style = await parseRule(token[2].trim())
    style.cssText = await stringifyRule(style)
    rule = {
      // eslint-disable-next-line no-useless-escape
      selectorText: token[1].trim().replace(/\s*\,\s*/, ', '),
      style: style,
    }
    rule.cssText = rule.selectorText + ' { ' + rule.style.cssText + ' }'
    rules.push(rule)
  }
  return rules
}

export async function parseRule(css) {
  // eslint-disable-next-line no-useless-escape
  const tokenizer = /\s*([a-z\-]+)\s*:\s*((?:[^;]*url\(.*?\)[^;]*|[^;]*)*)\s*(?:;|$)/gi
  const obj = {}
  let token
  while ((token = tokenizer.exec(css))) {
    obj[token[1].toLowerCase()] = token[2]
  }
  return obj
}

export async function stringifyRule(style) {
  let text = ''
  const keys = Object.keys(style).sort()
  for (let i = 0; i < keys.length; i++) {
    text += ' ' + keys[i] + ': ' + style[keys[i]] + ';'
  }
  return text.substring(1)
}

export async function findSelectorRule(parsedCSS, selector, rule) {
  let selectorText = ''
  for (const parsedCSSLine of parsedCSS) {
    selectorText = parsedCSSLine.selectorText
    const findSelectorText = selectorText.split(', ')
    const matchSelector = selector.toLowerCase()
    if (jQuery.inArray(matchSelector, findSelectorText) >= 0) {
      return processFoundRule(rule, parsedCSSLine.style[rule.toLowerCase()])
    }
  }
  return false
}

export async function processFoundRule(rule, foundRule) {
  if (rule.toLowerCase().indexOf('color') >= 0) {
    // looking for color data
    const colornames = await getColorArr('names')
    const colorhexs = await getColorArr('hexs')
    if (foundRule.toLowerCase().indexOf('rgb(') >= 0) {
      // convert rgb to hex
      foundRule = foundRule.replace(/;/g, '')
      foundRule = foundRule.replace(/!important/g, '')
      foundRule = foundRule.trim()
      const result = foundRule.match(/\d+/g)
      foundRule = '#' + (await hex(result[0])) + (await hex(result[1])) + (await hex(result[2]))
    } else if (foundRule.toLowerCase().indexOf('#') >= 0) {
      // conver hex to only hex
      foundRule = foundRule.replace(/;/g, '')
      foundRule = foundRule.replace(/!important/g, '')
      foundRule = foundRule.trim()
    } else {
      foundRule = foundRule.replace(/;/g, '')
      foundRule = foundRule.replace(/!important/g, '')
      foundRule = foundRule.trim()
      let result = null
      $.each(colornames, function (index, value) {
        if (result == null && value.toLowerCase() === foundRule.toLowerCase()) {
          result = index
          return false
        }
      })
      foundRule = '#' + colorhexs[result]
    }
  }
  if (foundRule === undefined) {
    foundRule = false
  }
  return foundRule
}

export async function hex(x) {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
  return isNaN(x) ? '00' : digits[(x - (x % 16)) / 16] + digits[x % 16]
}

export async function getColorArr(x) {
  if (x === 'names') {
    return [
      'AliceBlue',
      'AntiqueWhite',
      'Aqua',
      'Aquamarine',
      'Azure',
      'Beige',
      'Bisque',
      'Black',
      'BlanchedAlmond',
      'Blue',
      'BlueViolet',
      'Brown',
      'BurlyWood',
      'CadetBlue',
      'Chartreuse',
      'Chocolate',
      'Coral',
      'CornflowerBlue',
      'Cornsilk',
      'Crimson',
      'Cyan',
      'DarkBlue',
      'DarkCyan',
      'DarkGoldenRod',
      'DarkGray',
      'DarkGrey',
      'DarkGreen',
      'DarkKhaki',
      'DarkMagenta',
      'DarkOliveGreen',
      'DarkOrange',
      'DarkOrchid',
      'DarkRed',
      'DarkSalmon',
      'DarkSeaGreen',
      'DarkSlateBlue',
      'DarkSlateGray',
      'DarkSlateGrey',
      'DarkTurquoise',
      'DarkViolet',
      'DeepPink',
      'DeepSkyBlue',
      'DimGray',
      'DimGrey',
      'DodgerBlue',
      'FireBrick',
      'FloralWhite',
      'ForestGreen',
      'Fuchsia',
      'Gainsboro',
      'GhostWhite',
      'Gold',
      'GoldenRod',
      'Gray',
      'Grey',
      'Green',
      'GreenYellow',
      'HoneyDew',
      'HotPink',
      'IndianRed',
      'Indigo',
      'Ivory',
      'Khaki',
      'Lavender',
      'LavenderBlush',
      'LawnGreen',
      'LemonChiffon',
      'LightBlue',
      'LightCoral',
      'LightCyan',
      'LightGoldenRodYellow',
      'LightGray',
      'LightGrey',
      'LightGreen',
      'LightPink',
      'LightSalmon',
      'LightSeaGreen',
      'LightSkyBlue',
      'LightSlateGray',
      'LightSlateGrey',
      'LightSteelBlue',
      'LightYellow',
      'Lime',
      'LimeGreen',
      'Linen',
      'Magenta',
      'Maroon',
      'MediumAquaMarine',
      'MediumBlue',
      'MediumOrchid',
      'MediumPurple',
      'MediumSeaGreen',
      'MediumSlateBlue',
      'MediumSpringGreen',
      'MediumTurquoise',
      'MediumVioletRed',
      'MidnightBlue',
      'MintCream',
      'MistyRose',
      'Moccasin',
      'NavajoWhite',
      'Navy',
      'OldLace',
      'Olive',
      'OliveDrab',
      'Orange',
      'OrangeRed',
      'Orchid',
      'PaleGoldenRod',
      'PaleGreen',
      'PaleTurquoise',
      'PaleVioletRed',
      'PapayaWhip',
      'PeachPuff',
      'Peru',
      'Pink',
      'Plum',
      'PowderBlue',
      'Purple',
      'RebeccaPurple',
      'Red',
      'RosyBrown',
      'RoyalBlue',
      'SaddleBrown',
      'Salmon',
      'SandyBrown',
      'SeaGreen',
      'SeaShell',
      'Sienna',
      'Silver',
      'SkyBlue',
      'SlateBlue',
      'SlateGray',
      'SlateGrey',
      'Snow',
      'SpringGreen',
      'SteelBlue',
      'Tan',
      'Teal',
      'Thistle',
      'Tomato',
      'Turquoise',
      'Violet',
      'Wheat',
      'White',
      'WhiteSmoke',
      'Yellow',
      'YellowGreen',
    ]
  }
  if (x === 'hexs') {
    return [
      'f0f8ff',
      'faebd7',
      '00ffff',
      '7fffd4',
      'f0ffff',
      'f5f5dc',
      'ffe4c4',
      '000000',
      'ffebcd',
      '0000ff',
      '8a2be2',
      'a52a2a',
      'deb887',
      '5f9ea0',
      '7fff00',
      'd2691e',
      'ff7f50',
      '6495ed',
      'fff8dc',
      'dc143c',
      '00ffff',
      '00008b',
      '008b8b',
      'b8860b',
      'a9a9a9',
      'a9a9a9',
      '006400',
      'bdb76b',
      '8b008b',
      '556b2f',
      'ff8c00',
      '9932cc',
      '8b0000',
      'e9967a',
      '8fbc8f',
      '483d8b',
      '2f4f4f',
      '2f4f4f',
      '00ced1',
      '9400d3',
      'ff1493',
      '00bfff',
      '696969',
      '696969',
      '1e90ff',
      'b22222',
      'fffaf0',
      '228b22',
      'ff00ff',
      'dcdcdc',
      'f8f8ff',
      'ffd700',
      'daa520',
      '808080',
      '808080',
      '008000',
      'adff2f',
      'f0fff0',
      'ff69b4',
      'cd5c5c',
      '4b0082',
      'fffff0',
      'f0e68c',
      'e6e6fa',
      'fff0f5',
      '7cfc00',
      'fffacd',
      'add8e6',
      'f08080',
      'e0ffff',
      'fafad2',
      'd3d3d3',
      'd3d3d3',
      '90ee90',
      'ffb6c1',
      'ffa07a',
      '20b2aa',
      '87cefa',
      '778899',
      '778899',
      'b0c4de',
      'ffffe0',
      '00ff00',
      '32cd32',
      'faf0e6',
      'ff00ff',
      '800000',
      '66cdaa',
      '0000cd',
      'ba55d3',
      '9370db',
      '3cb371',
      '7b68ee',
      '00fa9a',
      '48d1cc',
      'c71585',
      '191970',
      'f5fffa',
      'ffe4e1',
      'ffe4b5',
      'ffdead',
      '000080',
      'fdf5e6',
      '808000',
      '6b8e23',
      'ffa500',
      'ff4500',
      'da70d6',
      'eee8aa',
      '98fb98',
      'afeeee',
      'db7093',
      'ffefd5',
      'ffdab9',
      'cd853f',
      'ffc0cb',
      'dda0dd',
      'b0e0e6',
      '800080',
      '663399',
      'ff0000',
      'bc8f8f',
      '4169e1',
      '8b4513',
      'fa8072',
      'f4a460',
      '2e8b57',
      'fff5ee',
      'a0522d',
      'c0c0c0',
      '87ceeb',
      '6a5acd',
      '708090',
      '708090',
      'fffafa',
      '00ff7f',
      '4682b4',
      'd2b48c',
      '008080',
      'd8bfd8',
      'ff6347',
      '40e0d0',
      'ee82ee',
      'f5deb3',
      'ffffff',
      'f5f5f5',
      'ffff00',
      '9acd32',
    ]
  }
}
