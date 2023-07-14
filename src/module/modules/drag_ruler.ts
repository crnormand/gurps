import { CharacterGURPS, StaticCharacterGURPS } from "@actor"
import { SYSTEM_NAME } from "@module/data"
import { TokenGURPS } from "@module/token"

export const init = function () {
	Hooks.once("dragRuler.ready", (SpeedProvider: any) => {
		class SpeedProviderGURPS extends SpeedProvider {
			get colors() {
				return [
					{ id: "walk", default: 0x00ff00, name: "gurps.modules.drag_ruler.walk" },
					{ id: "sprint", default: 0xffff00, name: "gurps.modules.drag_ruler.sprint" },
					{ id: "fly", default: 0xff8000, name: "gurps.modules.drag_ruler.fly" },
				]
			}

			getRanges(token: TokenGURPS) {
				const actor = token.actor as CharacterGURPS | StaticCharacterGURPS
				const ranges = [
					{ range: actor.effectiveMove, color: "walk" },
					{ range: actor.effectiveSprint, color: "sprint" },
				]
				return ranges
			}
		}

		// @ts-ignore
		dragRuler.registerSystem(SYSTEM_NAME, SpeedProviderGURPS)
	})
}
