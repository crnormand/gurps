/**
 * Class representing GCS-style dice structure. Not all GCS features are implemented.
 */
export class GcsDice {
  constructor(
    public readonly count: number,
    public readonly modifier: number,
    public readonly multiplier: number = 1,
    public readonly sides: number = 6
  ) {}

  static fromString(diceString: string): GcsDice {
    const regex = /^(?<count>\d+)d(?<modifier>[+-–]?\d+)?$/
    const match = diceString.match(regex)

    if (!match) {
      throw new Error(`Invalid dice string: ${diceString}`)
    }

    const count = parseInt(match.groups?.count || '0', 10)
    const modifier = match.groups?.modifier ? parseInt(match.groups.modifier.replace('–', '-'), 10) : 0

    return new GcsDice(count, modifier)
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
    let damageCount = damage.count
    let damageModifier = damage.modifier

    if (damageCount === 1 && damageModifier < 3)
      return new GcsDice(damageCount, damageModifier, damage.multiplier, damage.sides)

    // If the modifier is larger than or equal to 3, we can convert some of it into extra dice.
    while (damageModifier > 2) {
      damageCount++
      damageModifier -= 4
    }

    // If the modifier is negative, we can convert some of it into fewer dice.
    while (damageModifier < -1 && damageCount > 1) {
      damageCount--
      damageModifier += 4
    }

    return new GcsDice(damageCount, damageModifier, damage.multiplier, damage.sides)
  }

  difference(other: GcsDice): number {
    const otherNormalized = this.normalizeCount(other)

    return this.modifier - otherNormalized.modifier
  }

  add(value: number): GcsDice {
    return new GcsDice(this.count, this.modifier + value, this.multiplier, this.sides)
  }

  /**
   * Convert other dice to have the same count as this dice.
   * @param other
   * @returns The value of other dice normalized to this dice's count.
   */
  normalizeCount(other: GcsDice): GcsDice {
    let otherCount = other.count
    let otherModifier = other.modifier

    if (otherCount > this.count) {
      while (otherCount > this.count) {
        otherCount--
        otherModifier += 4
      }

      return new GcsDice(otherCount, otherModifier, other.multiplier, other.sides)
    }

    if (otherCount < this.count) {
      while (otherCount < this.count) {
        otherCount++
        otherModifier -= 4
      }

      return new GcsDice(otherCount, otherModifier, other.multiplier, other.sides)
    }

    return other
  }

  toString(): string {
    const mod = this.modifier === 0 ? '' : (this.modifier > 0 ? '+' : '') + this.modifier

    return this.count + 'd' + mod
  }
}
