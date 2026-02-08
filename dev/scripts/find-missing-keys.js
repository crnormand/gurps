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

  // Find any strings that start with 'GURPS.'.
  {
    let matches = lines.filter(it => it.match(/[\'\"\`]GURPS\.[A-Za-z0-9_. ]+?[\'\"\`]\b/g))
    // console.log(`GURPS.<key>... :: file: ${it} lines: ${lines.length} matches: ${matches.length}`)

    if (matches.length > 0) {
      matches = matches.map(it => it.replace(/.*[\'\"\`](GURPS\.[A-Za-z0-9_. ]+?)[\'\"\`]\b.*/, '$1'))
      matches.forEach(it => tags.add(it))
    }
  }

  {
    let matches = lines.filter(it => it.match(/localize\([\'\"\`][A-Za-z0-9_. ]+?[\'\"\`],/g))
    // console.log(`localize("<key>"... :: file: ${it} lines: ${lines.length} matches: ${matches.length}`)

    if (matches.length > 0) {
      matches = matches.map(it => it.replace(/.*localize\([\'\"\`]([A-Za-z0-9_. ]+?)[\'\"\`].*/, '$1'))
      matches.forEach(it => tags.add(it))
    }
  }

  // look for patterns like 'localize("<key>",'
  {
    let matches = lines.filter(it => it.match(/localize\([\'\"\`][A-Za-z0-9_. ]+?[\'\"\`],/g))
    // console.log(`localize("<key>"... :: file: ${it} lines: ${lines.length} matches: ${matches.length}`)

    if (matches.length > 0) {
      matches = matches.map(it => it.replace(/.*localize\([\'\"\`]([A-Za-z0-9_. ]+?)[\'\"\`].*/, '$1'))
      matches.forEach(it => tags.add(it))
    }
  }

  // look for patterns like 'format("<key>",'
  {
    let matches = lines.filter(it => it.match(/format\([\'\"\`][A-Za-z0-9_. ]+?[\'\"\`],/g))
    // console.log(`format("<key>"... :: file: ${it} lines: ${lines.length} matches: ${matches.length}`)

    if (matches.length > 0) {
      matches = matches.map(it => it.replace(/.*format\([\'\"\`]([A-Za-z0-9_. ]+?)[\'\"\`].*/, '$1'))
      matches.forEach(it => tags.add(it))
    }
  }

  // look for patterns like '{{localize "<key>",'
  {
    let matches = lines.filter(it => it.match(/\{\{localize [\'\"\`][A-Za-z0-9_. ]+?[\'\"\`]/g))
    // console.log(`{{localize "key"... :: file: ${it} lines: ${lines.length} matches: ${matches.length}`)

    if (matches.length > 0) {
      matches = matches.map(it => it.replace(/.*\{\{localize [\'\"\`]([A-Za-z0-9_. ]+?)[\'\"\`].*/, '$1'))
      matches.forEach(it => tags.add(it))
    }
  }
})

// read the tags from en.json
let object = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'))
let keys = Object.keys(object)

tags = Array.from(tags).sort()

// tags include strings like "GURPS.some.key" or "GURPS.some.key.subkey"; I need code that can search object like this: object['GURPS']['some']['key']
let orphans = []

for (let tag of tags) {
  let parts = tag.split('.')
  let current = object
  let found = true

  for (let part of parts) {
    if (current[part]) {
      current = current[part]
    } else {
      found = false
      break
    }
  }

  if (!found) {
    orphans.push(tag)
  }
}

console.log('===== ORPHANS =====')
console.log(orphans)
