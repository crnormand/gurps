const GURPSFormat = true;

class DiceGURPS {
	sides: number;

	count: number;

	modifier: number;

	multiplier: number;

	constructor(data?: string | DiceGURPSDef) {
		this.sides = 0;
		this.count = 0;
		this.modifier = 0;
		this.multiplier = 0;
		if (data) {
			if (typeof data === "string") Object.assign(this, this.fromString(data));
			else Object.assign(this, data);
			this.sides = Math.floor(this.sides);
			this.count = Math.floor(this.count);
			this.modifier = Math.floor(this.modifier);
			this.multiplier = Math.floor(this.multiplier);
			this.normalize();
		}
	}

	fromString(str: string): DiceGURPSDef {
		str = str.trim();
		let dice: DiceGURPSDef = {
			sides: 6,
			count: 1,
			modifier: 0,
			multiplier: 1,
		};
		let i = 0;
		let ch: string;
		[dice.count, i] = extractValue(str, 0);
		const hadCount = i !== 0;
		[ch, i] = nextChar(str, i);
		let hadSides = false;
		let hadD = false;
		if (ch.toLowerCase() === "d") {
			hadD = true;
			const j = i;
			[dice.sides] = extractValue(str, i);
			hadSides = i !== j;
			[ch, i] = nextChar(str, i);
		}
		if (hadSides && !hadCount) {
			dice.count = 1;
		} else if (hadD && !hadSides && hadCount) {
			dice.sides = 6;
		}
		if (["+", "-"].includes(ch)) {
			const neg = ch === "-";
			[dice.modifier, i] = extractValue(str, i);
			if (neg) dice.modifier = -dice.modifier;
			[ch, i] = nextChar(str, i);
		}
		if (!hadD) {
			dice.modifier! += dice.count;
			dice.count = 0;
		}
		if (ch.toLowerCase() === "x") [dice.multiplier] = extractValue(str, i);
		if (dice.multiplier === 0) dice.multiplier = 1;
		dice = normalize(dice);
		return dice;
	}

	get string(): string {
		return this.toString(false);
	}

	toString(keepSix: boolean): string {
		let str = "";
		str += this.count;
		str += "d";
		if (this.sides !== 6 || keepSix) str += this.sides;
		if (this.modifier) {
			if (this.modifier > 0) str += "+";
			str += this.modifier;
		}
		if (this.multiplier !== 1) str += `x${this.multiplier}`;
		return str;
	}

	stringExtra(extraDiceFromModifiers: boolean): string {
		let [count, modifier] = this.adjustedCountAndModifier(extraDiceFromModifiers);
		let buffer = "";
		if (count > 0) {
			if (GURPSFormat || count > 1) buffer += count.toString();
			buffer += "d";
			if (!GURPSFormat || this.sides !== 6) buffer += this.sides.toString();
		}
		if (modifier > 0) {
			if (count !== 0 && this.sides !== 0) buffer += "+";
			buffer += modifier.toString();
		} else if (modifier < 0) buffer += modifier.toString();
		if (buffer.length === 0) buffer += "0";
		if (this.multiplier !== 1) buffer += `x${this.multiplier}`;
		return buffer;
	}

	normalize() {
		if (this.count! < 0) this.count = 0;
		if (this.sides! < 0) this.sides = 0;
		if (this.multiplier! < 1) this.multiplier = 1;
	}

	adjustedCountAndModifier(applyExtractDiceFromModifiers: boolean): [number, number] {
		let [count, modifier] = [0, 0];
		this.normalize();
		if (this.sides === 0) return [this.count, this.modifier];
		count = this.count;
		modifier = this.modifier;
		if (applyExtractDiceFromModifiers && modifier > 0) {
			let average = (this.sides + 1) / 2;
			if (this.sides % 2 !== 1) {
				count += modifier / average;
				modifier %= average;
			} else {
				while (modifier > average) {
					if (modifier > 2 * average) {
						modifier -= 2 * average + 1;
						count += 2;
					} else {
						modifier -= average + 1;
						count++;
					}
				}
			}
		}
		if (count < 0) count = 0;
		return [count, modifier];
	}
}

interface DiceGURPSDef {
	sides?: number;
	count?: number;
	modifier?: number;
	multiplier?: number;
}

/**
 *
 * @param str
 * @param i
 */
function extractValue(str: string, i: number): [number, number] {
	let value = 0;
	while (i < str.length) {
		const ch = str[i];
		if (!ch.match("[0-9]")) return [value, i];
		value *= 10;
		value += parseInt(ch);
		i++;
	}
	return [value, i];
}

/**
 *
 * @param str
 * @param i
 */
function nextChar(str: string, i: number): [string, number] {
	if (i < str.length) return [str[i], i + 1];
	return ["", i];
}

/**
 *
 * @param dice
 */
function normalize(dice: DiceGURPSDef): DiceGURPSDef {
	if (dice.count! < 0) dice.count = 0;
	if (dice.sides! < 0) dice.sides = 0;
	if (dice.multiplier! < 1) dice.multiplier = 1;
	return dice;
}

export { DiceGURPS };
