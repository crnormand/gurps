import { AnyMutableObject } from 'fvtt-types/utils'

const typePrototypes: [new (...args: never[]) => unknown, string][] = [
  [Array, 'Array'],
  [Set, 'Set'],
  [Map, 'Map'],
  [Promise, 'Promise'],
  [Error, 'Error'],
]

/* ---------------------------------------- */

const applySpecialKeys = (val: unknown): unknown => val

/* ---------------------------------------- */

export function getType(variable: unknown): string {
  // Primitive types, handled with simple typeof check
  const typeOf = typeof variable

  if (typeOf !== 'object') return typeOf

  // Special cases of object
  if (variable === null) return 'null'
  if (!(variable as object).constructor) return 'Object' // Object with the null prototype.
  if ((variable as object).constructor === Object) return 'Object' // Simple objects

  // Match prototype instances
  for (const [cls, type] of typePrototypes) {
    if (variable instanceof cls) return type
  }

  if ('HTMLElement' in globalThis && variable instanceof globalThis.HTMLElement) return 'HTMLElement'

  // Unknown Object type
  return 'Unknown'
}

/* ---------------------------------------- */

const SKIPPED_PROPERTIES = new Set(['__proto__', 'constructor', 'prototype'])

export function setProperty(object: AnyMutableObject, key: string, value: unknown): boolean {
  if (!key || SKIPPED_PROPERTIES.has(key)) return false

  // Convert the key to an object reference if it contains dot notation
  let target = object

  if (key.indexOf('.') !== -1) {
    const parts = key.split('.')

    if (parts.some(prop => SKIPPED_PROPERTIES.has(prop))) return false
    key = parts.pop()!
    target = parts.reduce<AnyMutableObject>((acc, prop) => {
      if (!(prop in acc)) acc[prop] = {}

      return acc[prop] as AnyMutableObject
    }, object)
  }

  // Update the target
  if (!(key in target) || target[key] !== value) {
    target[key] = value

    return true
  }

  return false
}

/* ---------------------------------------- */

export function expandObject(obj: AnyMutableObject): AnyMutableObject {
  const _expand = (value: unknown, depth: number): unknown => {
    if (depth > 32) throw new Error('Maximum object expansion depth exceeded')
    if (!value) return value
    if (Array.isArray(value)) return value.map(val => _expand(val, depth + 1)) // Map arrays
    if (getType(value) !== 'Object') return value // Return advanced objects directly
    const expanded: AnyMutableObject = {} // Expand simple objects

    for (const [key, val] of Object.entries(value as AnyMutableObject)) {
      setProperty(expanded, key, _expand(val, depth + 1))
    }

    return expanded
  }

  return _expand(obj, 0) as AnyMutableObject
}

/* ---------------------------------------- */

/**
 * A helper function for merging objects when the target key does not exist in the original.
 * @ignore
 */
function _mergeInsert(
  original: AnyMutableObject,
  key: string,
  value: unknown,
  _d: number,
  {
    insertKeys,
    insertValues,
    performDeletions,
  }: { insertKeys?: boolean; insertValues?: boolean; performDeletions?: boolean } = {}
): void {
  // Force replace a specific key
  if (performDeletions && key.startsWith('==')) {
    original[key.slice(2)] = applySpecialKeys(value)

    return
  }

  // Delete a specific key
  if (performDeletions && key.startsWith('-=')) {
    if (value !== null)
      throw new Error(
        'Removing a key using the -= deletion syntax requires the value of that' +
          ' deletion key to be null, for example {-=key: null}'
      )

    delete original[key.slice(2)]

    return
  }

  // Insert a new object, either recursively or directly
  const canInsert = (_d <= 1 && insertKeys) || (_d > 1 && insertValues)

  if (!canInsert) return

  if (getType(value) === 'Object') {
    original[key] = mergeObject({}, value as AnyMutableObject, { insertKeys: true, inplace: true, performDeletions })

    return
  }

  original[key] = value
}

/* ---------------------------------------- */

/**
 * A helper function for merging objects when the target key exists in the original.
 * @ignore
 */
function _mergeUpdate(
  original: AnyMutableObject,
  key: string,
  val: unknown,
  _d: number,
  {
    insertKeys,
    insertValues,
    enforceTypes,
    overwrite,
    recursive,
    performDeletions,
  }: {
    insertKeys?: boolean
    insertValues?: boolean
    enforceTypes?: boolean
    overwrite?: boolean
    recursive?: boolean
    performDeletions?: boolean
  } = {}
): AnyMutableObject | void {
  const ex = original[key]
  const tv = getType(val)
  const tx = getType(ex)
  const ov = tv === 'Object' || tv === 'Unknown'
  const ox = tx === 'Object' || tx === 'Unknown'

  // Recursively merge an inner object
  if (ov && ox && recursive) {
    return mergeObject(
      ex as AnyMutableObject,
      val as AnyMutableObject,
      {
        insertKeys,
        insertValues,
        overwrite,
        enforceTypes,
        performDeletions,
        inplace: true,
      },
      _d
    )
  }

  // Overwrite an existing value
  if (overwrite) {
    if (tx !== 'undefined' && tv !== tx && enforceTypes) {
      throw new Error('Mismatched data types encountered during object merge.')
    }

    original[key] = applySpecialKeys(val)
  }
}

/* ---------------------------------------- */

export function mergeObject(
  original: AnyMutableObject,
  other: AnyMutableObject = {},
  {
    insertKeys = true,
    insertValues = true,
    overwrite = true,
    recursive = true,
    inplace = true,
    enforceTypes = false,
    performDeletions = false,
  } = {},
  _d = 0
): AnyMutableObject {
  other = other || {}

  if (!(original instanceof Object) || !(other instanceof Object)) {
    throw new Error('One of original or other are not Objects!')
  }

  const options = { insertKeys, insertValues, overwrite, recursive, enforceTypes, performDeletions }

  // Special handling at depth 0
  if (_d === 0) {
    if (Object.keys(other).some(key => /\./.test(key))) other = expandObject(other) as AnyMutableObject
    if (Object.keys(original).some(key => /\./.test(key))) {
      const expanded = expandObject(original) as AnyMutableObject

      if (inplace) {
        Object.keys(original).forEach(key => delete original[key])
        Object.assign(original, expanded)
      } else original = expanded
    } else if (!inplace) original = deepClone(original) as AnyMutableObject
  }

  // Iterate over the other object
  for (const key of Object.keys(other)) {
    const value = other[key]

    if (Object.prototype.hasOwnProperty.call(original, key)) _mergeUpdate(original, key, value, _d + 1, options)
    else _mergeInsert(original, key, value, _d + 1, options)
  }

  return original
}

/* ---------------------------------------- */

export function deepClone<T>(original: T, { strict = false } = {}): T {
  return _deepClone(original, strict, 0) as T
}

/* ---------------------------------------- */

function _deepClone(original: unknown, strict: boolean, _d: number): unknown {
  if (_d > 100) {
    throw new Error('Maximum depth exceeded. Be sure your object does not contain cyclical data structures.')
  }

  _d++

  // Simple types
  if (typeof original !== 'object' || original === null) return original

  // Arrays
  if (original instanceof Array) return original.map(el => _deepClone(el, strict, _d))

  // Dates
  if (original instanceof Date) return new Date(original)

  // Unsupported advanced objects
  if (original.constructor && original.constructor !== Object) {
    if (strict) throw new Error('deepClone cannot clone advanced objects')

    return original
  }

  // Other objects
  const clone: Record<string, unknown> = {}

  for (const key of Object.keys(original as Record<string, unknown>)) {
    clone[key] = _deepClone((original as Record<string, unknown>)[key], strict, _d)
  }

  return clone
}
