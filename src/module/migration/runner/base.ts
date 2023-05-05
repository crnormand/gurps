import { MigrationBase } from "@module/migration/base"

export class MigrationRunnerBase {
	migrations: MigrationBase[]

	static LATEST_SCHEMA_VERSION = 1.0

	static MINIMUM_SAGE_VERSION = 1.0

	static RECOMMENDED_SAFE_VERSION = 1.0

	constructor(migrations: MigrationBase[] = []) {
		this.migrations = migrations.sort((a, b) => a.version - b.version)
	}

	needsMigration(currentVersion: number): boolean {
		return currentVersion < (this.constructor as typeof MigrationRunnerBase).LATEST_SCHEMA_VERSION
	}

	// TODO: implement
}
