/**
 * Define getter properties on an object. Use this to add iterable properties on an object.
 *
 * @param object The object to define properties on.
 * @param keys The keys of the properties to define.
 */
function defineGetterProperties(object: Object, keys: readonly string[]) {
  const proto = Object.getPrototypeOf(object)
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key)) continue // already own

    const desc = Object.getOwnPropertyDescriptor(proto, key)
    if (desc?.get) {
      Object.defineProperty(object, key, {
        get: desc.get.bind(object),
        enumerable: true,
        configurable: true,
      })
    }
  }
}

/**
 * Parse a dot-notation key string into its components.
 *
 * @param key - A dot-notation key like "system.ads.2.contains.5.name"
 * @returns A tuple containing:
 *   - primaryComponentPath: The collection path (e.g., "system.ads" or "system.equipmentV2.carried")
 *   - index: The numeric index if present, otherwise undefined or 0
 *   - path: The remaining path after removing the primary component
 *   - property: The property name if the last component is non-numeric, otherwise undefined
 *
 * @example
 * parseItemKey('system.ads.3.name')
 * // Returns: ['system.ads', 3, '', 'name']
 *
 * @example
 * parseItemKey('system.equipmentV2.carried.0.contains.2')
 * // Returns: ['system.equipmentV2.carried', 2, '0.contains', undefined]
 */
function parseItemKey(key: string): [string, number | undefined, string, string | undefined] {
  const components = key.split('.')

  // Collection is the first two components unless it is equipment, then its the first three.
  let primaryComponentPath = [components[0], components[1]].join('.')
  if (primaryComponentPath === 'system.equipmentV2') primaryComponentPath += '.' + components[2]

  // Determine how many components make up the primary path
  const primaryPathLength = primaryComponentPath.split('.').length

  // If we only have the primary path (no more components), return with defaults
  if (components.length === primaryPathLength) {
    return [primaryComponentPath, 0, '', undefined]
  }

  // Check if the last component is a property (non-numeric).
  const lastComponent = components[components.length - 1]
  if (isNaN(parseInt(lastComponent))) {
    // It's a property.
    const property = components.pop()
    const index = components[components.length - 1].match(/^\d+$/) ? parseInt(components.pop() ?? '0') : undefined
    let path: string | null = components.join('.').replace(primaryComponentPath, '').replace(/^\./, '')
    return [primaryComponentPath, index, path, property]
  }
  const index = components[components.length - 1].match(/^\d+$/) ? parseInt(components.pop() ?? '0') : 0
  let path: string | null = components.join('.').replace(primaryComponentPath, '').replace(/^\./, '')

  return [primaryComponentPath, index, path, undefined]
}

export { defineGetterProperties, parseItemKey }
