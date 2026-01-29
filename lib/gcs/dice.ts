/**
 * Class representing GCS-style dice structure. Not all GCS features are implemented.
 */
export class GcsDice {
  constructor(
    public count: number,
    public modifier: number,
    public multiplier: number = 1,
    public sides: number = 6
  ) {
    this.count = count
    this.modifier = modifier
    this.multiplier = multiplier
    this.sides = sides
  }

  /**
   * Normalize damage dice according to GURPS rules.
   * Examples:
   *  - 1d+3 stays 1d+3
   *  - 1d+4 becomes 2d-1
   *  - 2d-5 becomes 1d-1
   * @param damage
   * @returns
   */
  static normalizeDamage(damage: GcsDice): GcsDice {
    // Work on a copy so we don't mutate the caller's instance.
    const result = new GcsDice(damage.count, damage.modifier, damage.multiplier, damage.sides)

    if (result.count === 1 && result.modifier < 3) return result

    // If the modifier is larger than or equal to 3, we can convert some of it into extra dice.
    while (result.modifier > 2) {
      result.count++
      result.modifier -= 4
    }

    // If the modifier is negative, we can convert some of it into fewer dice.
    while (result.modifier < -1 && result.count > 1) {
      result.count--
      result.modifier += 4
    }

    return result
  }

  toString(): string {
    const mod = this.modifier === 0 ? '' : (this.modifier > 0 ? '+' : '') + this.modifier
    return this.count + 'd' + mod
  }
}
