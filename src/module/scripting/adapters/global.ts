import { ScriptDice } from './dice.js'
import { ScriptMeasure } from './measure.js'

/* ---------------------------------------- */

function getSafeMath() {
  return Object.freeze({
    // constants
    E: Math.E,
    PI: Math.PI,
    LN2: Math.LN2,
    LN10: Math.LN10,
    LOG2E: Math.LOG2E,
    LOG10E: Math.LOG10E,
    SQRT1_2: Math.SQRT1_2,
    SQRT2: Math.SQRT2,

    // functions
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    trunc: Math.trunc,

    min: Math.min,
    max: Math.max,

    pow: Math.pow,
    sqrt: Math.sqrt,

    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    atan2: Math.atan2,

    exp: Math.exp,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,

    random: Math.random,
  })
}

/* ---------------------------------------- */

function getSafeConsole() {
  return Object.freeze({
    log: console.log,
    error: console.error,
  })
}

/* ---------------------------------------- */

function formatNum(value: number, withCommas: boolean, withSign: boolean): string {
  return (withSign ? (value >= 0 ? '+' : '') : '') + (withCommas ? value.toLocaleString('en-US') : value.toString())
}

/* ---------------------------------------- */

function iff(condition: boolean, trueValue: any, falseValue: any): any {
  return condition ? trueValue : falseValue
}

/* ---------------------------------------- */

function signedValue(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

/* ---------------------------------------- */

export const ScriptGlobal = {
  Math: getSafeMath(),
  console: getSafeConsole(),
  dice: ScriptDice,
  measure: ScriptMeasure,
  formatNum,
  iff,
  signedValue,
}
