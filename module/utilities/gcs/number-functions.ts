import { Evaluator } from './eval.js'
import { Operator } from './operator.js'

function absolute(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.abs(arg)
}

/* ---------------------------------------- */

function base2Exponential(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.pow(2, arg)
}

/* ---------------------------------------- */

function baseEExponential(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.exp(arg)
}

/* ---------------------------------------- */

function cubeRoot(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.cbrt(arg)
}

/* ---------------------------------------- */

function decimalLog(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.log10(arg)
}

/* ---------------------------------------- */

function floor(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.floor(arg)
}

/* ---------------------------------------- */

function ifThenElse(evaluator: Evaluator, args: string): Operator.Arg | null {
  let arg: string = ''
  ;[arg, args] = Evaluator.nextArg(args)
  let evalauted = evaluator.evaluateNew(arg)
  if (evalauted === null) return null

  let value = Number(evalauted)
  if (isNaN(value)) return null
  if (value === 0) [, args] = Evaluator.nextArg(args)
  ;[arg, args] = Evaluator.nextArg(args)
  return evaluator.evaluateNew(arg)
}

/* ---------------------------------------- */

function max(evaluator: Evaluator, args: string): number | null {
  let maximum = Number.MIN_VALUE
  while (args !== '') {
    let arg: string = ''
    ;[arg, args] = Evaluator.nextArg(args)
    const value = Evaluator.evalToNumber(evaluator, arg)
    if (value === null) return null
    maximum = Math.max(maximum, value)
  }
  return maximum
}

/* ---------------------------------------- */

function min(evaluator: Evaluator, args: string): number | null {
  let minimum = Number.MAX_VALUE
  while (args !== '') {
    let arg: string = ''
    ;[arg, args] = Evaluator.nextArg(args)
    const value = Evaluator.evalToNumber(evaluator, arg)
    if (value === null) return null
    minimum = Math.min(minimum, value)
  }
  return minimum
}

/* ---------------------------------------- */

function naturalLog(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.log(arg)
}

/* ---------------------------------------- */

function naturalLogSum1(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.log(arg + 1)
}

/* ---------------------------------------- */

function round(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.round(arg)
}

/* ---------------------------------------- */

function squareRoot(evaluator: Evaluator, args: string): number | null {
  const arg = Evaluator.evalToNumber(evaluator, args)
  if (isNaN(arg)) return null
  return Math.sqrt(arg)
}

export const NumberFunctions = {
  absolute,
  base2Exponential,
  baseEExponential,
  cubeRoot,
  decimalLog,
  floor,
  ifThenElse,
  max,
  min,
  naturalLog,
  naturalLogSum1,
  round,
  squareRoot,
}
