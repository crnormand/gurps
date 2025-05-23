#! /usr/local/bin/node
//const fs = require('fs')
import fs from 'fs'

let args = process.argv.slice(2)

const targetFile = args[0]
const fix = args[1] === 'fix'
const enFile = './lang/en.json'

let en_json = JSON.parse(fs.readFileSync(enFile, 'utf8'))
let object2 = JSON.parse(fs.readFileSync(targetFile, 'utf8'))

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

let en_keys = []
let keys2 = []
walk(en_json, '', en_keys)
walk(object2, '', keys2)

console.log('------------')
console.log(`keys in [${targetFile}] that are missing in [${enFile}]`)
let missingInFile1 = keys2.filter(key => !en_keys.includes(key)).sort()
missingInFile1.forEach(it => console.log(`  ${it}`))

// Remove missiingInFile1 entries from object2.
if (fix) {
  missingInFile1.forEach(it => {
    let parts = it.split('.')
    let obj = object2
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]]
    }
    delete obj[parts[parts.length - 1]]
  })
  // overwrite targetFile
  fs.writeFileSync(targetFile, JSON.stringify(object2, null, 2))
}

console.log('------------')
console.log(`keys in [${enFile}] that are missing in [${targetFile}]`)
let missingInFile2 = en_keys.filter(key => !keys2.includes(key)).sort()
missingInFile2.forEach(it => console.log(`  ${it}`))
if (fix) {
  // Add missingInFile2 entries to object2.
  missingInFile2.forEach(it => {
    let parts = it.split('.')
    let obj = en_json
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]]
    }
    let value = obj[parts[parts.length - 1]]
    let obj2 = object2
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj2[parts[i]]) {
        obj2[parts[i]] = {}
      }
      obj2 = obj2[parts[i]]
    }
    obj2[parts[parts.length - 1]] = value
  })
  // Overwrite targetFile.
  fs.writeFileSync(targetFile, JSON.stringify(object2, null, 2))
}

console.log('------------')
console.log(`values in [${enFile}] that are the same in [${targetFile}]`)
let sameKeys = Object.entries(en_json)
  .filter(([k, _]) => keys2.includes(k))
  .filter(([k, v]) => object2[k] === v)
  .sort()
sameKeys.forEach(([k, v]) => console.log(`  ${k}: ${v}`))
if (fix) {
  // Remove sameKeys entries from object2.
  sameKeys.forEach(([k, v]) => {
    let parts = k.split('.')
    let obj = object2
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]]
    }
    delete obj[parts[parts.length - 1]]
  })
  // Overwrite targetFile
  fs.writeFileSync(targetFile, JSON.stringify(object2, null, 2))
}
console.log('------------')
