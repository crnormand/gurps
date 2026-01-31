import { GcsDice } from '../../lib/gcs/dice.js'

// Create a class that given a ST value will calculate the derived attributes for an actor:
// Basic Lift and Swing and Thrust damage.
// This class should implement the Strategy pattern to allow for different calculation methods in the future.
export interface StrengthCalculatorStrategy {
  calculateLift(strength: number): number
  calculateSwingDamage(strength: number): string
  calculateThrustDamage(strength: number): string
}

export class BasicSetStrategy implements StrengthCalculatorStrategy {
  calculateLift(strength: number): number {
    const rawLift = (strength * strength) / 5
    // If rawLift is less than 10, round to one decimal place
    return rawLift < 10 ? Math.round(rawLift * 10) / 10 : Math.round(rawLift)
  }

  calculateSwingDamage(strength: number): string {
    const result = this._calculateSwingDamageGCS(strength)
    return result.toString()
  }

  _calculateSwingDamageGCS(strength: number): GcsDice {
    if (strength < 10) {
      return new GcsDice(1, -(5 - Math.floor((strength - 1) / 2)))
    }
    if (strength < 28) {
      strength -= 9
      return new GcsDice(Math.floor(strength / 4) + 1, (strength % 4) - 1)
    }
    let value = strength
    if (strength > 40) {
      value -= Math.floor((strength - 40) / 5)
    }
    if (strength > 59) {
      value++
    }
    value += 9
    return new GcsDice(Math.floor(value / 8) + 1, Math.floor((value % 8) / 2) - 1)
  }

  calculateThrustDamage(strength: number): string {
    const dice = this._calculateThrustDamageGCS(strength)
    return dice.toString()
  }

  _calculateThrustDamageGCS(strength: number): GcsDice {
    if (strength < 19) {
      return new GcsDice(1, -(6 - Math.floor((strength - 1) / 2)))
    }
    let value = strength - 11
    if (strength > 50) {
      value--
      if (strength > 79) {
        value -= 1 + Math.floor((strength - 80) / 5)
      }
    }
    return new GcsDice(Math.floor(value / 8) + 1, Math.floor((value % 8) / 2) - 1)
  }
}

export class StrengthCalculator {
  strategy: StrengthCalculatorStrategy
  strength: number

  constructor(strength: number = 10) {
    this.strategy = new BasicSetStrategy()
    this.strength = strength
  }

  calculateLift(): number {
    return this.strategy.calculateLift(this.strength)
  }

  calculateSwingDamage(): string {
    return this.strategy.calculateSwingDamage(this.strength)
  }

  calculateThrustDamage(): string {
    return this.strategy.calculateThrustDamage(this.strength)
  }
}
