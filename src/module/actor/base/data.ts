import { ActorType, RollModifier, SYSTEM_NAME } from "@module/data"
import { Context } from "types/foundry/common/abstract/document.mjs"
import { ActorDataSource } from "types/foundry/common/data/data.mjs/actorData"

export interface ActorFlagsGURPS extends Record<string, unknown> {
	[SYSTEM_NAME]: {
		[ActorFlags.TargetModifiers]: RollModifier[]
		[ActorFlags.SelfModifiers]: RollModifier[]
		[ActorFlags.Deprecation]?: string
	}
}

export enum ActorFlags {
	TargetModifiers = "targetModifiers",
	SelfModifiers = "selfModifiers",
	Deprecation = "deprecation",
	MoveType = "move_type",
}

export interface BaseActorSourceGURPS<
	TActorType extends ActorType = ActorType,
	TSystemData extends ActorSystemData = ActorSystemData
> extends ActorDataSource {
	name: string
	type: TActorType
	system: TSystemData
	flags: DeepPartial<ActorFlagsGURPS>
}

export interface ActorSystemData {
	id: string
	type: ActorType
}

export interface ActorConstructorContextGURPS extends Context<TokenDocument> {
	gurps?: {
		ready?: boolean
		imported?: boolean
	}
}
