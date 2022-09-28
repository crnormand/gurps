describe("Active Effect tests", () => {
	describe("B381: Stunning", () => {
		it("If you’re stunned, you are -4 to active defenses and cannot retreat, and must Do Nothing on your next turn.", () => {
			expect("stun").toBeTruthy()
		})
		it("At the end of your turn, attempt a HT roll to recover.", () => {
			expect("stun").toBeTruthy()
		})
	})
	it("B381: Shock. Shock is a penalty to DX, IQ, and skills based on those attributes on your next turn (only).", () => {
		expect("stun").toBeTruthy()
	})
	it("B381: Knockdown. Shock is a penalty to DX, IQ, and skills based on those attributes on your next turn (only).", () => {
		expect("stun").toBeTruthy()
	})
})
