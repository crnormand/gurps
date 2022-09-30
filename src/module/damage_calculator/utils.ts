type ModifierFunction = (x: number) => number
const identity: ModifierFunction = x => x
const max1: ModifierFunction = x => Math.min(x, 1)
const max2: ModifierFunction = x => Math.min(x, 2)
const oneHalf: ModifierFunction = x => x * 0.5
const oneAndOneHalf: ModifierFunction = x => x * 1.5
const double: ModifierFunction = x => x * 2
const oneThird: ModifierFunction = x => x * (1 / 3)
const oneFifth: ModifierFunction = x => x * 0.2
const oneTenth: ModifierFunction = x => x * 0.1

export { ModifierFunction, identity, max1, max2, oneHalf, oneAndOneHalf, double, oneThird, oneFifth, oneTenth }
