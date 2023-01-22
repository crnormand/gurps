import { SETTINGS, SYSTEM_NAME } from "@module/data"
import { allLengthUnits, getLength, lengthSymbols, LengthUnits } from "./measure"
import { i18n, i18n_f } from "./misc"

class RangeGURPS {
	constructor() {
		this.setup()
		// This.ranges = _basicSetRanges()
		// this._buildModifiers()
	}

	setup() {
		Hooks.once("ready", async function () {
			// Self.update()

			// replace the range ruler
			// @ts-ignore
			Ruler.prototype._getSegmentLabel = (
				// @ts-ignore
				segment: RuleMeasurementSegment,
				totalDistance: number
			) => {
				// @ts-ignore
				let units = canvas?.scene?.grid.units
				Object.keys(lengthSymbols).forEach(k => {
					if (lengthSymbols[k as LengthUnits].includes(units)) units = k
				})
				if (!allLengthUnits.includes(units)) units = LengthUnits.Yard

				let label = `${Math.round(segment.distance * 100) / 100} ${units}`
				if (segment.last) label += ` [${Math.round(totalDistance * 100) / 100} ${units}]`

				const yards = getLength(totalDistance, units, LengthUnits.Yard)
				const mod = RangeGURPS.getRangeMod(yards)

				;(game as any).ModifierButton.setRangeMod({
					name: i18n_f("gurps.modifier.speed.range", {
						distance: `${Math.round(totalDistance * 100) / 100} ${units}`,
					}),
					modifier: mod,
				})

				label += ` (${mod})`
				return label
			}

			// @ts-ignore
			if (!Ruler.prototype._endMeasurementOrig) {
				// @ts-ignore
				Ruler.prototype._endMeasurementOrig = Ruler.prototype._endMeasurement
				// @ts-ignore
				Ruler.prototype._endMeasurement = function () {
					let addRangeMod = !(this as any).draggedEntity
					// @ts-ignore
					this._endMeasurementOrig()
					if (addRangeMod) {
						;(game as any).ModifierButton.addRangeMod()
					}
				}
			}
		})
	}

	static getRangeMod(yards: number): number {
		yards = Math.round(yards * 100) / 100
		const tableChoice = (game as Game).settings.get(SYSTEM_NAME, SETTINGS.SSRT) as any
		switch (tableChoice) {
			case "standard":
				return RangeGURPS._getRangeModStandard(yards)
			case "simplified":
				return RangeGURPS._getRangeModSimplified(yards)
			case "tens":
				return RangeGURPS._getRangeModTens(yards)
			default:
				return RangeGURPS._getRangeModStandard(yards)
		}
	}

	static _getRangeModStandard(yards: number): number {
		if (yards <= 0) return 0
		const standardTable = [2, 3, 5, 7, 10, 15]
		let logMod = Math.floor(Math.log(yards) / Math.log(10))
		if (yards < 20) logMod = 0
		const yardsReduced = yards / 10 ** logMod
		let index = -1
		for (const e of standardTable) {
			if (yardsReduced <= e) {
				index = standardTable.indexOf(e)
				break
			}
		}
		if (index === -1) index = standardTable.length - 1
		return -6 * logMod - index
	}

	static _getRangeModSimplified(yards: number): number {
		if (yards <= 5) return 0
		else if (yards <= 20) return -3
		else if (yards <= 100) return -7
		else if (yards <= 500) return -11
		else return -15
	}

	static _getRangeModTens(yards: number): number {
		return -Math.floor(yards / 10)
	}
}

export { RangeGURPS }
