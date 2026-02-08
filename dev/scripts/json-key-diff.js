#! /usr/local/bin/node
//const fs = require('fs')
import fs from 'fs'

let args = process.argv.slice(2)

const file1 = fs.readFileSync(args[0], 'utf8')

let object1 = JSON.parse(fs.readFileSync(args[0], 'utf8'))
let object2 = JSON.parse(fs.readFileSync(args[1], 'utf8'))

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

let keys1 = []
let keys2 = []
walk(object1, '', keys1)
walk(object2, '', keys2)

console.log('------------')
console.log(`keys in [${args[1]}] that are missing in [${args[0]}]`)
let missingInFile1 = keys2.filter(key => !keys1.includes(key)).sort()
missingInFile1.forEach(it => console.log(`  ${it}`))

console.log('------------')
console.log(`keys in [${args[0]}] that are missing in [${args[1]}]`)
let missingInFile2 = keys1.filter(key => !keys2.includes(key)).sort()
missingInFile2.forEach(it => console.log(`  ${it}`))

console.log('------------')
console.log(`values in [${args[0]}] that are the same in [${args[1]}]`)
let sameKeys = Object.entries(object1)
  .filter(([k, _]) => keys2.includes(k))
  .filter(([k, v]) => object2[k] === v)
  .sort()
sameKeys.forEach(([k, v]) => console.log(`  ${k}: ${v}`))
console.log('------------')
