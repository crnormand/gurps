import * as Settings from '../../lib/miscellaneous-settings.js'
import { Length, LengthUnit } from '../data/common/index.js'

// COMPATIBILITY: v12
export class GurpsRulerV12 extends Ruler {
  override _getSegmentLabel(segment: Ruler.PartialSegmentForLabelling) {
    const totalDistance = this.totalDistance
    const units = canvas?.scene?.grid.units ?? Length.Unit.Yard
    let dist = (d: number, u: string) => {
      return `${Math.round(d * 100) / 100} ${u}`
    }
    const length = Length.from(totalDistance, units as unknown as LengthUnit, true)
    const yards = length.to(Length.Unit.Yard)
    let label = length.toString()
    let mod = this.yardsToRangePenalty(yards.value)
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
