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
type DamageType = {
	key: string
	label: string
	theDefault: ModifierFunction
	unliving: ModifierFunction
	homogenous: ModifierFunction
	diffuse: ModifierFunction
}

const DamageTypes = {
	injury: <DamageType>{
		key: "injury",
		label: "gurps.damage.type.injury",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	burn: <DamageType>{
		key: "burn",
		label: "gurps.damage.type.burn",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	cor: <DamageType>{
		key: "cor",
		label: "gurps.damage.type.cor",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	cr: <DamageType>{
		key: "cr",
		label: "gurps.damage.type.cr",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	cut: <DamageType>{
		key: "cut",
		label: "gurps.damage.type.cut",
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	fat: <DamageType>{
		key: "fat",
		label: "gurps.damage.type.fat",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	imp: <DamageType>{
		key: "imp",
		label: "gurps.damage.type.imp",
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	"pi-": <DamageType>{
		key: "pi-",
		label: "gurps.damage.type.pi-",
		theDefault: oneHalf,
		unliving: oneFifth,
		homogenous: oneTenth,
		diffuse: max1,
	},
	pi: <DamageType>{
		key: "pi",
		label: "gurps.damage.type.pi",
		theDefault: identity,
		unliving: oneThird,
		homogenous: oneFifth,
		diffuse: max1,
	},
	"pi+": <DamageType>{
		key: "pi+",
		label: "gurps.damage.type.pi+",
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: oneThird,
		diffuse: max1,
	},
	"pi++": <DamageType>{
		key: "pi++",
		label: "gurps.damage.type.pi++",
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	tox: <DamageType>{
		key: "tox",
		label: "gurps.damage.type.tox",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	// TODO Should we include "knockback only" as a damage type?
	kb: <DamageType>{
		key: "kb",
		label: "gurps.damage.type.kb",
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
}

const AnyPiercingType: Array<DamageType> = [DamageTypes.pi, DamageTypes["pi-"], DamageTypes["pi+"], DamageTypes["pi++"]]

export { DamageType, DamageTypes, AnyPiercingType }
