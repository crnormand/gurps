#! /usr/local/bin/node
//const fs = require('fs')
import fs from 'fs'

// Example usage: json-key-diff-repair.js lang/dr.json fix
//
// This script compares two lang files, one being the input file and the other being lang/en.json.
// It finds keys that are in the input file but not in lang/en.json, and vice versa.
// If the 'fix' argument is provided, it will modify the input file to remove keys
// that are not in lang/en.json, and add keys that are in lang/en.json but not in the input file.
// It will also remove keys that have the same value in both files.

const args = process.argv.slice(2)

const targetFile = args[0]
const fix = args[1] === 'fix'
const enFile = './lang/en.json'

const enJson = JSON.parse(fs.readFileSync(enFile, 'utf8'))
const targetJson = JSON.parse(fs.readFileSync(targetFile, 'utf8'))

// Recursively walk the keys in object1 and collect the fully qualified keys in a variable
function walk(obj, prefix, keys) {
  for (let key in obj) {
    if (typeof obj[key] === 'object') {
      walk(obj[key], prefix + key + '.', keys)
    } else {
      keys.push(prefix + key)
    }
  }
}

const enKeys = []
const targetKeys = []

walk(enJson, '', enKeys)
walk(targetJson, '', targetKeys)

console.log('------------')
console.log(`keys in [${targetFile}] that are missing in [${enFile}]`)
const missingInFile1 = targetKeys.filter(key => !enKeys.includes(key)).sort()

missingInFile1.forEach(it => console.log(`  ${it}`))

// Remove missiingInFile1 entries from object2.
if (fix) {
  missingInFile1.forEach(it => {
    let parts = it.split('.')
    let obj = targetJson

    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]]
    }

    delete obj[parts[parts.length - 1]]
  })
  // overwrite targetFile
  fs.writeFileSync(targetFile, JSON.stringify(targetJson, null, 2))
}

console.log('------------')
console.log(`keys in [${enFile}] that are missing in [${targetFile}]`)
const missingInFile2 = enKeys.filter(key => !targetKeys.includes(key)).sort()

missingInFile2.forEach(it => console.log(`  ${it}`))

if (fix) {
  // Add missingInFile2 entries to object2.
  missingInFile2.forEach(it => {
    let parts = it.split('.')
    let obj = enJson

    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]]
    }

    let value = obj[parts[parts.length - 1]]
    let obj2 = targetJson

    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj2[parts[i]]) {
        obj2[parts[i]] = {}
      }

      obj2 = obj2[parts[i]]
    }

    obj2[parts[parts.length - 1]] = value
  })
  // Overwrite targetFile.
  fs.writeFileSync(targetFile, JSON.stringify(targetJson, null, 2))
}

console.log('------------')
console.log(`values in [${enFile}] that are the same in [${targetFile}]`)
const sameKeys = Object.entries(enJson)
  .filter(([key, _value]) => targetKeys.includes(key))
  .filter(([key, value]) => targetJson[key] === value)
  .sort()

sameKeys.forEach(([k, v]) => console.log(`  ${k}: ${v}`))

if (fix) {
  // Remove sameKeys entries from object2.
  sameKeys.forEach(([k, v]) => {
    let parts = k.split('.')
    let obj = targetJson

    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]]
    }

    delete obj[parts[parts.length - 1]]
  })
  // Overwrite targetFile
  fs.writeFileSync(targetFile, JSON.stringify(targetJson, null, 2))
}

console.log('------------')
