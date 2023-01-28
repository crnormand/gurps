import { CharacterSource } from "@actor/character/data"
import { ActorType } from "@actor/data"
import { StaticCharacterSource } from "@actor/static_character/data"
import { MigrationBase } from "../base"

export class Migration_1_0_0 extends MigrationBase {
	static override version = 1.0

	override async updateActor(actor: CharacterSource | StaticCharacterSource): Promise<void> {
		if (actor.type === ActorType.LegacyCharacter) {
			actor = actor as StaticCharacterSource
			// Do migration stuff
		}
	}
}
