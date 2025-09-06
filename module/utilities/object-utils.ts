/**
 * Define getter properties on an object. Use this to add iterable properties on an object.
 *
 * @param object The object to define properties on.
 * @param keys The keys of the properties to define.
 */
function defineGetterProperties(object: Object, keys: string[]) {
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
export { defineGetterProperties }
