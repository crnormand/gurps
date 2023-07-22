import { BaseActorSourceGURPS } from "@actor"
import { StaticCharacterSource } from "@actor/static/data"
import { ActorType } from "@module/data"
import { MigrationBase } from "../base"

export class Migration_1_0_0 extends MigrationBase {
	static override version = 1.0

	override async updateActor(actor: BaseActorSourceGURPS): Promise<void> {
		if (actor.type === ActorType.LegacyCharacter) {
			actor = actor as StaticCharacterSource
			// Do migration stuff
		}
		if (actor.type === ActorType.LegacyEnemy) {
			actor.type = ActorType.LegacyCharacter
		}
	}
}
