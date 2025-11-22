/**
 * NOTE: This class is adapted from Foundry VTT core code to facilitate testing.
 *
 * A reusable storage concept which blends the functionality of an Array with the efficient key-based lookup of a Map.
 * This concept is reused throughout Foundry VTT where a collection of uniquely identified elements is required.
 * @template {string} K
 * @template V
 * @extends {Map<K, V>}
 */
export class _Collection extends Map {
  /**
   * Then iterating over a Collection, we should iterate over its values instead of over its entries
   * @returns {MapIterator<V>}
   */
  [Symbol.iterator]() {
    return this.values()
  }

  /* -------------------------------------------- */

  /**
   * Return an Array of all the entry values in the Collection
   * @type {V[]}
   */
  get contents() {
    return Array.from(this.values())
  }

  /* -------------------------------------------- */
  /**
   * Find an entry in the Map using a functional condition.
   * @see {Array#find}
   * @param {(value: V, index: number, collection: Collection<K, V>) => unknown} condition The functional condition to
   *                                                                                       test.
   * @returns {V|undefined} The value, if found, otherwise undefined
   *
   * @example Create a new Collection and reference its contents
   * ```js
   * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
   * c.get("a") === c.find(entry => entry === "A"); // true
   * ```
   */
  find(condition) {
    let i = 0
    for (const v of this.values()) {
      if (condition(v, i, this)) return v
      i++
    }
    return undefined
  }

  /* -------------------------------------------- */

  /**
   * Filter the Collection, returning an Array of entries which match a functional condition.
   * @see {Array#filter}
   * @param {(value: V, index: number, collection: Collection<K, V>) => unknown} condition The functional condition to
   *                                                                                       test.
   * @returns {V[]}           An Array of matched values
   *
   * @example Filter the Collection for specific entries
   * ```js
   * let c = new Collection([["a", "AA"], ["b", "AB"], ["c", "CC"]]);
   * let hasA = c.filters(entry => entry.slice(0) === "A");
   * ```
   */
  filter(condition) {
    const entries = []
    let i = 0
    for (const v of this.values()) {
      if (condition(v, i, this)) entries.push(v)
      i++
    }
    return entries
  }

  /* -------------------------------------------- */

  /**
   * Apply a function to each element of the collection
   * @see Array#forEach
   * @param {(value: V) => void} fn A function to apply to each element
   *
   * @example Apply a function to each value in the collection
   * ```js
   * let c = new Collection([["a", {active: false}], ["b", {active: false}], ["c", {active: false}]]);
   * c.forEach(e => e.active = true);
   * ```
   */
  forEach(fn) {
    for (const e of this.values()) {
      fn(e)
    }
  }

  /* -------------------------------------------- */

  /**
   * Get an element from the Collection by its key.
   * @param {string} key      The key of the entry to retrieve
   * @param {object} [options]  Additional options that affect how entries are retrieved
   * @param {boolean} [options.strict=false] Throw an Error if the requested key does not exist. Default false.
   * @returns {V|undefined} The retrieved entry value, if the key exists, otherwise undefined
   *
   * @example Get an element from the Collection by key
   * ```js
   * let c = new Collection([["a", "Alfred"], ["b", "Bob"], ["c", "Cynthia"]]);
   * c.get("a"); // "Alfred"
   * c.get("d"); // undefined
   * c.get("d", {strict: true}); // throws Error
   * ```
   */
  get(key, { strict = false } = {}) {
    const entry = super.get(key)
    if (strict && entry === undefined) {
      throw new Error(`The key ${key} does not exist in the ${this.constructor.name} Collection`)
    }
    return entry
  }

  /* -------------------------------------------- */

  /**
   * Get an entry from the Collection by name.
   * Use of this method assumes that the objects stored in the collection have a "name" attribute.
   * @param {string} name       The name of the entry to retrieve
   * @param {object} [options]  Additional options that affect how entries are retrieved
   * @param {boolean} [options.strict=false] Throw an Error if the requested name does not exist. Default false.
   * @returns {V|undefined} The retrieved entry value, if one was found, otherwise undefined
   *
   * @example Get an element from the Collection by name (if applicable)
   * ```js
   * let c = new Collection([["a", "Alfred"], ["b", "Bob"], ["c", "Cynthia"]]);
   * c.getName("Alfred"); // "Alfred"
   * c.getName("D"); // undefined
   * c.getName("D", {strict: true}); // throws Error
   * ```
   */
  getName(name, { strict = false } = {}) {
    const entry = this.find(e => e.name === name)
    if (strict && entry === undefined) {
      throw new Error(`An entry with name ${name} does not exist in the collection`)
    }
    return entry ?? undefined
  }

  /* -------------------------------------------- */

  /**
   * Transform each element of the Collection into a new form, returning an Array of transformed values
   * @param {function(V,number,Collection): *} transformer  A transformation function applied to each entry value.
   * Positional arguments are the value, the index of iteration, and the collection being mapped.
   * @returns {Array<*>}  An Array of transformed values
   */
  map(transformer) {
    const transformed = []
    let i = 0
    for (const v of this.values()) {
      transformed.push(transformer(v, i, this))
      i++
    }
    return transformed
  }

  /* -------------------------------------------- */

  /**
   * Reduce the Collection by applying an evaluator function and accumulating entries
   * @see {Array#reduce}
   * @param {function(*,V,number,Collection): *} reducer  A reducer function applied to each entry value. Positional
   * arguments are the accumulator, the value, the index of iteration, and the collection being reduced.
   * @param {*} initial             An initial value which accumulates with each iteration
   * @returns {*}                    The accumulated result
   *
   * @example Reduce a collection to an array of transformed values
   * ```js
   * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
   * let letters = c.reduce((s, l) => {
   *   return s + l;
   * }, ""); // "ABC"
   * ```
   */
  reduce(reducer, initial) {
    let accumulator = initial
    let i = 0
    for (const v of this.values()) {
      accumulator = reducer(accumulator, v, i, this)
      i++
    }
    return accumulator
  }

  /* -------------------------------------------- */

  /**
   * Test whether a condition is met by some entry in the Collection.
   * @see {Array#some}
   * @param {function(V,number,Collection): boolean} condition  The functional condition to test. Positional
   * arguments are the value, the index of iteration, and the collection being tested.
   * @returns {boolean}  Was the test condition passed by at least one entry?
   */
  some(condition) {
    let i = 0
    for (const v of this.values()) {
      const pass = condition(v, i, this)
      i++
      if (pass) return true
    }
    return false
  }

  /* -------------------------------------------- */

  /**
   * Convert the Collection to a primitive array of its contents.
   * @returns {object[]}  An array of contained values
   */
  toJSON() {
    return this.map(e => (e.toJSON ? e.toJSON() : e))
  }
}
