/// This class handles a common pattern in GURPS -- a point cost that follows a
/// pattern, that repeats perhaps infinitely, which the individual values in
/// the pattern being multiplied by 10 over the previous occurrence of the
/// pattern. For example:
///
/// Pattern = 1, 3, 8
/// Sequence: 1, 3, 8, 10, 30, 80, 100, 300, 800, ...
///
/// Common usages of the pattern are to go from the index in the sequence to
/// value (ordinalToValue), or from some value to the index that represents the
/// lowest value in the sequence that is equal to or greater than the given value (valueToOrdinal).
export default class RepeatingSequenceConverter {
  constructor(pattern, base) {
    this._pattern = pattern
    this._base = base ?? 10
  }

  // assume pattern = [10, 30], 100, 300, 1000, 3000, ...
  // if index = 5, then the result should be:
  // int x = index % pattern.length = 1
  // int y = floor(index / pattern.length) = 2
  // return pattern[x] * 10^y = 30 * 100 = 3000
  indexToValue(index) {
    let i = index % this._pattern.length
    let exponent = Math.floor(index / this._pattern.length)
    let other = Math.pow(this._base, exponent)
    let j = this._pattern[i] * other
    return j
  }

  valueToIndex(value) {
    let loops = this._numberOfLoops(value) // 0

    let val = value / Math.pow(this._base, loops) // 3 / 1 = 3

    let arrayValue = this._smallestTableValueGreaterThanOrEqualTo(val)
    return this._pattern.indexOf(arrayValue) + loops * this._pattern.length
  }

  /// Return the least value from the repeating sequence greater than or equal
  /// to the passed value.
  ceil(value) {
    if (value < 0) throw 'must be non-negative'
    let index = 0
    let temp = 0
    do {
      temp = this.indexToValue(index++)
    } while (temp < value)

    return temp
  }

  _smallestTableValueGreaterThanOrEqualTo(val) {
    return this._pattern.find(i => i >= val)
  }

  _numberOfLoops(value) {
    let loops = 0
    while (value > this._lastElementOf(this._pattern) * Math.pow(this._base, loops)) {
      loops++
    }
    return loops
  }

  _lastElementOf(array) {
    return array[array.length - 1]
  }
}
