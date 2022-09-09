// === This is a hacked-up copy of the code found at GitHub: https://github.com/AndreasPizsa/parse-decimal-number ===

let patterns = [];

let options = {};

export const parseDecimalNumber = function (value, inOptions, enforceGroupSize) {
	let decimal;
	let fractionPart;
	let groupMinSize;
	let integerPart;
	let number;
	let pattern;
	let patternIndex;
	let result;
	let thousands;
	if (enforceGroupSize == null) {
		enforceGroupSize = true;
	}
	if (typeof inOptions === "string") {
		if (inOptions.length !== 2) {
			throw {
				name: "ArgumentException",
				message: "The format for string options is '<thousands><decimal>' (exactly two characters)",
			};
		}
		(thousands = inOptions[0]), (decimal = inOptions[1]);
	} else if (Array.isArray(inOptions)) {
		if (inOptions.length !== 2) {
			throw {
				name: "ArgumentException",
				message: "The format for array options is ['<thousands>','[<decimal>'] (exactly two elements)",
			};
		}
		(thousands = inOptions[0]), (decimal = inOptions[1]);
	} else {
		thousands =
			(inOptions != null ? inOptions.thousands : void 0) ||
			(inOptions != null ? inOptions.group : void 0) ||
			options.thousands;
		decimal = (inOptions != null ? inOptions.decimal : void 0) || options.decimal;
	}
	patternIndex = String(thousands) + decimal + enforceGroupSize;
	pattern = patterns[patternIndex];
	if (pattern == null) {
		groupMinSize = enforceGroupSize ? 3 : 1;
		pattern = patterns[patternIndex] = new RegExp(
			`^\\s*([+-]?(?:(?:\\d{1,3}(?:\\${thousands}\\d{${groupMinSize},3})+)|\\d*))(?:\\${decimal}(\\d*))?\\s*$`
		);
	}
	result = value.match(pattern);
	if (!(result != null && result.length === 3)) {
		return 0 / 0;
	}
	integerPart = result[1].replace(new RegExp(`\\${thousands}`, "g"), "");
	fractionPart = result[2];
	number = parseFloat(`${integerPart}.${fractionPart}`);
	return number;
};

export const setOptions = function (newOptions) {
	let key;
	let value;
	for (key in newOptions) {
		value = newOptions[key];
		options[key] = value;
	}
};

export const factoryReset = function () {
	options = {
		thousands: ",",
		decimal: ".",
	};
};

export const withOptions = function (options, enforceGroupSize) {
	if (enforceGroupSize == null) {
		enforceGroupSize = true;
	}
	return function (value) {
		return parseDecimalNumber(value, options, enforceGroupSize);
	};
};

factoryReset();
