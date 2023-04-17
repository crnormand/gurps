import { DamageProgression } from "@module/data"
import { DiceGURPS } from "@module/dice"

/**
 *
 * @param p
 * @param st
 */
export function thrustFor(p: DamageProgression, st: number): DiceGURPS {
	let d = new DiceGURPS()
	let r = 0
	switch (p) {
		case DamageProgression.BasicSet:
			if (st < 19)
				return new DiceGURPS({
					count: 1,
					sides: 6,
					modifier: -(6 - (st - 1) / 2),
					multiplier: 1,
				})
			let value = st - 11
			if (st > 50) {
				value--
				if (st > 79) {
					value -= 1 + (st - 80) / 5
				}
			}
			return new DiceGURPS({
				count: value / 8 + 1,
				sides: 6,
				modifier: (value % 8) / 2 - 1,
				multiplier: 1,
			})
		case DamageProgression.KnowingYourOwnStrength:
			if (st < 12) {
				return new DiceGURPS({
					count: 1,
					sides: 6,
					modifier: st - 12,
					multiplier: 1,
				})
			}
			return new DiceGURPS({
				count: (st - 7) / 4,
				sides: 6,
				modifier: ((st + 1) % 4) - 1,
				multiplier: 1,
			})
		case DamageProgression.NoSchoolGrognardDamage:
			if (st < 11) {
				return new DiceGURPS({
					count: 1,
					sides: 6,
					modifier: -(14 - st) / 2,
					multiplier: 1,
				})
			}
			st -= 11
			return new DiceGURPS({
				count: st / 8 + 1,
				sides: 6,
				modifier: (st % 8) / 2 - 1,
				multiplier: 1,
			})
		case DamageProgression.ThrustEqualsSwingMinus2:
			return thrustFor(DamageProgression.BasicSet, st)
		case DamageProgression.SwingEqualsThrustPlus2:
			const dice = swingFor(DamageProgression.BasicSet, st)
			dice.modifier -= 2
			return dice
		case DamageProgression.PhoenixFlameD3:
			if (st < 7) {
				if (st < 1) st = 1
				return new DiceGURPS({
					count: 1,
					sides: 6,
					modifier: (st + 1) / 2 - 7,
					multiplier: 1,
				})
			} else if (st < 10) {
				return new DiceGURPS({
					count: 1,
					sides: 3,
					modifier: (st + 1) / 2 - 5,
					multiplier: 1,
				})
			}
			st -= 8
			return new DiceGURPS({
				count: st / 2,
				sides: 3,
				modifier: st % 2,
				multiplier: 1,
			})
		case DamageProgression.Tbone1:
			if (st < 10)
				return new DiceGURPS({
					count: 1,
					sides: 6,
					modifier: -(6 - (st + 2) / 2),
				})
			d = new DiceGURPS({
				count: Math.floor(st / 10),
				sides: 6,
			})
			r = st - Math.floor(st / 10) * 10

			if (r === 2 || r === 3) d.modifier = 1
			else if (r === 2 || r === 3) d.modifier = 1
			else if (r === 4) {
				d.modifier = -2
				d.count += 1
			} else if (r === 5 || r === 6) d.modifier = 2
			else if (r === 7) {
				d.modifier = -1
				d.count += 1
			} else if (r === 8 || r === 9) d.modifier = 3

			return d
		case DamageProgression.Tbone1Clean:
			if (st < 10) return thrustFor(DamageProgression.Tbone1, st)
			d = new DiceGURPS({
				count: Math.floor(st / 10),
				sides: 6,
			})
			r = st - Math.floor(st / 10) * 10
			if (r === 2 || r === 3 || r === 4) d.modifier = 1
			if (r === 5 || r === 6) d.modifier = 2
			else if (r === 7 || r === 8 || r === 9) {
				d.modifier = -1
				d.count += 1
			}

			return d
		case DamageProgression.Tbone2:
			return swingFor(DamageProgression.Tbone2, Math.ceil((st * 2) / 3))
		case DamageProgression.Tbone2Clean:
			return swingFor(DamageProgression.Tbone2Clean, Math.ceil((st * 2) / 3))
		default:
			return thrustFor(DamageProgression.BasicSet, st)
	}
}

/**
 *
 * @param p
 * @param st
 */
export function swingFor(p: DamageProgression, st: number): DiceGURPS {
	switch (p) {
		case DamageProgression.BasicSet:
			if (st < 10)
				return new DiceGURPS({
					count: 1,
					sides: 6,
					modifier: -(5 - (st - 1) / 2),
					multiplier: 1,
				})
			else if (st < 28) {
				st -= 9
				return new DiceGURPS({
					count: st / 4 + 1,
					sides: 6,
					modifier: (st % 4) - 1,
					multiplier: 1,
				})
			}
			let value = st
			if (st > 40) value -= (st - 40) / 5
			if (st > 59) value++
			value += 9
			return new DiceGURPS({
				count: value / 8 + 1,
				sides: 6,
				modifier: (value % 8) / 2 - 1,
				multiplier: 1,
			})
		case DamageProgression.KnowingYourOwnStrength:
			if (st < 12) {
				return new DiceGURPS({
					count: 1,
					sides: 6,
					modifier: st - 10,
					multiplier: 1,
				})
			}
			return new DiceGURPS({
				count: (st - 5) / 4,
				sides: 6,
				modifier: ((st + 1) % 4) - 1,
				multiplier: 1,
			})
		case DamageProgression.NoSchoolGrognardDamage:
			return thrustFor(DamageProgression.NoSchoolGrognardDamage, st + 3)
		case DamageProgression.ThrustEqualsSwingMinus2:
			return swingFor(DamageProgression.BasicSet, st)
		case DamageProgression.SwingEqualsThrustPlus2:
			const dice = thrustFor(DamageProgression.BasicSet, st)
			dice.modifier += 2
			return dice
		case DamageProgression.PhoenixFlameD3:
			return thrustFor(DamageProgression.PhoenixFlameD3, st)
		case DamageProgression.Tbone1:
			return thrustFor(DamageProgression.Tbone1, Math.ceil(st) * 1.5)
		case DamageProgression.Tbone1Clean:
			return thrustFor(DamageProgression.Tbone1Clean, Math.ceil(st) * 1.5)
		case DamageProgression.Tbone2:
			return thrustFor(DamageProgression.Tbone1, st)
		case DamageProgression.Tbone2Clean:
			return thrustFor(DamageProgression.Tbone1Clean, st)
		default:
			return swingFor(DamageProgression.BasicSet, st)
	}
}
