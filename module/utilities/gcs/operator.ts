class Operator<ReturnType extends Operator.Arg = Operator.Arg> {
  evaluate: Operator.Function<ReturnType> | null
  evaluateUnary: Operator.UnaryFunction<ReturnType> | null
  symbol: string
  precedence: number = 0

  /* ---------------------------------------- */

  constructor(options: {
    symbol: string
    precedence?: number
    evaluate?: Operator.Function<ReturnType>
    evaluateUnary?: Operator.UnaryFunction<ReturnType>
  }) {
    this.symbol = options.symbol
    this.precedence = options.precedence ?? 0
    this.evaluate = options.evaluate ?? null
    this.evaluateUnary = options.evaluateUnary ?? null
  }

  /* ---------------------------------------- */

  match(expression: string, start: number, maximum: number): boolean {
    if (maximum - start < this.symbol.length) {
      return false
    }
    const matches = this.symbol === expression.substring(start, start + this.symbol.length)

    // Allow negative exponents on floating point numbers (i.e. 1.2e-2)
    if (
      matches &&
      this.symbol.length === 1 &&
      this.symbol === '-' &&
      start > 1 &&
      expression.substring(start - 1, start) === 'e'
    ) {
      if (!isNaN(parseFloat(expression.substring(start - 2, start + -1)))) {
        return false
      }
    }

    return matches
  }

  /* ---------------------------------------- */
}

namespace Operator {
  export type Arg = string | number | boolean | null

  /* ---------------------------------------- */

  export type Function<ReturnType extends Arg = Arg> = (
    left: Operator.Arg,
    right: Operator.Arg
  ) => [ReturnType, boolean]
  /* ---------------------------------------- */

  export type UnaryFunction<ReturnType extends Arg = Arg> = (arg: Operator.Arg) => [ReturnType, boolean]

  /* ---------------------------------------- */

  export function openParen(): Operator {
    return new Operator({ symbol: '(' })
  }

  /* ---------------------------------------- */

  export function coseParen(): Operator {
    return new Operator({ symbol: ')' })
  }

  /* ---------------------------------------- */

  export function not(f: UnaryFunction): Operator {
    return new Operator({
      symbol: '!',
      evaluateUnary: f,
    })
  }

  /* ---------------------------------------- */

  export function logicalOr(f: Function): Operator {
    return new Operator({
      symbol: '||',
      precedence: 20,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function logicalAnd(f: Function): Operator {
    return new Operator({
      symbol: '&&',
      precedence: 20,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function equal(f: Function): Operator {
    return new Operator({
      symbol: '==',
      precedence: 30,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function notEqual(f: Function): Operator {
    return new Operator({
      symbol: '!=',
      precedence: 30,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function lessThan(f: Function): Operator {
    return new Operator({
      symbol: '<',
      precedence: 40,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function greaterThan(f: Function): Operator {
    return new Operator({
      symbol: '>',
      precedence: 40,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function lessThanOrEqual(f: Function): Operator {
    return new Operator({
      symbol: '<=',
      precedence: 40,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function greaterThanOrEqual(f: Function): Operator {
    return new Operator({
      symbol: '>=',
      precedence: 40,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function add(f: Function): Operator {
    return new Operator({
      symbol: '+',
      precedence: 50,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function subtract(f: Function): Operator {
    return new Operator({
      symbol: '-',
      precedence: 50,
      evaluate: f,
    })
  }

  /* ---------------------------------------- */

  export function multiply(f: Function): Operator {
    return new Operator({
      symbol: '*',
      precedence: 60,
      evaluate: f,
    })
  }

  /*----------------------------------------- */

  export function divide(f: Function): Operator {
    return new Operator({
      symbol: '/',
      precedence: 60,
      evaluate: f,
    })
  }

  /*----------------------------------------- */

  export function modulus(f: Function): Operator {
    return new Operator({
      symbol: '%',
      precedence: 60,
      evaluate: f,
    })
  }

  /*----------------------------------------- */

  export function pow(f: Function): Operator {
    return new Operator({
      symbol: '^',
      precedence: 70,
      evaluate: f,
    })
  }
}

export { Operator }
