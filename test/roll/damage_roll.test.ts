import { DamageRollGURPS } from "@module/roll/damage_roll"

describe("Damage Roll tests", () => {
	describe("sanitize", () => {
		it("3d imp", () => {
			const roll = new DamageRollGURPS("3d imp")
			expect(roll.rollFormula).toBe("3d6")
		})

		it("3d+1 fat", () => {
			const roll = new DamageRollGURPS("3d+1 fat")
			expect(roll.rollFormula).toBe("3d6+1")
		})

		it("3d-1 fat", () => {
			const roll = new DamageRollGURPS("3d-1 fat")
			expect(roll.rollFormula).toBe("3d6-1")
		})

		it("3d–1 fat ('minus' character)", () => {
			const roll = new DamageRollGURPS("3d-1 fat")
			expect(roll.rollFormula).toBe("3d6-1")
		})

		it("3d*2 fat ex", () => {
			const roll = new DamageRollGURPS("3d*2 fat ex")
			expect(roll.rollFormula).toBe("3d6*2")
		})

		it("3dx2 fat ex", () => {
			const roll = new DamageRollGURPS("3dx2 fat ex")
			expect(roll.rollFormula).toBe("3d6*2")
		})

		it("3d×2 fat ex", () => {
			const roll = new DamageRollGURPS("3d×2 fat ex")
			expect(roll.rollFormula).toBe("3d6*2")
		})

		it("3d+2×5 (2) pi+ ex", () => {
			const roll = new DamageRollGURPS("3d+2×5 (2) pi+ ex")
			expect(roll.rollFormula).toBe("3d6+2*5")
		})

		it("10 dmg", () => {
			const roll = new DamageRollGURPS("10 dmg")
			expect(roll.rollFormula).toBe("10")
		})

		it("3d(2)dmgex", () => {
			const roll = new DamageRollGURPS("3d(2)dmgex")
			expect(roll.rollFormula).toBe("3d6")
		})

		it("10+3*4 cor", () => {
			const roll = new DamageRollGURPS("10+3*4 cor")
			expect(roll.rollFormula).toBe("10+3*4")
		})

		it("2d8x3 pi-", () => {
			const roll = new DamageRollGURPS("2d8x3 pi-")
			expect(roll.rollFormula).toBe("2d8*3")
		})
	})

	describe("displayString", () => {
		it("1d cr", () => {
			const roll = new DamageRollGURPS("1d cr")
			expect(roll.displayString).toBe("1d cr")
		})

		it("3d(2)dmg", () => {
			const roll = new DamageRollGURPS("3d(2)dmg")
			expect(roll.displayString).toBe("3d (2) dmg")
		})

		it("3d+2×5 pi+", () => {
			const roll = new DamageRollGURPS("3d+2×5 pi+")
			expect(roll.displayString).toBe("3d+2×5 pi+")
		})

		it("3d*5 pi-", () => {
			const roll = new DamageRollGURPS("3d*5 pi-")
			expect(roll.displayString).toBe("3d×5 pi-")
		})

		it("3dx5 pi-", () => {
			const roll = new DamageRollGURPS("3dx5 pi-")
			expect(roll.displayString).toBe("3d×5 pi-")
		})

		it("3d-5 tox", () => {
			const roll = new DamageRollGURPS("3d-5 tox")
			expect(roll.displayString).toBe("3d–5 tox")
		})

		it("3d–5 tox ('minus' character)", () => {
			const roll = new DamageRollGURPS("3d–5 tox")
			expect(roll.displayString).toBe("3d–5 tox")
		})

		it("10 dmg", () => {
			const roll = new DamageRollGURPS("10 dmg")
			expect(roll.displayString).toBe("10 dmg")
		})

		it("10+3*4 cor", () => {
			const roll = new DamageRollGURPS("10+3*4 cor")
			expect(roll.displayString).toBe("10+3×4 cor")
		})

		it("2d8x3 pi-", () => {
			const roll = new DamageRollGURPS("2d8x3 pi-")
			expect(roll.displayString).toBe("2d8×3 pi-")
		})

		it("3d-2x5 (2) pi+ ex", () => {
			const roll = new DamageRollGURPS("3d-2x5 (2) pi+ ex")
			expect(roll.displayString).toBe("3d–2×5 (2) pi+ ex")
		})

		it("3d-2x5(2)injuryex", () => {
			const roll = new DamageRollGURPS("3d-2x5(2)injuryex")
			expect(roll.displayString).toBe("3d–2×5 (2) injury ex")
		})
	})
})
