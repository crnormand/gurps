// Create a class that given a ST value will calculate the derived attributes for an actor:
// Lift, Carry, Move, and Basic Speed, and Swing and Thrust damage.
// This class should implement the Strategy pattern to allow for different calculation methods in the future.
export interface StrengthCalculatorStrategy {
  calculateLift(strength: number): number
  calculateSwingDamage(strength: number): string
  calculateThrustDamage(strength: number): string
}

export class BasicSetStrength implements StrengthCalculatorStrategy {
  calculateLift(strength: number): number {
    return Math.floor((strength * strength) / 5)
  }

  calculateSwingDamage(strength: number): string {
    let result: { dice: number; modifier: number } = { dice: 0, modifier: 3 }
    if (strength > 9 && strength <= 26) result.modifier += strength - 9
    if (strength > 26) result.modifier += 17 + Math.floor((strength - 25) / 2)
    return convertDamageToString(result)
  }

  calculateThrustDamage(strength: number): string {
    let result: { dice: number; modifier: number } = { dice: 1, modifier: -2 }
    if (strength > 9) result.modifier += Math.floor((strength - 9) / 2)
    return convertDamageToString(result)
  }
}

function convertDamageToString(input: { dice: number; modifier: number }): string {
  const damage = normalizeDamage(input)
  const mod = damage.modifier === 0 ? '' : (damage.modifier > 0 ? '+' : '') + damage.modifier

  return damage.dice + 'd' + mod
}

function normalizeDamage(damage: { dice: number; modifier: number }): { dice: number; modifier: number } {
  if (damage.dice === 1 && damage.modifier < 3) return damage

  const dice =
    damage.dice +
    (damage.modifier < 0 //
      ? Math.trunc((-damage.modifier + 2) / -4)
      : Math.trunc((damage.modifier + 1) / 4))

  const modifier = ((damage.modifier + 1) % 4) - 1

  return { dice: dice, modifier: modifier }
}
