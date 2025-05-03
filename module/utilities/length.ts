export namespace Length {
  export type Length = number

  /* ---------------------------------------- */

  export enum Unit {
    FeetAndInches = 'ft_in',
    Inch = 'in',
    Feet = 'ft',
    Yard = 'yd',
    Mile = 'mi',
    Millimeter = 'mm',
    Centimeter = 'cm',
    Kilometer = 'km',
    Meter = 'm',
    AstronomicalUnit = 'au',
    Lightyear = 'ly',
    Parsec = 'pc',
  }

  /* ---------------------------------------- */

  // The first entry in the array is the default label for the unit
  // TODO: add localization support
  export const UNIT_LABELS: Record<Unit, string[]> = {
    // Feet & Inches is treated as a special case which uses the x'y" format
    [Unit.FeetAndInches]: [],
    [Unit.Inch]: ['in', 'inch', 'inches'],
    [Unit.Feet]: ['ft', 'foot', 'feet'],
    [Unit.Yard]: ['yd', 'yard', 'yards'],
    [Unit.Mile]: ['mi', 'mile', 'miles'],
    [Unit.Millimeter]: ['mm', 'millimeter', 'millimeters'],
    [Unit.Centimeter]: ['cm', 'centimeter', 'centimeters'],
    [Unit.Kilometer]: ['km', 'kilometer', 'kilometers'],
    [Unit.Meter]: ['m', 'meter', 'meters'],
    [Unit.AstronomicalUnit]: ['au', 'astronomical unit', 'astronomical units'],
    [Unit.Lightyear]: ['ly', 'lightyear', 'lightyears'],
    [Unit.Parsec]: ['pc', 'parsec', 'parsecs'],
  }

  /* ---------------------------------------- */

  // i18n localized labels for displaying units in dropdowns and such
  export const UNIT_NAMES: Record<Unit, string> = Object.fromEntries(
    Object.entries(Unit).map(([key, value]) => {
      return [key, game.i18n?.localize(`GURPS.${value}`) ?? '']
    })
  ) as Record<Unit, string>
  /* ---------------------------------------- */

  const INCHES_PER_MILE = 63360

  // Everything is relative to the inch, using GURPS simplified lengths only
  export const UNIT_CONVERSIONS: Record<Unit, number> = {
    [Unit.FeetAndInches]: 1,
    [Unit.Inch]: 1,
    [Unit.Feet]: 12,
    [Unit.Yard]: 36,
    [Unit.Mile]: INCHES_PER_MILE,
    [Unit.Millimeter]: 36 / 100,
    [Unit.Centimeter]: 36 / 1000,
    [Unit.Kilometer]: 36000,
    [Unit.Meter]: 36,
    // Simplified to 93 million miles
    [Unit.AstronomicalUnit]: INCHES_PER_MILE * 93e6,
    // Simplified to 5.865 trillion miles
    [Unit.Lightyear]: INCHES_PER_MILE * 5.865e12,
    // Simplified to 3.26 lightyears
    [Unit.Parsec]: INCHES_PER_MILE * 5.865e12 * 3.26,
  }

  /* ---------------------------------------- */

  export function fromNumber(value: number, unit: Unit): Length.Length {
    return toInches(value, unit)
  }

  /* ---------------------------------------- */

  /* ---------------------------------------- */

  /**
   * If forced is true, return 0 if the string is empty or invalid
   */
  export function fromString(text: string, defaultUnits: Length.Unit): Length.Length | null
  export function fromString(text: string, defaultUnits: Length.Unit, forced: false): Length.Length | null
  export function fromString(text: string, defaultUnits: Length.Unit, forced: true): Length.Length

  export function fromString(text: string, defaultUnits: Length.Unit, forced: boolean = false): Length.Length | null {
    function returnNull() {
      if (forced) return 0
      console.error('Invalid length string', text)
      return null
    }

    text = text.trim().replace(/^\++/g, '')

    for (const [unit, labels] of Object.entries(UNIT_LABELS)) {
      for (const label of labels) {
        if (text.endsWith(label)) {
          const value = parseFloat(text.slice(0, -label.length).trim())
          if (isNaN(value)) return returnNull()
          return toInches(value, unit as Length.Unit)
        }
      }
    }

    // Didn't match any of the units, so check for feet and inches
    const feetIndex = text.indexOf("'")
    const inchesIndex = text.indexOf('"')
    if (feetIndex === -1 && inchesIndex === -1) {
      // Didn't match that either so return the default units
      const value = parseFloat(text)
      if (isNaN(value)) return returnNull()
      return toInches(value, defaultUnits)
    }
    let feet = 0
    let inches = 0
    if (feetIndex !== -1) {
      feet = parseFloat(text.slice(0, feetIndex).trim())
      if (isNaN(feet)) return returnNull()
    }

    if (inchesIndex !== -1) {
      if (feetIndex > inchesIndex) {
        console.error(`Invalid lenght string format: ${text}`)
        return returnNull()
      }
      inches = parseFloat(text.slice(feetIndex + 1, inchesIndex).trim())
      if (isNaN(inches)) return returnNull()
    }
    return toInches(feet * 12 + inches, Unit.FeetAndInches)
  }

  /* ---------------------------------------- */

  export function toInches(value: number, unit: Unit): Length.Length {
    return value * UNIT_CONVERSIONS[unit]
  }

  /* ---------------------------------------- */

  export function fromInches(value: number, unit: Unit): Length.Length {
    return value / UNIT_CONVERSIONS[unit]
  }

  /* ---------------------------------------- */

  export function format(value: Length.Length, unit: Unit, precision: number = 4): string {
    if (unit === Unit.FeetAndInches) {
      const feet = Math.floor(value / 12)
      const inches = Math.round(value % 12)
      if (feet === 0) return `${inches}"`
      return `${feet}' ${inches}"`
    }
    return `${fromInches(value, unit).toFixed(precision)} ${UNIT_LABELS[unit][0]}`
  }

  /* ---------------------------------------- */
}
