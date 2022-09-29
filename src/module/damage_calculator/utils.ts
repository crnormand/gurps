type _function = (x: number) => number
const identity: _function = x => x
const max1: _function = x => Math.min(x, 1)
const max2: _function = x => Math.min(x, 2)
const oneHalf: _function = x => x * 0.5
const oneAndOneHalf: _function = x => x * 1.5
const double: _function = x => x * 2
const oneThird: _function = x => x * (1 / 3)
const oneFifth: _function = x => x * 0.2
const oneTenth: _function = x => x * 0.1

export { _function, identity, max1, max2, oneHalf, oneAndOneHalf, double, oneThird, oneFifth, oneTenth }
