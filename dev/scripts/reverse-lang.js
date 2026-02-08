#! /usr/local/bin/node

// Look for uses of the i18n function and Handlebars helper in source files.
// Extract matches, and find any that do not appear in lang/en.json
//
// Run like this:
//   ./find-missing-keys.js dir1 dir2 ...
// where dir1, dir2, ..., dirN are directories to scan
//
// typical: ./find-missing-keys.js templates module lib

import fs from 'fs'
import path from 'path'

let dir = path.resolve(process.env._)

dir = dir.substring(0, dir.lastIndexOf('/')).substring(0, dir.lastIndexOf('/'))
// console.log(dir)

let lang = JSON.parse(fs.readFileSync(path.join(dir, '../lang/en.json'), 'utf8'))
// console.log(lang)

// create a json object with keys equal to the values of the lang object, and values equal to the keys of the lang object
let reverseLang = {}

for (let key in lang) {
  reverseLang[lang[key]] = key
}

console.log(reverseLang)
