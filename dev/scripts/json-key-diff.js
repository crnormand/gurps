#! /usr/local/bin/node
//const fs = require('fs')
import fs from 'fs'

let args = process.argv.slice(2)

const firstFilePath = args[0]
const secondFilePath = args[1]

const firstJson = JSON.parse(fs.readFileSync(firstFilePath, 'utf8'))
const secondJson = JSON.parse(fs.readFileSync(secondFilePath, 'utf8'))

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

const firstKeys = []
const secondKeys = []

walk(firstJson, '', firstKeys)
walk(secondJson, '', secondKeys)

console.log('------------')
console.log(`keys in [${secondFilePath}] that are missing in [${firstFilePath}]`)
const missingInSecond = secondKeys.filter(key => !firstKeys.includes(key)).sort()

missingInSecond.forEach(key => console.log(`  ${key}`))

console.log('------------')
console.log(`keys in [${firstFilePath}] that are missing in [${secondFilePath}]`)
const missingInFirst = firstKeys.filter(key => !secondKeys.includes(key)).sort()

missingInFirst.forEach(key => console.log(`  ${key}`))

console.log('------------')
console.log(`values in [${firstFilePath}] that are the same in [${secondFilePath}]`)
const sameKeys = Object.entries(firstJson)
  .filter(([key, _value]) => secondKeys.includes(key))
  .filter(([key, value]) => secondJson[key] === value)
  .sort()

sameKeys.forEach(([key, value]) => console.log(`  ${key}: ${value}`))
console.log('------------')
