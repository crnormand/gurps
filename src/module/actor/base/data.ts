// Import { BaseActorGURPS } from "@actor";
import { ActorDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";

export enum ActorType {
	CharacterGCS = "character_gcs",
	CharacterGCA = "character",
	MassCombatElement = "element",
	Vehicle = "vehicle",
	Merchant = "merchant",
}

export interface ActorFlagsGURPS extends Record<string, unknown> {
	gurps?: Record<ActorFlags, unknown>;
}

export enum ActorFlags {
	TargetModifiers = "targetModifiers",
	SelfModifiers = "selfModifiers",
}

export interface BaseActorSourceGURPS<
	TActorType extends ActorType = ActorType,
	TSystemData extends ActorSystemData = ActorSystemData
> extends ActorDataSource {
	type: TActorType;
	data: TSystemData;
	flags: DeepPartial<ActorFlagsGURPS>;
}

export interface ActorSystemData {
	id: string;
	type: ActorType;
}
