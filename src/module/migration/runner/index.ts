// Import { SYSTEM_NAME } from "@module/data"
import { MigrationRunnerBase } from "./base"

export class MigrationRunner extends MigrationRunnerBase {
	override needsMigration(): boolean {
		return false
		// Return super.needsMigration(game.settings.get(SYSTEM_NAME, "worldSchemaVersion"))
	}
}
