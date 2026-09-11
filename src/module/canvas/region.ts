import { USE_BOOK_REGION_RADIUS } from './types.js'

class GurpsRegion extends foundry.canvas.placeables.Region {
  // @ts-expect-error: Waiting for fvtt-types update
  protected override _formatMeasuredDistance(distance: number): string {
    const shapes = this.document.shapes
    const isSingleCircle = shapes.length === 1 && shapes[0].type === 'circle'

    // @ts-expect-error: Waiting for fvtt-types update
    const isMeasuredTemplate = this.document.displayMeasurements && this.document.highlightMode === 'coverage'
    const useBookRegionRadius = (game.settings?.get(GURPS.SYSTEM_NAME, USE_BOOK_REGION_RADIUS) as boolean) ?? false
    const halfGridDistance = (canvas?.scene?.grid?.distance ?? 1) / 2

    // @ts-expect-error: Waiting for fvtt-types update
    return super._formatMeasuredDistance(
      isSingleCircle && isMeasuredTemplate && useBookRegionRadius ? distance + halfGridDistance : distance
    )
  }
}

/* ---------------------------------------- */

export { GurpsRegion }
