/* eslint-disable semi */
import { DamageCalculator } from "@module/damage_calculator"

// Add real tests here.
describe("Damage calculator tests", () => {
	it("calculator exists", () => {
		let calc: DamageCalculator = new DamageCalculator()
		expect(true).toBeTruthy()
	})
})
