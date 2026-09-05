import { USE_BOOK_REGION_RADIUS } from './types.js'

class GurpsRegion extends foundry.canvas.placeables.Region {
  // @ts-expect-error: Waiting for fvtt-types update
  protected override _formatMeasuredDistance(distance: number): string {
    const shapes = this.document.shapes
    const isSingleCircle = shapes.length === 1 && shapes[0].type === 'circle'

    // @ts-expect-error: Waiting for fvtt-types update
    const isMeasuredTemplate = this.document.displayMeasurements && this.document.highlightMode === 'coverage'
    const useBookRegionRadius = game.settings?.get(GURPS.SYSTEM_NAME, USE_BOOK_REGION_RADIUS)

    // @ts-expect-error: Waiting for fvtt-types update
    return super._formatMeasuredDistance(
      isSingleCircle && isMeasuredTemplate && useBookRegionRadius ? distance + 0.5 : distance
    )
  }

  foo(): boolean {
    const shapes = this.document.shapes
    const isSingleCircle = shapes.length === 1 && shapes[0].type === 'circle'

    // @ts-expect-error: Waiting for fvtt-types update
    const isMeasuredTemplate = this.document.displayMeasurements && this.document.highlightMode === 'coverage'
    const useBookRegionRadius = game.settings?.get(GURPS.SYSTEM_NAME, USE_BOOK_REGION_RADIUS)

    console.log('GURPS | GurpsRegion.foo() called')
    console.log(`isSingleCircle: ${isSingleCircle}`)
    console.log(`isMeasuredTemplate: ${isMeasuredTemplate}`)
    console.log(`useBookRegionRadius: ${useBookRegionRadius}`)

    return isSingleCircle && isMeasuredTemplate && useBookRegionRadius
  }
}

/* ---------------------------------------- */

export { GurpsRegion }
