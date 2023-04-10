import { LocalizeGURPS } from "@util"
import {
	double,
	identity,
	max1,
	max2,
	oneAndOneHalf,
	oneFifth,
	oneHalf,
	oneTenth,
	oneThird,
	ModifierFunction,
} from "./utils"

/**
 * Create the definitions of GURPS damage types.
 */
enum DamageType {
	// "Injury" has no damage type and is assumed to ignore DR and wounding
	injury = "injury",
	burn = "burning",
	cor = "corrosive",
	cr = "crushing",
	cut = "cutting",
	fat = "fatigue",
	imp = "impaling",
	"pi-" = "small piercing",
	pi = "piercing",
	"pi+" = "large piercing",
	"pi++" = "huge piercing",
	tox = "toxic",
	// TODO Should we include "knockback only" as a damage type?
	kb = "knockback only",
}

type DamageTypeData = {
	[key in DamageType]: {
		theDefault: ModifierFunction
		unliving: ModifierFunction
		homogenous: ModifierFunction
		diffuse: ModifierFunction
	}
}

type _DamageType = {
	key: string
	label: string
	theDefault: ModifierFunction
	unliving: ModifierFunction
	homogenous: ModifierFunction
	diffuse: ModifierFunction
}

const _DamageTypes = {
	injury: <_DamageType>{
		key: "injury",
		label: "gurps.damage.type.injury",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	burn: <_DamageType>{
		key: "burn",
		label: "gurps.damage.type.burn",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	cor: <_DamageType>{
		key: "cor",
		label: "gurps.damage.type.cor",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	cr: <_DamageType>{
		key: "cr",
		label: "gurps.damage.type.cr",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	cut: <_DamageType>{
		key: "cut",
		label: "gurps.damage.type.cut",
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	fat: <_DamageType>{
		key: "fat",
		label: "gurps.damage.type.fat",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	imp: <_DamageType>{
		key: "imp",
		label: "gurps.damage.type.imp",
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	"pi-": <_DamageType>{
		key: "pi-",
		label: "gurps.damage.type.pi-",
		theDefault: oneHalf,
		unliving: oneFifth,
		homogenous: oneTenth,
		diffuse: max1,
	},
	pi: <_DamageType>{
		key: "pi",
		label: "gurps.damage.type.pi",
		theDefault: identity,
		unliving: oneThird,
		homogenous: oneFifth,
		diffuse: max1,
	},
	"pi+": <_DamageType>{
		key: "pi+",
		label: "gurps.damage.type.pi+",
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: oneThird,
		diffuse: max1,
	},
	"pi++": <_DamageType>{
		key: "pi++",
		label: "gurps.damage.type.pi++",
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	tox: <_DamageType>{
		key: "tox",
		label: "gurps.damage.type.tox",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	// TODO Should we include "knockback only" as a damage type?
	kb: <_DamageType>{
		key: "kb",
		label: "gurps.damage.type.kb",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
}

const AnyPiercingType: Array<_DamageType> = [
	_DamageTypes.pi,
	_DamageTypes["pi-"],
	_DamageTypes["pi+"],
	_DamageTypes["pi++"],
]

const dataTypeMultiplier: DamageTypeData = {
	[DamageType.injury]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.burn]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.cor]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.cr]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.cut]: {
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.fat]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.imp]: {
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	[DamageType["pi-"]]: {
		theDefault: oneHalf,
		unliving: oneFifth,
		homogenous: oneTenth,
		diffuse: max1,
	},
	[DamageType.pi]: {
		theDefault: identity,
		unliving: oneThird,
		homogenous: oneFifth,
		diffuse: max1,
	},
	[DamageType["pi+"]]: {
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: oneThird,
		diffuse: max1,
	},
	[DamageType["pi++"]]: {
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	[DamageType.tox]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.kb]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
}

export { _DamageType, _DamageTypes, dataTypeMultiplier, AnyPiercingType }
