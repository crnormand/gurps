'use strict'
import { readDataFile } from './utilities.js'

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
// This is a "reverse lookup" -- it returns the key for a given value in the current language.

export function i18n_Text(text) {
  // iterate through the i18n translations properties, looking for the value. Then return this key.
  function deepSearch(obj, text, path = []) {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path.concat(key)
      if (typeof value === 'object') {
        const result = deepSearch(value, text, newPath)
        if (result) return result
      } else if (value === text) {
        return newPath.join('.')
      }
    }
    return undefined
  }

  // restrict the search to the GURPS namespace.
  const key = deepSearch(game.i18n.translations.GURPS, text)
  if (key) return `GURPS.${key}`
}
let english_json = null
export async function initialize_i18nHelper() {
  if (!english_json) english_json = await readDataFile('lang/en.json')
}
// This function is used to read the english.json file, and return the value for a given key.

export function i18n_English(key) {
  return english_json[key]
}
// Translate a text into English as based on the current language files.

export function i18n_Translate(text) {
  return i18n_English(i18n_Text(text))
}
