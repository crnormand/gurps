// Import { BaseActorGURPS } from "@actor";
import { ActorType } from "@actor/data"
import { ActorDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData"

export interface ActorFlagsGURPS extends Record<string, unknown> {
	gurps?: Record<ActorFlags, unknown>
}

export enum ActorFlags {
	TargetModifiers = "targetModifiers",
	SelfModifiers = "selfModifiers",
	Deprecation = "deprecation"
}

export interface BaseActorSourceGURPS<
	TActorType extends ActorType = ActorType,
	TSystemData extends ActorSystemData = ActorSystemData
> extends ActorDataSource {
	type: TActorType
	system: TSystemData
	flags: DeepPartial<ActorFlagsGURPS>
}

export interface ActorSystemData {
	id: string
	type: ActorType
}
