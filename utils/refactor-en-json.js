#! /usr/local/bin/node

import fs from 'fs'
import path from 'path'

let dir = path.resolve(process.env._)
dir = dir.substring(0, dir.lastIndexOf('/')).substring(0, dir.lastIndexOf('/'))

// Read the en.json file
const filePath = path.join(dir, '../lang/en.json')
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

// Function to convert flat keys to nested objects
function convertToNestedObject(data) {
  const result = {}

  Object.keys(data).forEach(key => {
    const keys = key.split('.')
    keys.reduce((acc, part, index) => {
      if (index === keys.length - 1) {
        acc[part] = data[key]
      } else {
        acc[part] = acc[part] || {}
      }
      return acc[part]
    }, result)
  })

  return result
}

// Function to sort the keys in an object
function sortKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj
  }

  const sortedObj = {}
  Object.keys(obj)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .forEach(key => {
      sortedObj[key] = sortKeys(obj[key])
    })

  return sortedObj
}

// Convert the flat keys to nested objects
const nestedData = convertToNestedObject(data)

// Sort the keys in the nested object
const sortedData = sortKeys(nestedData)

// Write the transformed data to en-new.json
const newFilePath = path.join(dir, '../lang/en-new.json')

fs.writeFileSync(newFilePath, JSON.stringify(sortedData, null, 2), 'utf8')

console.log('File has been written to en-new.json')
