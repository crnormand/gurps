import { parselink } from '../../lib/parselink.js'

/**
 * Return html for text, parsing GURPS "links" into <span class="gurplink">XXX</span>.
 * @param {string | null | undefined} str
 * @param {boolean} [clrdmods=true]
 */
export function gurpslink(str, clrdmods = true, returnActions = false) {
  if (str === undefined || str == null) return '!!UNDEFINED'
  let found = -1
  let depth = 0
  let output = ''
  let actions = []
  for (let i = 0; i < str.length; i++) {
    if (str[i] == '[') {
      if (depth == 0) found = ++i
      depth++
    }
    if (str[i] == ']') {
      depth--
      if (depth == 0 && found >= 0) {
        output += str.substring(0, found - 1)
        let action = parselink(str.substring(found, i), '', clrdmods)
        if (!!action.action) actions.push(action)
        if (!action.action) output += '['
        output += action.text
        if (!action.action) output += ']'
        str = str.substr(i + 1)
        i = -1
        found = -1
      }
      if (depth == -1) depth = 0 // we reset to starting condition after second ']' from OTF parse
    }
  }
  if (returnActions === true) return actions
  output += str
  return output
}
