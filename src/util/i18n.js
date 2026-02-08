'use strict'

import { readDataFile } from './utilities.js'

// iterate through the translations properties, looking for the value. Then return this key.
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

// This is a "reverse lookup" -- it returns the key for a given value in the current language.
export function i18n_Text(text) {
  // restrict the search to the GURPS namespace.
  const key = deepSearch(game.i18n.translations.GURPS, text)

  if (key) return `GURPS.${key}`
}

/**
 * For a given English text, translate it into the current language.
 * @param {*} text
 * @returns
 */
export function translate(text) {
  // Find the key for the given text in English.
  const key = deepSearch(english_json, text)

  // If the key is not found, return the original text.
  if (!key) return text

  // Get the value from the current language file.
  return game.i18n.localize(key)
}

let english_json = null
let reverseMap = null

export async function initialize_i18nHelper() {
  if (!english_json) english_json = await readDataFile('lang/en.json')

  // Create a map whose keys are the values from english_json and whose values are the full paths to the keys.
  if (!reverseMap) {
    reverseMap = Object.entries(english_json).reduce((acc, [key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          acc[subValue] = `${key}.${subKey}`
        })
      } else {
        acc[value] = key
      }

      return acc
    }, {})
  }

  return
}

// This function is used to read the english.json file, and return the value for a given key.
export function i18n_English(key) {
  return english_json[key]
}

/**
 * Translate a text into English as based on the current language files. For example, if the current language is
 * German, and the text is "Hallo", this function will return "Hello".
 * @param {*} text
 * @returns
 */
export function convertToEnglish(text) {
  return i18n_English(i18n_Text(text))
}
