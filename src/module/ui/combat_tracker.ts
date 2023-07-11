import { CharacterGURPS } from "@actor"
import { ConditionGURPS, ConditionID } from "@item"
import { CombatantGURPS } from "@module/combatant"
import { ActorType } from "@module/data"

class CombatTrackerGURPS extends CombatTracker {
	override async _onToggleDefeatedStatus(combatant: CombatantGURPS) {
		if (!(combatant.actor?.type === ActorType.Character)) return super._onToggleDefeatedStatus(combatant)

		const isDefeated = !combatant.isDefeated
		await combatant.update({ defeated: isDefeated })
		const actor = combatant.actor as CharacterGURPS
		if (!actor) return

		if (isDefeated) await actor.addConditions([ConditionID.Dead])
		else await actor.removeConditions([ConditionID.Dead])
	}

	async getData(options = {}) {
		const data = (await super.getData(options)) as any
		const turns = data.turns
		turns?.forEach((t: any) => {
			t.effects = t.effects.filter((e: string) => e !== ConditionGURPS.getData(ConditionID.Dead).img)
		})
		data.turns = turns
		return data
	}
}

export { CombatTrackerGURPS }
