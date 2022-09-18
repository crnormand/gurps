import { DamageProgression } from "@module/data";
import { DiceGURPS } from "@module/dice";

/**
 *
 * @param p
 * @param st
 */
export function thrustFor(p: DamageProgression, st: number): DiceGURPS {
	if (p === DamageProgression.BasicSet) {
		if (st < 19)
			return new DiceGURPS({
				count: 1,
				sides: 6,
				modifier: -(6 - (st - 1) / 2),
				multiplier: 1,
			});
		let value = st - 11;
		if (st > 50) {
			value--;
			if (st > 79) {
				value -= 1 + (st - 80) / 5;
			}
		}
		return new DiceGURPS({
			count: value / 8 + 1,
			sides: 6,
			modifier: (value % 8) / 2 - 1,
			multiplier: 1,
		});
	} else if (p === DamageProgression.KnowingYourOwnStrength) {
		if (st < 12) {
			return new DiceGURPS({
				count: 1,
				sides: 6,
				modifier: st - 12,
				multiplier: 1,
			});
		}
		return new DiceGURPS({
			count: (st - 7) / 4,
			sides: 6,
			modifier: ((st + 1) % 4) - 1,
			multiplier: 1,
		});
	} else if (p === DamageProgression.NoSchoolGrognardDamage) {
		if (st < 11) {
			return new DiceGURPS({
				count: 1,
				sides: 6,
				modifier: -(14 - st) / 2,
				multiplier: 1,
			});
		}
		st -= 11;
		return new DiceGURPS({
			count: st / 8 + 1,
			sides: 6,
			modifier: (st % 8) / 2 - 1,
			multiplier: 1,
		});
	} else if (p === DamageProgression.ThrustEqualsSwingMinus2) {
		return thrustFor(DamageProgression.BasicSet, st);
	} else if (p === DamageProgression.SwingEqualsThrustPlus2) {
		const dice = swingFor(DamageProgression.BasicSet, st);
		dice.modifier -= 2;
		return dice;
	} else if (p === DamageProgression.PhoenixFlameD3) {
		if (st < 7) {
			if (st < 1) st = 1;
			return new DiceGURPS({
				count: 1,
				sides: 6,
				modifier: (st + 1) / 2 - 7,
				multiplier: 1,
			});
		} else if (st < 10) {
			return new DiceGURPS({
				count: 1,
				sides: 3,
				modifier: (st + 1) / 2 - 5,
				multiplier: 1,
			});
		}
		st -= 8;
		return new DiceGURPS({
			count: st / 2,
			sides: 3,
			modifier: st % 2,
			multiplier: 1,
		});
	} else {
		return thrustFor(DamageProgression.BasicSet, st);
	}
}

/**
 *
 * @param p
 * @param st
 */
export function swingFor(p: DamageProgression, st: number): DiceGURPS {
	if (p === DamageProgression.BasicSet) {
		if (st < 10)
			return new DiceGURPS({
				count: 1,
				sides: 6,
				modifier: -(5 - (st - 1) / 2),
				multiplier: 1,
			});
		else if (st < 28) {
			st -= 9;
			return new DiceGURPS({
				count: st / 4 + 1,
				sides: 6,
				modifier: (st % 4) - 1,
				multiplier: 1,
			});
		}
		let value = st;
		if (st > 40) value -= (st - 40) / 5;
		if (st > 59) value++;
		value += 9;
		return new DiceGURPS({
			count: value / 8 + 1,
			sides: 6,
			modifier: (value % 8) / 2 - 1,
			multiplier: 1,
		});
	} else if (p === DamageProgression.KnowingYourOwnStrength) {
		if (st < 12) {
			return new DiceGURPS({
				count: 1,
				sides: 6,
				modifier: st - 10,
				multiplier: 1,
			});
		}
		return new DiceGURPS({
			count: (st - 5) / 4,
			sides: 6,
			modifier: ((st + 1) % 4) - 1,
			multiplier: 1,
		});
	} else if (p === DamageProgression.NoSchoolGrognardDamage) {
		return thrustFor(DamageProgression.NoSchoolGrognardDamage, st + 3);
	} else if (p === DamageProgression.ThrustEqualsSwingMinus2) {
		return swingFor(DamageProgression.BasicSet, st);
	} else if (p === DamageProgression.SwingEqualsThrustPlus2) {
		const dice = thrustFor(DamageProgression.BasicSet, st);
		dice.modifier += 2;
		return dice;
	} else if (p === DamageProgression.PhoenixFlameD3) {
		return thrustFor(DamageProgression.PhoenixFlameD3, st);
	} else {
		return thrustFor(DamageProgression.BasicSet, st);
	}
}
