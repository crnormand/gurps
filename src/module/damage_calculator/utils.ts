type ModifierFunction = {
	name: string
	function: (x: number) => number
}

const identity: ModifierFunction = { name: "1", function: x => x }
const max1: ModifierFunction = { name: "Max 1", function: x => Math.min(x, 1) }
const max2: ModifierFunction = { name: "Max 2", function: x => Math.min(x, 2) }
const double: ModifierFunction = { name: "2", function: x => x * 2 }
const oneAndOneHalf: ModifierFunction = { name: "1.5", function: x => x * 1.5 }
const oneHalf: ModifierFunction = { name: "0.5", function: x => x * 0.5 }
const oneThird: ModifierFunction = { name: "1/3", function: x => x * (1 / 3) }
const oneFifth: ModifierFunction = { name: "0.5", function: x => x * 0.2 }
const oneTenth: ModifierFunction = { name: "0.1", function: x => x * 0.1 }

export { ModifierFunction, identity, max1, max2, oneHalf, oneAndOneHalf, double, oneThird, oneFifth, oneTenth }
