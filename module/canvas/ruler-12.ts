import * as Settings from '../../lib/miscellaneous-settings.js'
import { Length, LengthUnit } from '../data/common/index.js'

// COMPATIBILITY: v12
export class RulerGURPSv12 extends Ruler {
  override _getSegmentLabel(segment: Ruler.PartialSegmentForLabelling) {
    const totalDistance = this.totalDistance
    const units = canvas.scene?.grid.units ?? Length.Unit.Yard
    let dist = (d: number, u: string) => {
      return `${Math.round(d * 100) / 100} ${u}`
    }
    const yards = Length.from(totalDistance, units as unknown as LengthUnit, true)?.to(Length.Unit.Yard)
    let label = yards.toString()
    let mod = this._yardsToRangePenalty(yards.value)
    GURPS.ModifierBucket.setTempRangeMod(mod)
    if (segment.last) {
      let total = `${dist(totalDistance, units)}`
      if (total != label) label += ` [${total}]`
    }
    return label + ` (${mod})`
  }

  /* ---------------------------------------- */

  override _endMeasurement() {
    // @ts-expect-error: dependent on DragRuler
    let addRangeMod = !this.draggedEntity // Will be false is using DragRuler and it was movement
    super._endMeasurement()
    if (addRangeMod) GURPS.ModifierBucket.addTempRangeMod()
  }

  /* ---------------------------------------- */

  protected _yardsToRangePenalty(yards: number): number {
    const strategy = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_STRATEGY) ?? 'Standard'
    if (strategy === 'Standard') {
      return GURPS.SSRT.getModifier(yards)
    } else {
      for (let range of GURPS.rangeObject.ranges) {
        if (typeof range.max === 'string')
          // Handles last distance being "500+"
          return range.penalty
        if (yards <= range.max) return range.penalty
      }
    }
    return 0
  }

  convert_to_yards(numeric: number, Unit: string): number {
    let meter = 0
    let unit = Unit.toLowerCase()

    if (meters.includes(unit)) meter = numeric
    else if (millimeters.includes(unit)) meter = numeric / 1000
    else if (kilometers.includes(unit)) meter = numeric * 1000
    else if (miles.includes(unit)) meter = numeric / 0.00062137
    else if (inches.includes(unit)) meter = numeric / 39.37
    else if (centimeters.includes(unit)) meter = numeric / 100
    else if (feet.includes(unit)) meter = numeric / 3.2808
    else if (yards.includes(unit)) meter = numeric / (3.2808 / 3)
    else if (lightyears.includes(unit)) meter = numeric * 9460730472580800
    else if (astronomicalUnits.includes(unit)) meter = numeric * 149597870700
    else if (parsecs.includes(unit)) meter = numeric * 30856776376340068

    return meter * 1.0936
  }

  yardsToSpeedRangePenalty(yards: number): number {
    let currentValue = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_STRATEGY)
    if (currentValue == 'Standard') {
      return GURPS.SSRT.getModifier(yards)
    } else {
      for (let range of GURPS.rangeObject.ranges) {
        if (typeof range.max === 'string')
          // Handles last distance being "500+"
          return range.penalty
        if (yards <= range.max) return range.penalty
      }
    }
    return 0
  }
}

const meters = ['meters', 'meter', 'm']
const millimeters = ['millimeters', 'millimeter', 'mm']
const kilometers = ['kilometers', 'kilometer', 'km']
const miles = ['miles', 'mile', 'mi']
const inches = ['inches', 'inch', 'in']
const centimeters = ['centimeters', 'centimeter', 'cm']
const feet = ['feet', 'foot', 'ft']
const yards = ['yards', 'yard', 'yd', 'y']
const lightyears = ['lightyears', 'lightyear', 'ly']
const astronomicalUnits = ['astronomical units', 'astronomical unit', 'au']
const parsecs = ['parsecs', 'parsec', 'pc']
