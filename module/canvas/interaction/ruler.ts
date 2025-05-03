import { AnyObject } from 'fvtt-types/utils'

// class RulerGURPSv2 extends foundry.canvas.interaction.Ruler {
class RulerGURPSv2 extends Ruler {
  // Used to determine the distance modifier to apply to the modifier bucket
  // when releasing the ruler.
  distanceModifier = 0

  /* ---------------------------------------- */

  static override WAYPOINT_LABEL_TEMPLATE = 'systems/gurps/templates/canvas/ruler-waypoint-label.hbs'

  /* ---------------------------------------- */

  //@ts-expect-error: types have not yet caught up
  protected _getWaypointLabelContext(waypoint: RulerWaypoint, state: any): AnyObject | void {
    const context = super._getWaypointLabelContext(waypoint, state)
    if (context === undefined) return context
    console.log(waypoint, state)
    if (waypoint.next === null) {
      this.distanceModifier = -waypoint.measurement.spaces
      context.modifier = { total: this.distanceModifier }
    }
    // console.log('context', context)
    return context
  }

  /* ---------------------------------------- */

  // @ts-expect-error: types have not yet caught up
  override reset(): void {
    console.trace('reset')
    console.log('this.distanceModifier', this.distanceModifier)
    this.distanceModifier = 0
    return super.reset()
  }
}

export { RulerGURPSv2 }
