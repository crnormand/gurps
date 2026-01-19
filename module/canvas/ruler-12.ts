import * as Settings from '../../lib/miscellaneous-settings.js'
import { Length, LengthUnit } from '../data/common/index.js'

// COMPATIBILITY: v12
export class GurpsRulerV12 extends Ruler {
  // @ts-expect-error: Waiting for types to catch up
  override _getSegmentLabel(segment: Ruler.PartialSegmentForLabelling) {
    // @ts-expect-error: Waiting for types to catch up
    const totalDistance = this.totalDistance
    const gridUnits = canvas?.scene?.grid.units ?? Length.Unit.Yard
    const units = Length.unitFromString(gridUnits ?? Length.Unit.Yard)
    let dist = (d: number, u: string) => {
      return `${Math.round(d * 100) / 100} ${u}`
    }
    const length = Length.from(totalDistance, units as unknown as LengthUnit, true)
    const yards = length.to(Length.Unit.Yard)
    let label = dist(length.value, gridUnits)
    let mod = this.yardsToRangePenalty(yards.value)
    GURPS.ModifierBucket.setTempRangeMod(mod)
    if (segment.last) {
      let total = dist(totalDistance, gridUnits)
      if (total !== label) label += ` [${total}]`
    }

    return label + ` (${mod})`
  }

  /* ---------------------------------------- */

  // @ts-expect-error: Waiting for types to catch up
  override _endMeasurement() {
    // @ts-expect-error: dependent on DragRuler
    let addRangeMod = !this.draggedEntity // Will be false if using DragRuler and it was movement
    // @ts-expect-error: Waiting for types to catch up
    super._endMeasurement()
    if (addRangeMod) GURPS.ModifierBucket.addTempRangeMod()
  }

  /* ---------------------------------------- */

  yardsToRangePenalty(yards: number): number {
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
}
