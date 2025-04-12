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

let rootPath = process.argv.slice(2)
console.log(rootPath)

/**
 * Define a function to get the files.
 * @param {*} dirPath
 * @param {*} arrayOfFiles
 * @returns the list of files found scanning dirPath recursively
 */
const getAllFiles = function (dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles)
    } else {
      // arrayOfFiles.push(path.join(__dirname, dirPath, '/', file))
      arrayOfFiles.push(path.join(dirPath, '/', file))
    }
  })

  return arrayOfFiles
}

// get all files
const files = rootPath.flatMap(it => getAllFiles(it))

// get the list of unique tags
let tags = new Set()
files.forEach(it => {
  let contents = fs.readFileSync(it, 'utf8')
  let lines = contents.split('\n')

  // look for patterns like 'i18n("<key>",'
  {
    let matches = lines.filter(it => it.match(/i18n\([\'\"\`][A-Za-z0-9_. ]+?[\'\"\`],/g))
    // console.log(`i18n("<key>"... :: file: ${it} lines: ${lines.length} matches: ${matches.length}`)

    if (matches.length > 0) {
      matches = matches.map(it => it.replace(/.*i18n\([\'\"\`]([A-Za-z0-9_. ]+?)[\'\"\`].*/, '$1'))
      matches.forEach(it => tags.add(it))
    }
  }

  // look for patterns like '{{i18n "<key>",'
  {
    let matches = lines.filter(it => it.match(/\{\{i18n [\'\"\`][A-Za-z0-9_. ]+?[\'\"\`]/g))
    // console.log(`{{i18n "key"... :: file: ${it} lines: ${lines.length} matches: ${matches.length}`)

    if (matches.length > 0) {
      matches = matches.map(it => it.replace(/.*\{\{i18n [\'\"\`]([A-Za-z0-9_. ]+?)[\'\"\`].*/, '$1'))
      matches.forEach(it => tags.add(it))
    }
  }
})

// read the tags from en.json
let object = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'))
let keys = Object.keys(object)
let orphans = Array.from(tags)
  .filter(it => !keys.includes(it))
  .sort()

console.log('===== ORPHANS =====')
console.log(orphans)
