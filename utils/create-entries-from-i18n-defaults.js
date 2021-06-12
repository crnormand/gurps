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
let entries = new Set()

console.log('\n\n=== New Entries for en.json ===')
// let regex = /(i18n\(['"`](.+)['"`],\s*['"`](.+)['"`]\))/g
let regexJS = /i18n\((?:\r?\n)?\s*['"`](?<tag>.+?)['"`],(?:\r?\n)?\s*['"`](?<text>.+?)['"`](?:\r?\n)?\s*\)/g
{
  const matches = contents.matchAll(regexJS)
  let m = [...matches]
  m.forEach(e => {
    entries.add(`"${e.groups.tag}": "${e.groups.text}",`)
    //    console.log(`"${e.groups.tag}": "${e.groups.text}",`)
  })
}

let regexHB = /\{\{i18n(?:\r?\n)?\s+['"`](?<tag>.+?)['"`](?:\r?\n)?\s+['"`](?<text>.+?)['"`](?:\r?\n)?\s*\}\}/g
{
  const matches = contents.matchAll(regexHB)
  let m = [...matches]
  m.forEach(e => {
    entries.add(`"${e.groups.tag}": "${e.groups.text}",`)
    //    console.log(`"${e.groups.tag}": "${e.groups.text}",`)
  })
}

let regexHBf =
  /\{\{i18n_f(?:\r?\n)?\s+['"`](?<tag>.+?)['"`](?:\r?\n)?\s+(?<data>\S+)(?:\r?\n)?\s+['"`](?<text>.+?)['"`](?:\r?\n)?\s*\}\}/g
{
  const matches = contents.matchAll(regexHBf)
  let m = [...matches]
  m.forEach(e => {
    entries.add(`"${e.groups.tag}": "${e.groups.text}",`)
    //    console.log(`"${e.groups.tag}": "${e.groups.text}",`)
  })
}

entries.forEach(it => console.log(it))
console.log('=== end of entries ===\n')
fs.writeFileSync(filename + '.old', contents)

const replacement = contents
  .replaceAll(regexJS, "i18n('$1')")
  .replaceAll(regexHB, '{{i18n "$1"}}')
  .replace(regexHBf, '{{i18n_f "$1" $2}}')
fs.writeFileSync(filename, replacement)

console.log(`Written: ${filename}`)
