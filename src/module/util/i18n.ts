import { readDataFile } from '@util/utilities.js'

// iterate through the translations properties, looking for the value. Then return this key.
function deepSearch(obj: any, text: any, path: string[] = []): string | undefined {
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
export function i18n_Text(text: string): string | undefined {
  // restrict the search to the GURPS namespace.
  const key = deepSearch((game.i18n as any)?.translations?.GURPS, text)

  if (key) return `GURPS.${key}`

  return undefined
}

/**
 * For a given English text, translate it into the current language.
 */
export function translate(text: string) {
  // Find the key for the given text in English.
  const key = deepSearch(english_json, text)

  // If the key is not found, return the original text.
  if (!key) return text

  // Get the value from the current language file.
  return game.i18n?.localize(key) ?? text
}

let english_json: any = null
let reverseMap: any = null

export async function initialize_i18nHelper() {
  if (!english_json) english_json = await readDataFile('lang/en.json')

  // Create a map whose keys are the values from english_json and whose values are the full paths to the keys.
  if (!reverseMap) {
    reverseMap = Object.entries(english_json).reduce((acc: any, [key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value as any).forEach(([subKey, subValue]) => {
          acc[subValue as any] = `${key}.${subKey}`
        })
      } else {
        acc[value as any] = key
      }

      return acc
    }, {})
  }

  return
}

// This function is used to read the english.json file, and return the value for a given key.
export function i18n_English(key: string) {
  return english_json[key]
}

/**
 * Translate a text into English as based on the current language files.
 */
export function convertToEnglish(text: string) {
  return i18n_English(i18n_Text(text) as any)
}
