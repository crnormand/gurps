#! /usr/local/bin/node

// Find any keys in en.json that are not used in the code.
//
// Run like this:
//   ./find-unused-keys.js dir1 dir2 ...
// where dir1, dir2, ..., dirN are directories to scan
//
// typical: ./find-unused-keys.js templates module lib

import fs from 'fs'
import path from 'path'

let rootPath = process.argv.slice(2)

console.log(rootPath)

const ignore = [
  /GURPS\.BODYPLAN.+/,
  /GURPS\.CR\d+/,
  /GURPS\.damageType[A-Z].+/,
  /GURPS\.encumbranceLevel-\d+/,
  /GURPS\.hitLocation[A-Z].+/,
  /TYPES\..+/,
]

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

// read the tags from en.json
let object = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'))

// object is a hierarchical structure; flatten it
const flattenObject = (obj, parent, res = {}) => {
  for (let key in obj) {
    let propName = parent ? parent + '.' + key : key

    if (typeof obj[key] == 'object') {
      flattenObject(obj[key], propName, res)
    } else {
      res[propName] = obj[key]
    }
  }

  return res
}

object = flattenObject(object)

let keys = Object.keys(object)

// Filter out ignored keys, based on regexes in ignore[]
keys = keys.filter(key => {
  for (let i = 0; i < ignore.length; i++) {
    if (key.match(ignore[i]) !== null) return false
  }

  return true
})

// find any keys that do no match -- indicates I've got the wrong regex
console.log('Keys that do not match expected pattern')
console.log('=======================================')
let regex = /^(GURPS\.|TYPES\.)[A-Za-z0-9. _\-\+,\*\/]+$/g

keys.forEach(key => {
  if (!key.match(regex)) console.log(key)
})

// get all text from all files
const files = rootPath.flatMap(it => getAllFiles(it))
const lines = []

files.forEach(it => {
  let contents = fs.readFileSync(it, 'utf8')

  contents.split('\n').forEach(line => lines.push(line))
})

let notFound = []

keys.forEach(key => {
  let found = false

  let escapedKey = key
    .replace(/\./g, '\\.')
    .replace(/\-/g, '\\-')
    .replace(/\+/g, '\\+')
    .replace(/\*/g, '\\*')
    .replace(/\//g, '\\/')

  let pattern = new RegExp(`"(${escapedKey})+?"`)
  let line = lines.find(line => line.match(pattern) !== null)

  if (line) {
    found = true
  }

  if (!found) {
    let pattern = new RegExp(`'(${escapedKey})+?'`)
    let line = lines.find(line => line.match(pattern) !== null)

    if (line) {
      found = true
    }
  }

  if (!found) {
    const pattern = new RegExp(`\\\`(${escapedKey})+?\\\``)
    const line = lines.find(line => line.match(pattern) !== null)

    if (line) {
      found = true
    }
  }

  if (!found) notFound.push(key)
})

console.log('KEYS NOT FOUND')
console.log('===========================')
notFound.sort().forEach(it => console.log(it))
