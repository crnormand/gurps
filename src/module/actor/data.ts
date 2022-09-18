import { CharacterDataGURPS } from "@actor/character/data";
import { StaticCharacterDataGURPS } from "./static_character/data";

export type ActorDataGURPS = CharacterDataGURPS | StaticCharacterDataGURPS;

export type ActorSourceGURPS = ActorDataGURPS["_source"];
