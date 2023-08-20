import { Attribute, AttributeDefObj, AttributeObj, AttributeType } from "@module/attribute"
import { DamageProgression, gid, SETTINGS, SYSTEM_NAME } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { damageProgression } from "@util"
import { MookEquipment, MookMelee, MookNote, MookProfile, MookRanged, MookSkill, MookSpell, MookTrait } from "./data"
class Mook {
	protected variableResolverExclusions: Map<string, boolean> = new Map()

	update(data: any): void {
		mergeObject(this, data)
		this.attributes = this.getAttributes()
	}

	constructor() {
		this.settings = {
			attributes: game.settings.get(
				SYSTEM_NAME,
				`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
			) as AttributeDefObj[],
			damage_progression: (game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_SHEET_SETTINGS}.settings`) as any)
				.damage_progression,
		}
		this.system = {
			attributes: this.newAttributes(this.settings.attributes),
		}
		this.attributes = this.getAttributes()
		this.traits = []
		this.skills = []
		this.spells = []
		this.melee = []
		this.ranged = []
		this.equipment = []
		this.other_equipment = []
		this.notes = []
		this.profile = {
			name: "Bad Guy",
			description: "",
			title: "",
			height: "",
			weight: "",
			SM: 0,
			portrait: foundry.CONST.DEFAULT_TOKEN,
		}
		if (this.attributes.has(gid.Strength)) {
			this.thrust = damageProgression.thrustFor(this.settings.damage_progression, this.attributes.get("st")!.max)
			this.swing = damageProgression.swingFor(this.settings.damage_progression, this.attributes.get("st")!.max)
		}
	}

	private newAttributes(defs: AttributeDefObj[]): AttributeObj[] {
		const atts: AttributeObj[] = []
		let i = 0
		for (const def of defs) {
			const attr = new Attribute(this, def.id, i)
			if (
				[
					AttributeType.PrimarySeparator,
					AttributeType.SecondarySeparator,
					AttributeType.PoolSeparator,
				].includes(def.type)
			) {
				atts.push({
					attr_id: attr.attr_id,
					adj: attr.adj,
				})
			} else {
				atts.push({
					attr_id: attr.attr_id,
					adj: attr.adj,
				})
			}
			if (attr.damage) atts[i].damage = attr.damage
			i++
		}
		return atts
	}

	getAttributes(att_array = this.system.attributes): Map<string, Attribute> {
		const attributes: Map<string, Attribute> = new Map()
		if (!att_array.length) return attributes
		att_array.forEach((v, k) => {
			attributes.set(v.attr_id, new Attribute(this, v.attr_id, k, v))
		})
		return attributes
	}

	get adjustedSizeModifier(): number {
		return this.profile.SM
	}

	getFlag(..._args: any[]): unknown {
		return null
	}

	attributeBonusFor(..._args: any[]): number {
		return 0
	}

	costReductionFor(..._args: any[]): number {
		return 0
	}

	resolveVariable(variableName: string): string {
		if (this.variableResolverExclusions?.has(variableName)) {
			console.warn(`Attempt to resolve variable via itself: $${variableName}`)
			return ""
		}
		if (!this.variableResolverExclusions) this.variableResolverExclusions = new Map()
		this.variableResolverExclusions.set(variableName, true)
		if (gid.SizeModifier === variableName) return this.profile.SM.signedString()
		const parts = variableName.split(".") // TODO: check
		let attr: Attribute | undefined = this.attributes.get(parts[0])
		if (!attr) {
			console.warn(`No such variable: $${variableName}`)
			return ""
		}
		let def
		if (attr instanceof Attribute) {
			// Def = this.settings.attributes.find(e => e.id === (attr as Attribute).attr_id)
			def = attr.attribute_def
		}
		if (!def) {
			console.warn(`No such variable definition: $${variableName}`)
			return ""
		}
		this.variableResolverExclusions = new Map()
		return attr?.max.toString()
	}

	isSkillLevelResolutionExcluded(..._args: any[]) {
		return false
	}

	registerSkillLevelResolutionExclusion(..._args: any[]): void {
		// do nothing}
	}

	unregisterSkillLevelResolutionExclusion(..._args: any[]): void {
		// do nothing}
	}

	encumbranceLevel(_forSkills: boolean) {
		return {
			level: 0,
			maximum_carry: 0,
			penalty: 0,
			name: "",
		}
	}

	effectiveST(initialST: number): number {
		return initialST
	}

	// get traits(): Collection<any> {
	// 	return new Collection()
	// }

	// get skills(): Collection<any> {
	// 	return new Collection()
	// }
}

interface Mook {
	settings: {
		attributes: AttributeDefObj[]
		damage_progression: DamageProgression
	}
	system: {
		attributes: AttributeObj[]
	}
	attributes: Map<string, Attribute>
	traits: MookTrait[]
	skills: MookSkill[]
	spells: MookSpell[]
	melee: MookMelee[]
	ranged: MookRanged[]
	equipment: MookEquipment[]
	other_equipment: MookEquipment[]
	notes: MookNote[]
	profile: MookProfile
	thrust: DiceGURPS
	swing: DiceGURPS
}

export { Mook }
