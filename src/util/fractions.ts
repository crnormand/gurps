import { Fraction, signed } from "./misc";

/**
 *
 * @param fraction
 */
export function string(fraction: Fraction): string {
	let n = fraction;
	n = normalize(n);
	const s = n.numerator.toString();
	if (n.denominator === 1) return s;
	return `${s}/${n.denominator.toString()}`;
}

/**
 *
 * @param fraction
 */
export function stringWithSign(fraction: Fraction): string {
	let n = fraction;
	n = normalize(n);
	const s = signed(n.numerator);
	if (n.denominator === 1) return s;
	return `${s}/${n.denominator.toString()}`;
}

/**
 *
 * @param f
 */
function normalize(f: Fraction): Fraction {
	if (f.denominator === 0) {
		f.numerator = 0;
		f.denominator = 1;
	} else if (f.denominator < 1) {
		f.numerator *= -1;
		f.denominator *= -1;
	}
	return f;
}
