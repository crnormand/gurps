#! /usr/local/bin/node

// Look for uses of the i18n function and Handlebars helper in source files.
// Extract matches, and find any that do not appear in lang/en.json
//
// Run like this:
//   ./create-entries-from-i18n-defaults.js filename

import fs from 'fs'
import path from 'path'

let filename = process.argv.slice(2)[0]
console.log(filename)

let contents = fs.readFileSync(filename, 'utf8')

console.log('=== New Entries for en.json ===')
let regex = /(i18n\(['"`](.+)['"`],\s*['"`](.+)['"`]\))/g
const matches = contents.matchAll(regex)
let m = [...matches]
m.forEach(e => {
  console.log(`"${e[2]}": "${e[3]}"`)
})
console.log('=== end of entries ===')
const replacement = contents.replaceAll(regex, "i18n('$2')")
fs.writeFileSync(filename + '.new', replacement)
console.log(`Written: ${filename}.new`)
