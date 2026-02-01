import { Length, LengthUnit } from '../data/common/length.js'
import { tokenMoveColors } from './constants.ts'

// COMPATIBILITY: v12
function registerTokenRuler() {
  if (!game.release) return
  if (game.release?.generation < 13) return

  class GurpsTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
    /**
     * Get the style to be used to highlight the grid offset.
     * @param waypoint - The waypoint
     * @param offset   - An occupied grid offset at the given waypoint that is to be highlighted
     * @returns The color, alpha, texture, and texture matrix to be used to draw the grid space.
     *          If the alpha is 0, the grid space is not highlighted.
     */
    protected override _getGridHighlightStyle(
      waypoint: foundry.canvas.placeables.tokens.TokenRuler.Waypoint,
      offset: foundry.grid.BaseGrid.Offset3D
    ): foundry.canvas.placeables.tokens.TokenRuler.GridHighlightStyle {
      const data = super._getGridHighlightStyle(waypoint, offset)
      const actor = this.token.actor
      if (!actor) return data

      return { ...data, color: this._getColorForDistance(waypoint.measurement.cost, data.color) }
    }

    /* ---------------------------------------- */

    /**
     * Get the style of the segment from the previous to the given waypoint.
     * @param waypoint - The waypoint
     * @returns The line width, color, and alpha of the segment.  If the width is 0, no segment is drawn.
     */
    protected override _getSegmentStyle(
      waypoint: foundry.canvas.placeables.tokens.TokenRuler.Waypoint
    ): Ruler.SegmentStyle {
      const style = super._getSegmentStyle(waypoint)

      return { ...style, color: this._getColorForDistance(waypoint.measurement.cost, style.color) }
    }

    /* ---------------------------------------- */

    /**
     * Get the color for a segment or hex decoration based on the distance traveled by a token.
     * @param distance - The measured distance used to determine the color.
     * @param defaultColor - The default color to use if no special color is determined.
     * @returns The color to use for the segment or grid highlight.
     */
    protected _getColorForDistance(distance: number, defaultColor: PIXI.ColorSource = 0x000000): PIXI.ColorSource {
      const actor = this.token.actor
      if (!actor) return defaultColor

      const units = Length.unitFromString(canvas?.scene?.grid.units ?? Length.Unit.Yard)
      const yards = Length.from(distance, units as LengthUnit)?.to(Length.Unit.Yard).value ?? 0

      if (yards === 0) {
        return defaultColor
        // @ts-expect-error: waiting for actor update to DataModel
      } else if (yards <= Math.ceil(actor.system.currentmove / 10)) {
        return tokenMoveColors.step
        // @ts-expect-error: waiting for actor update to DataModel
      } else if (yards <= actor.system.currentmove) {
        return tokenMoveColors.move
        // @ts-expect-error: waiting for actor update to DataModel
      } else if (yards <= actor.system.currentsprint) {
        return tokenMoveColors.sprint
      } else {
        return tokenMoveColors.over
      }
    }
  }

  // COMPATIBILITY: v12
  interface GurpsTokenRuler {
    // @ts-expect-error: waiting for Foundry update to DataModel
    token: Token.Implementation
  }

  CONFIG.Token.rulerClass = GurpsTokenRuler
}

export { registerTokenRuler }
