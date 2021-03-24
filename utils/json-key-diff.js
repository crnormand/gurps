#! /usr/local/bin/node
const fs = require('fs')

let args = process.argv.slice(2)

let object1 = JSON.parse(fs.readFileSync(args[0], 'utf8'))
let object2 = JSON.parse(fs.readFileSync(args[1], 'utf8'))

let keys1 = Object.keys(object1)
let keys2 = Object.keys(object2)

console.log('------------')
console.log(`keys in [${args[1]}] that are missing in [${args[0]}]`)

let missingInFile1 = keys2.filter(key => !keys1.includes(key)).sort()
console.log(missingInFile1)

console.log('------------')
console.log(`keys in [${args[0]}] that are missing in [${args[1]}]`)

let missingInFile2 = keys1.filter(key => !keys2.includes(key)).sort()
console.log(missingInFile2)

console.log('------------')
console.log(`values in [${args[0]}] that are the same in [${args[1]}]`)

let sameKeys = Object.entries(object1)
  .filter(([k, _]) => keys2.includes(k))
  .filter(([k, v]) => object2[k] === v)
  .sort()
sameKeys.forEach(([k, v]) => console.log(`${k}: ${v}`))
