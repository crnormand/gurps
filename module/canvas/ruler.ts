import * as Settings from '../../lib/miscellaneous-settings.js'
import { Length, LengthUnit } from '../data/common/index.js'

function registerRuler() {
  class GurpsRuler extends foundry.canvas.interaction.Ruler {
    // Used to determine the distance modifier to apply to the modifier bucket
    // when releasing the ruler.
    distanceModifier = 0

    /* ---------------------------------------- */

    static override WAYPOINT_LABEL_TEMPLATE = 'systems/gurps/templates/canvas/ruler-waypoint-label.hbs'

    /* ---------------------------------------- */

    protected override _getWaypointLabelContext(waypoint: Ruler.Waypoint, state: any): Ruler.WaypointContext | void {
      const context = super._getWaypointLabelContext(waypoint, state)
      if (context === undefined) return context
      if (waypoint.next === null) {
        const units = Length.unitFromString(canvas?.scene?.grid.units ?? Length.Unit.Yard)
        const yards = Length.from(waypoint.measurement.distance, units as LengthUnit)?.to(Length.Unit.Yard).value ?? 0
        this.distanceModifier = this.yardsToRangePenalty(yards)

        GURPS.ModifierBucket.setTempRangeMod(this.distanceModifier)

        // @ts-expect-error: Add to context for display.
        context.modifier = { total: this.distanceModifier }
      }
      return context
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

    /* ---------------------------------------- */

    override reset(): void {
      if (this.distanceModifier !== 0) GURPS.ModifierBucket.addTempRangeMod()
      return super.reset()
    }
  }

  CONFIG.Canvas.rulerClass = GurpsRuler
}

export { registerRuler }
