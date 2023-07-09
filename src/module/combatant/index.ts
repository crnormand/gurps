import { ActorType } from "@module/data"

class CombatantGURPS extends Combatant {

	override get isDefeated(): boolean {
		if (this.actor?.type === ActorType.Character) return (this.actor as any).isDefeated
		return super.isDefeated
	}
}

export { CombatantGURPS }
