import { AnyObject } from 'fvtt-types/utils'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { Length, LengthUnit } from '../data/common/index.js'

// COMPATIBILITY: v12
// class GurpsRuler extends foundry.canvas.interaction.Ruler {
class GurpsRuler extends Ruler {
  // Used to determine the distance modifier to apply to the modifier bucket
  // when releasing the ruler.
  distanceModifier = 0

  /* ---------------------------------------- */

  // @ts-expect-error: types have not yet caught up
  static override WAYPOINT_LABEL_TEMPLATE = 'systems/gurps/templates/canvas/ruler-waypoint-label.hbs'

  /* ---------------------------------------- */

  //@ts-expect-error: types have not yet caught up
  protected _getWaypointLabelContext(waypoint: RulerWaypoint, state: any): AnyObject | void {
    // @ts-expect-error: types have not yet caught up
    const context = super._getWaypointLabelContext(waypoint, state)
    if (context === undefined) return context
    if (waypoint.next === null) {
      const units = canvas.scene?.grid.units ?? Length.Unit.Yard
      const yards = Length.from(waypoint.measurement.distance, units as LengthUnit)?.to(Length.Unit.Yard).value ?? 0
      this.distanceModifier = this._yardsToRangePenalty(yards)

      GURPS.ModifierBucket.setTempRangeMod(this.distanceModifier)
      context.modifier = { total: this.distanceModifier }
    }
    return context
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

  /* ---------------------------------------- */

  // @ts-expect-error: types have not yet caught up
  override reset(): void {
    if (this.distanceModifier !== 0) GURPS.ModifierBucket.addTempRangeMod()
    // @ts-expect-error: types have not yet caught up
    return super.reset()
  }
}

export { GurpsRuler }
