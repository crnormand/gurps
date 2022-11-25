import { ActorSourceGURPS } from "@actor/data"
import { ItemSourceGURPS } from "@item/data"

abstract class MigrationBase {
	static readonly version: number

	readonly version = (this.constructor as typeof MigrationBase).version

	requiresFlush = false
}

interface MigrationBase {
	updateActor?(_actor: ActorSourceGURPS): Promise<void>

	preUpdateItem?(item: ItemSourceGURPS, actor?: ActorSourceGURPS): Promise<void>

	updateItem?(item: ItemSourceGURPS, actor?: ActorSourceGURPS): Promise<void>

	updateUser?(userData: foundry.data.UserData["_source"]): Promise<void>

	migrate?(): Promise<void>
}

export { MigrationBase }
