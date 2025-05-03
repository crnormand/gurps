type OperatorArg = string | number | boolean | null

/* ---------------------------------------- */

function not(arg: OperatorArg): boolean {
  if (typeof arg === 'boolean') return !arg
  const v = numberFrom(arg)
  return v === 0
}

/* ---------------------------------------- */

function logicalOr(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  if (l === null) return null
  if (l !== 0) return true

  const r = numberFrom(right)
  if (r === null) return null
  return r !== 0
}

/* ---------------------------------------- */

function logicalAnd(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  return l !== 0 && r !== 0
}

/* ---------------------------------------- */

function equal(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  const r = numberFrom(right)

  if (l === null || r === null) {
    return left === right
  }
  return l === r
}

/* ---------------------------------------- */

function notEqual(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) {
    return left !== right
  }
  return l !== r
}

/* ---------------------------------------- */

function greaterThan(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) {
    return (left !== null && right !== null && String(left) > String(right)) ?? null
  }
  return l > r
}

/* ---------------------------------------- */

function lessThan(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) {
    // TODO: check if this works correctly in the edge cases where it shows up
    return (left !== null && right !== null && String(left) < String(right)) ?? null
  }
  return l < r
}

/* ---------------------------------------- */

function greaterThanOrEqual(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) {
    // TODO: check if this works correctly in the edge cases where it shows up
    return (left !== null && right !== null && String(left) >= String(right)) ?? null
  }
  return l >= r
}

/* ---------------------------------------- */

function lessThanOrEqual(left: OperatorArg, right: OperatorArg): boolean | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) {
    // TODO: check if this works correctly in the edge cases where it shows up
    return (left !== null && right !== null && String(left) <= String(right)) ?? null
  }
  return l <= r
}

/* ---------------------------------------- */

function add(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  return l + r
}

/* ---------------------------------------- */

function subtract(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  return l - r
}

/* ---------------------------------------- */

function subtractUnary(arg: OperatorArg): number | null {
  const v = numberFrom(arg)
  if (v === null) return null
  return -v
}

/* ---------------------------------------- */

function multiply(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  return l * r
}

/* ---------------------------------------- */

function divide(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  return l / r
}

/* ---------------------------------------- */

function divideAllowZero(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  if (r === 0) {
    return 0
  }
  return l / r
}

/* ---------------------------------------- */

function modulo(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  if (r === 0) {
    console.error('GURPS Eval: Division by zero')
    return null
  }
  return l % r
}

/* ---------------------------------------- */

function moduloAllowZero(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  if (r === 0) {
    return 0
  }
  return l % r
}

/* ---------------------------------------- */

function power(left: OperatorArg, right: OperatorArg): number | null {
  const l = numberFrom(left)
  const r = numberFrom(right)
  if (l === null || r === null) return null
  return Math.pow(l, r)
}

/* ---------------------------------------- */

function numberFrom(arg: OperatorArg): number | null {
  switch (typeof arg) {
    case 'number':
      return arg
    case 'string':
      const n = parseFloat(arg)
      if (isNaN(n)) return 0
      return n
    case 'boolean':
      return arg ? 1 : 0
    default:
      console.error(`GURPS Eval: Cannot convert "${arg}" to number`)
      return null
  }
}

export {
  not,
  logicalOr,
  logicalAnd,
  equal,
  notEqual,
  lessThan,
  greaterThan,
  lessThanOrEqual,
  greaterThanOrEqual,
  add,
  subtract,
  multiply,
  divide,
  divideAllowZero,
  modulo,
  moduloAllowZero,
  power,
  subtractUnary,
}
