import { BaseActorGURPS, ActorConstructorContextGURPS, ActorFlags } from "@actor/base"
import {
	BaseItemGURPS,
	CR_Features,
	EquipmentContainerGURPS,
	EquipmentGURPS,
	ItemFlags,
	ItemGCS,
	MeleeWeaponGURPS,
	ModifierChoiceSheet,
	NoteContainerGURPS,
	NoteGURPS,
	RangedWeaponGURPS,
	RitualMagicSpellGURPS,
	SkillContainerGURPS,
	SkillGURPS,
	SpellContainerGURPS,
	SpellGURPS,
	TechniqueGURPS,
	TraitContainerGURPS,
	TraitGURPS,
	WeaponType,
} from "@item"
import { CondMod } from "@module/conditional-modifier"
import {
	attrPrefix,
	EFFECT_ACTION,
	gid,
	ItemType,
	MoveType,
	SETTINGS,
	StringComparison,
	SYSTEM_NAME,
} from "@module/data"
import { DiceGURPS } from "@module/dice"
import { SETTINGS_TEMP } from "@module/settings"
import { SkillDefault } from "@module/default"
import { TooltipGURPS } from "@module/tooltip"
import {
	damageProgression,
	equalFold,
	getCurrentTime,
	LengthUnits,
	LocalizeGURPS,
	newUUID,
	numberCompare,
	round,
	SelfControl,
	stringCompare,
	urlToBase64,
	Weight,
	WeightUnits,
} from "@util"
import {
	CharacterFlagDefaults,
	CharacterSettings,
	CharacterSource,
	CharacterSystemData,
	DocumentModificationOptionsGURPS,
	Encumbrance,
} from "./data"
import { ResourceTrackerDef } from "@module/resource_tracker/tracker_def"
import { CharacterImporter } from "./import"
import { HitLocation, HitLocationTable } from "./hit_location"
import { AttributeBonusLimitation } from "@feature/attribute_bonus"
import { Feature, featureMap, ItemGURPS, WeaponGURPS } from "@module/config"
import { ConditionID } from "@item/condition"
import Document, { DocumentModificationOptions, Metadata } from "types/foundry/common/abstract/document.mjs"
import { ActorDataConstructorData } from "types/foundry/common/data/data.mjs/actorData"
import { Attribute, AttributeDef, AttributeObj, AttributeType, PoolThreshold, ThresholdOp } from "@module/attribute"
import { ResourceTracker, ResourceTrackerObj } from "@module/resource_tracker"
import {
	ConditionalModifier,
	FeatureType,
	ReactionBonus,
	SkillBonus,
	WeaponDamageBonus,
	WeaponDRDivisorBonus,
} from "@feature"

class CharacterGURPS extends BaseActorGURPS {
	attributes: Map<string, Attribute> = new Map()

	private _prevAttributes: Map<string, Attribute> = new Map()

	private _processingThresholds = false

	resource_trackers: Map<string, ResourceTracker> = new Map()

	variableResolverExclusions: Map<string, boolean> = new Map()

	skillResolverExclusions: Map<string, boolean> = new Map()

	features: featureMap

	// MoveData?: CharacterMove

	constructor(data: CharacterSource, context: ActorConstructorContextGURPS = {}) {
		super(data, context)
		if (this.system.attributes) this.attributes = this.getAttributes()
		// this._prevAttributes = this.attributes
		if (this.system.resource_trackers) this.resource_trackers = this.getResourceTrackers()
		this.features = {
			attributeBonuses: [],
			costReductions: [],
			drBonuses: [],
			skillBonuses: [],
			skillPointBonuses: [],
			spellBonuses: [],
			spellPointBonuses: [],
			weaponBonuses: [],
			// thresholdBonuses: [],
		}
		// This.moveData ??= {
		// 	maneuver: "none",
		// 	posture: "standing",
		// 	type: "ground"
		// }
	}

	SizeModBonus = 0

	protected _onCreate(data: any, options: DocumentModificationOptions | any, userId: string): void {
		const default_settings = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_SHEET_SETTINGS}.settings`
		) as CharacterSettings
		const default_attributes = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
		) as CharacterSettings["attributes"]
		const default_resource_trackers = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_RESOURCE_TRACKERS}.resource_trackers`
		) as CharacterSettings["resource_trackers"]
		const default_hit_locations = {
			name: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.name`),
			roll: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.roll`),
			locations: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.locations`),
		} as HitLocationTable
		const populate_description = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_SHEET_SETTINGS}.populate_description`
		) as boolean
		const initial_points = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_SHEET_SETTINGS}.initial_points`
		) as number
		const default_tech_level = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_SHEET_SETTINGS}.tech_level`
		) as string
		const sd: Partial<CharacterSystemData> = {
			id: newUUID(),
			created_date: getCurrentTime(),
			// Total_points: SETTINGS_TEMP.general.initial_points,
			// settings: SETTINGS_TEMP.sheet,
			// total_points: 100, // TODO: change
			// settings: default_settings,
			profile: {
				player_name: "",
				name: "",
				title: "",
				organization: "",
				age: "",
				birthday: "",
				eyes: "",
				hair: "",
				skin: "",
				handedness: "",
				height: "6'",
				weight: "0 lb",
				SM: 0,
				gender: "",
				tech_level: "",
				religion: "",
				portrait: "",
			},
			editing: true,
			calc: {
				swing: "",
				thrust: "",
				basic_lift: 0,
				lifting_st_bonus: 0,
				striking_st_bonus: 0,
				throwing_st_bonus: 0,
				move: [0, 0, 0, 0, 0],
				dodge: [0, 0, 0, 0, 0],
				dodge_bonus: 0,
				block_bonus: 0,
				parry_bonus: 0,
			},
		}
		sd.total_points = initial_points
		sd.points_record = [
			{
				when: sd.created_date!,
				points: initial_points,
				reason: LocalizeGURPS.translations.gurps.character.points_record.initial_points,
			},
		]
		sd.settings = default_settings
		sd.settings.attributes = default_attributes
		sd.settings.body_type = default_hit_locations
		sd.settings.resource_trackers = default_resource_trackers
		sd.modified_date = sd.created_date
		if (populate_description) sd.profile = SETTINGS_TEMP.general.auto_fill
		sd.profile!.tech_level = default_tech_level
		sd.attributes = this.newAttributes(sd.settings.attributes)
		sd.resource_trackers = this.newTrackers(sd.settings.resource_trackers)
		const flags = CharacterFlagDefaults
		this.update({ _id: this._id, system: sd, flags: flags })
		super._onCreate(data, options, userId)
		if (options.promptImport) {
			this.promptImport()
		}
	}

	// protected _preUpdate(
	// 	changed: DeepPartial<ActorDataGURPS>,
	// 	options: DocumentModificationOptions,
	// 	user: BaseUser
	// ): Promise<void> {
	// 	return super._preUpdate(changed, options, user)
	// }

	override update(
		data?: DeepPartial<ActorDataConstructorData | (ActorDataConstructorData & Record<string, unknown>)>,
		context?: DocumentModificationContext & foundry.utils.MergeObjectOptions & { noPrepare?: boolean }
	): Promise<this | undefined> {
		if (context?.noPrepare) this.noPrepare = true
		this.updateAttributes(data)
		this.checkImport(data)
		return super.update(data, context)
	}

	checkImport(data?: any) {
		for (const i in data) {
			if (i.includes("system.import")) return
			if (i.includes("ownership")) return
		}
		data["system.modified_date"] = new Date().toISOString()
	}

	// TODO: move to character/sheet -> _updateObject (maybe?)
	updateAttributes(data?: any) {
		for (const i in data) {
			if (i.includes("system.import")) return
		}
		if (this.system.attributes.length === 0) data["system.attributes"] = this.newAttributes()
		for (const i in data) {
			if (i === "system.settings.attributes") {
				data["system.attributes"] = this.newAttributes(
					data["system.settings.attributes"],
					this.system.attributes
				)
			}
			if (i === "system.settings.resource_trackers") {
				data["system.resource_trackers"] = this.newTrackers(
					data["system.settings.resource_trackers"],
					this.system.resource_trackers
				)
			}
			if (i.startsWith("system.attributes.")) {
				const att = this.attributes.get(i.split("attributes.")[1].split(".")[0])
				const type = i.split("attributes.")[1].split(".")[1]
				if (att) {
					if (type === "adj") data[i] -= att.max - att.adj
					else if (type === "damage") data[i] = Math.max(att.max - data[i], 0)
				}
			}
		}
	}

	// Getters
	get isDefeated(): boolean {
		return this.hasCondition(ConditionID.Dead)
	}

	get weightUnits(): WeightUnits {
		return this.settings.default_weight_units
	}

	get lengthUnits(): LengthUnits {
		return this.settings.default_length_units
	}

	get editing() {
		return this.system.editing
	}

	get profile() {
		return this.system.profile
	}

	get importData(): this["system"]["import"] {
		return this.system.import
	}

	get calc() {
		return this.system.calc
	}

	set calc(v: any) {
		this.system.calc = v
	}

	// Points
	get totalPoints(): number {
		return this.system.total_points
	}

	set totalPoints(v: number) {
		this.system.total_points = v
	}

	get spentPoints(): number {
		let total = this.attributePoints
		const { advantages, disadvantages, race, quirks } = this.traitPoints
		total += advantages + disadvantages + race + quirks
		total += this.skillPoints
		total += this.spellPoints
		return total
	}

	get unspentPoints(): number {
		return this.totalPoints - this.spentPoints
	}

	set unspentPoints(v: number) {
		if (v !== this.unspentPoints) this.totalPoints = v + this.spentPoints
	}

	primaryAttributes(includeSeparators = false): Map<string, Attribute> {
		const atts = new Map([...this.attributes].filter(([_k, v]) => v.attribute_def.isPrimary))
		if (includeSeparators) return atts
		return new Map([...atts].filter(([_k, v]) => v.attribute_def.type !== AttributeType.PrimarySeparator))
	}

	secondaryAttributes(includeSeparators = false): Map<string, Attribute> {
		const atts = new Map(
			[...this.attributes].filter(
				([_k, v]) => !v.attribute_def.isPrimary && !v.attribute_def.type.includes("pool")
			)
		)
		if (includeSeparators) return atts
		return new Map([...atts].filter(([_k, v]) => v.attribute_def.type !== AttributeType.SecondarySeparator))
	}

	poolAttributes(includeSeparators = false): Map<string, Attribute> {
		const atts = new Map([...this.attributes].filter(([_k, v]) => v.attribute_def.type === AttributeType.Pool))
		if (includeSeparators) return atts
		return new Map([...atts].filter(([_k, v]) => v.attribute_def.type !== AttributeType.PoolSeparator))
	}

	get attributePoints(): number {
		let total = 0
		this.attributes.forEach(a => {
			if (!isNaN(a.points)) total += a.points
		})
		return total
	}

	get traitPoints(): { advantages: number; disadvantages: number; race: number; quirks: number } {
		let [advantages, disadvantages, race, quirks] = [0, 0, 0, 0]
		for (const t of this.traits) {
			if (t.container !== t.actor) continue
			let [a, d, r, q] = t.calculatePoints()
			advantages += a
			disadvantages += d
			race += r
			quirks += q
		}
		return { advantages, disadvantages, race, quirks }
	}

	get skillPoints(): number {
		let total = 0
		for (const s of this.skills.filter(e => e instanceof SkillGURPS || e instanceof TechniqueGURPS) as Array<
			SkillGURPS | TechniqueGURPS
		>) {
			total += s.points ?? 0
		}
		return total
	}

	get spellPoints(): number {
		let total = 0
		for (const s of this.spells.filter(e => e instanceof SpellGURPS || e instanceof RitualMagicSpellGURPS) as Array<
			SpellGURPS | RitualMagicSpellGURPS
		>) {
			total += s.points ?? 0
		}
		return total
	}

	get currentMove() {
		return this.move(this.encumbranceLevel(true))
	}

	get effectiveMove() {
		return this.eMove(this.encumbranceLevel(true))
	}

	get effectiveSprint() {
		return Math.max(this.currentMove * 1.2, this.currentMove + 1)
	}

	get currentDodge() {
		return this.dodge(this.encumbranceLevel(true))
	}

	get effectiveDodge() {
		return this.eDodge(this.encumbranceLevel(true))
	}

	get dodgeAttribute() {
		return {
			id: gid.Dodge,
			attribute_def: {
				combinedName: LocalizeGURPS.translations.gurps.attributes.dodge,
			},
			effective: this.effectiveDodge,
			current: this.currentDodge,
		}
	}

	get sizeModAttribute() {
		return {
			attribute_def: {
				combinedName: LocalizeGURPS.translations.gurps.character.sm,
			},
			effective: this.sizeMod,
		}
	}

	effectiveST(initialST: number): number {
		const divisor = 2 * Math.min(this.countThresholdOpMet(ThresholdOp.HalveST), 2)
		let ST = initialST
		if (divisor > 0) ST = Math.ceil(initialST / divisor)
		if (ST < 1 && initialST > 0) return 1
		return ST
	}

	move(enc: Encumbrance): number {
		let initialMove = Math.max(0, this.resolveAttributeCurrent(gid.BasicMove))
		const move = Math.trunc((initialMove * (10 + 2 * enc.penalty)) / 10)
		if (move < 1) {
			if (initialMove > 0) return 1
			return 0
		}
		return move
	}

	// Move accounting for pool thresholds
	eMove(enc: Encumbrance): number {
		// Let initialMove = this.moveByType(Math.max(0, this.resolveAttributeCurrent(gid.BasicMove)))
		let initialMove = this.moveByType()
		let divisor = 2 * Math.min(this.countThresholdOpMet(ThresholdOp.HalveMove), 2)
		if (divisor === 0) divisor = 1
		if (divisor > 0) initialMove = Math.ceil(initialMove / divisor)
		const move = Math.trunc((initialMove * (10 + 2 * enc.penalty)) / 10)
		if (move < 1) {
			if (initialMove > 0) return 1
			return 0
		}
		return move
	}

	// TODO: improve
	moveByType(): number {
		let move = Math.max(0, this.resolveAttributeCurrent(gid.BasicMove))
		switch (this.moveType) {
			case "ground":
				if (this.hasCondition([ConditionID.PostureCrawl, ConditionID.PostureKneel])) move *= 1 / 3
				if (this.hasCondition([ConditionID.PostureCrouch])) move *= 2 / 3
				if (this.hasCondition([ConditionID.PostureProne])) move = 1
				if (this.hasCondition([ConditionID.PostureSit])) move = 0
				if (this.hasTrait("Aquatic")) return move
				return move
			case "water":
				if (this.hasTrait("Amphibious")) return move
				if (this.hasTrait("Aquatic")) return move
				return Math.floor(move / 5)
			case "air":
				if (this.hasTrait("Flight")) return this.resolveAttributeCurrent(gid.BasicSpeed) * 2
				return 0
			case "space":
				return 0
		}
		return 0
	}

	get moveType(): MoveType {
		return this.getFlag(SYSTEM_NAME, ActorFlags.MoveType) as MoveType
	}

	dodge(enc: Encumbrance): number {
		let dodge = 3 + (this.calc?.dodge_bonus ?? 0) + Math.max(this.resolveAttributeCurrent(gid.BasicSpeed), 0)
		return Math.floor(Math.max(dodge + enc.penalty, 1))
	}

	// Dodge accounting for pool thresholds
	eDodge(enc: Encumbrance): number {
		let dodge = 3 + (this.calc?.dodge_bonus ?? 0) + Math.max(this.resolveAttributeCurrent(gid.BasicSpeed), 0)
		const divisor = 2 * Math.min(this.countThresholdOpMet(ThresholdOp.HalveDodge), 2)
		if (divisor > 0) {
			dodge = Math.ceil(dodge / divisor)
		}
		return Math.floor(Math.max(dodge + enc.penalty, 1))
	}

	countThresholdOpMet(op: ThresholdOp) {
		let total = 0
		this.poolAttributes().forEach((a: Attribute) => {
			if (!a.apply_ops) return
			const threshold = a.currentThreshold
			if (threshold && threshold.ops?.includes(op)) total++
		})
		// this.features.thresholdBonuses.forEach(a => {
		// 	if (a.ops.includes(op)) total++
		// })
		return total
	}

	get settings() {
		let settings = this.system.settings
		settings.resource_trackers = settings.resource_trackers.map(e => new ResourceTrackerDef(e))
		settings.attributes = settings.attributes.map(e => new AttributeDef(e))
		// Const defs: Record<string, AttributeDef> = {}
		// for (const att in settings.attributes) {
		// 	defs[att] = new AttributeDef(settings.attributes[att])
		// }
		// ; (settings as any).attributes = defs
		return settings
	}

	get adjustedSizeModifier(): number {
		return (this.profile?.SM ?? 0) + this.size_modifier_bonus
	}

	get created_date(): string {
		return this.system.created_date
	}

	get modified_date(): string {
		return this.system.created_date
	}

	// Returns Basic Lift in pounds
	get basicLift(): number {
		const ST = this.attributes.get(gid.Strength)?._effective(this.calc?.lifting_st_bonus ?? 0) || 0
		const basicLift = ST ** 2 / 5
		if (basicLift === Infinity || basicLift === -Infinity) return 0
		if (basicLift >= 10) return Math.round(basicLift)
		return basicLift
	}

	get oneHandedLift(): number {
		return round(this.basicLift * 2, 4)
	}

	get twoHandedLift(): number {
		return round(this.basicLift * 8, 4)
	}

	get shove(): number {
		return round(this.basicLift * 12, 4)
	}

	get runningShove(): number {
		return round(this.basicLift * 24, 4)
	}

	get carryOnBack(): number {
		return round(this.basicLift * 15, 4)
	}

	get shiftSlightly(): number {
		return round(this.basicLift * 50, 4)
	}

	get fastWealthCarried(): string {
		return `$${this.wealthCarried()}`
	}

	get fastWeightCarried(): string {
		return Weight.format(this.weightCarried(false), this.weightUnits)
	}

	encumbranceLevel(for_skills = true, carried = this.weightCarried(for_skills)): Encumbrance {
		const autoEncumbrance = this.getFlag(SYSTEM_NAME, ActorFlags.AutoEncumbrance) as {
			active: boolean
			manual: number
		}
		const allEncumbrance = this.allEncumbrance
		if (autoEncumbrance && !autoEncumbrance.active) return allEncumbrance[autoEncumbrance?.manual || 0]
		// Const carried = this.weightCarried(for_skills)
		for (const e of allEncumbrance) {
			if (carried <= e.maximum_carry) return e
		}
		return allEncumbrance[allEncumbrance.length - 1]
	}

	weightCarried(for_skills: boolean): number {
		let total = 0
		this.carried_equipment.forEach(e => {
			if (e.parent === this) {
				total += e.extendedWeight(for_skills, this.settings.default_weight_units)
			}
		})
		return round(total, 4)
	}

	wealthCarried(): number {
		let value = 0
		for (const e of this.carried_equipment) {
			if (e.parent === this) value += e.extendedValue
		}
		return round(value, 4)
	}

	get fastWealthNotCarried(): string {
		return `$${this.wealthNotCarried()}`
	}

	wealthNotCarried(): number {
		let value = 0
		this.other_equipment.forEach(e => {
			if (e.parent === this) value += e.extendedValue
		})
		return round(value, 4)
	}

	get strengthOrZero(): number {
		return Math.max(this.resolveAttributeCurrent(gid.Strength), 0)
	}

	get thrust(): DiceGURPS {
		return this.thrustFor(this.strengthOrZero + this.striking_st_bonus)
	}

	thrustFor(st: number): DiceGURPS {
		return damageProgression.thrustFor(this.settings.damage_progression, st)
	}

	get swing(): DiceGURPS {
		return this.swingFor(this.strengthOrZero + this.striking_st_bonus)
	}

	swingFor(st: number): DiceGURPS {
		return damageProgression.swingFor(this.settings.damage_progression, st)
	}

	get allEncumbrance(): Encumbrance[] {
		const bl = this.basicLift
		const ae: Encumbrance[] = [
			{
				level: 0,
				maximum_carry: round(bl, 4),
				penalty: 0,
				name: LocalizeGURPS.translations.gurps.character.encumbrance[0],
			},
			{
				level: 1,
				maximum_carry: round(bl * 2, 4),
				penalty: -1,
				name: LocalizeGURPS.translations.gurps.character.encumbrance[1],
			},
			{
				level: 2,
				maximum_carry: round(bl * 3, 4),
				penalty: -2,
				name: LocalizeGURPS.translations.gurps.character.encumbrance[2],
			},
			{
				level: 3,
				maximum_carry: round(bl * 6, 4),
				penalty: -3,
				name: LocalizeGURPS.translations.gurps.character.encumbrance[3],
			},
			{
				level: 4,
				maximum_carry: round(bl * 10, 4),
				penalty: -4,
				name: LocalizeGURPS.translations.gurps.character.encumbrance[4],
			},
		]
		return ae
	}

	// Bonuses
	get size_modifier_bonus(): number {
		return this.attributeBonusFor(attrPrefix + gid.SizeModifier, AttributeBonusLimitation.None)
	}

	get striking_st_bonus(): number {
		return this.system.calc?.striking_st_bonus ?? 0
	}

	set striking_st_bonus(v: number) {
		this.system.calc.striking_st_bonus = v
	}

	get lifting_st_bonus(): number {
		return this.calc?.lifting_st_bonus ?? 0
	}

	set lifting_st_bonus(v: number) {
		this.calc.lifting_st_bonus = v
	}

	get throwing_st_bonus(): number {
		return this.system?.calc.throwing_st_bonus ?? 0
	}

	set throwing_st_bonus(v: number) {
		this.system.calc.throwing_st_bonus = v
	}

	get parryBonus(): number {
		return this.calc?.parry_bonus ?? 0
	}

	get blockBonus(): number {
		return this.calc?.block_bonus ?? 0
	}

	get dodgeBonus(): number {
		return this.calc?.dodge_bonus ?? 0
	}

	override get sizeMod(): number {
		if (!this.system?.profile) return 0
		return this.system.profile.SM + this.SizeModBonus
	}

	get hitLocationTable(): HitLocationTable {
		return this.BodyType
	}

	get BodyType(): HitLocationTable {
		let b = this.system.settings.body_type
		if (!b) return { name: "", roll: new DiceGURPS(), locations: [] }
		const body: HitLocationTable = {
			name: b.name,
			roll: b.roll,
			locations: [],
		}
		let start = new DiceGURPS(b.roll).minimum(false)
		for (const l of b.locations) {
			const loc = new HitLocation(this, body, l)
			start = loc.updateRollRange(start)
			body.locations.push(loc)
		}
		return body
	}

	get HitLocations(): HitLocation[] {
		return this.BodyType.locations
	}

	// Item Types
	get traits(): Collection<TraitGURPS | TraitContainerGURPS> {
		const traits: Collection<TraitGURPS | TraitContainerGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof TraitGURPS || item instanceof TraitContainerGURPS) traits.set(item._id, item)
		}
		return traits
	}

	get skills(): Collection<SkillGURPS | TechniqueGURPS | SkillContainerGURPS> {
		const skills: Collection<SkillGURPS | TechniqueGURPS | SkillContainerGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof SkillGURPS || item instanceof TechniqueGURPS || item instanceof SkillContainerGURPS)
				skills.set(item._id, item)
		}
		return skills
	}

	get spells(): Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS> {
		const spells: Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS> = new Collection()
		for (const item of this.items) {
			if (
				item instanceof SpellGURPS ||
				item instanceof RitualMagicSpellGURPS ||
				item instanceof SpellContainerGURPS
			)
				spells.set(item._id, item)
		}
		return spells
	}

	get equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		const equipment: Collection<EquipmentGURPS | EquipmentContainerGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof EquipmentGURPS || item instanceof EquipmentContainerGURPS) equipment.set(item._id, item)
		}
		return equipment
	}

	get carried_equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		return new Collection(
			this.equipment
				.filter(item => !item.other)
				.map(item => {
					return [item._id, item]
				})
		)
	}

	get other_equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		return new Collection(
			this.equipment
				.filter(item => item.other)
				.map(item => {
					return [item._id, item]
				})
		)
	}

	get notes(): Collection<NoteGURPS | NoteContainerGURPS> {
		const notes: Collection<NoteGURPS | NoteContainerGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof NoteGURPS || item instanceof NoteContainerGURPS) notes.set(item._id, item)
		}
		return notes
	}

	// Weapons
	get meleeWeapons(): Collection<MeleeWeaponGURPS> {
		const meleeWeapons: Collection<MeleeWeaponGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof MeleeWeaponGURPS) meleeWeapons.set(item._id, item)
		}
		return meleeWeapons
	}

	get rangedWeapons(): Collection<RangedWeaponGURPS> {
		const rangedWeapons: Collection<RangedWeaponGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof RangedWeaponGURPS) rangedWeapons.set(item._id, item)
		}
		return rangedWeapons
	}

	get weapons(): Collection<WeaponGURPS> {
		const weapons: Collection<WeaponGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof MeleeWeaponGURPS) weapons.set(item._id, item)
			if (item instanceof RangedWeaponGURPS) weapons.set(item._id, item)
		}
		return weapons
	}

	equippedWeapons(type: WeaponType): WeaponGURPS[] {
		switch (type) {
			case ItemType.MeleeWeapon:
				return this.meleeWeapons
					.filter(e => e.equipped)
					.sort((a, b) => (a.usage > b.usage ? 1 : b.usage > a.usage ? -1 : 0))
			case ItemType.RangedWeapon:
				return this.rangedWeapons
					.filter(e => e.equipped)
					.sort((a, b) => (a.usage > b.usage ? 1 : b.usage > a.usage ? -1 : 0))
		}
	}

	get reactions(): CondMod[] {
		let reactionMap: Map<string, CondMod> = new Map()
		for (const t of this.traits) {
			let source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_trait, {
				name: t.name ?? "",
			})
			this.reactionsFromFeatureList(source, t.features, reactionMap)
			for (const mod of t.deepModifiers) {
				this.reactionsFromFeatureList(source, mod.features, reactionMap)
			}
			if (t.cr !== -1 && t.crAdj === "reaction_penalty") {
				let amount = SelfControl.adjustment(t.cr, t.crAdj)
				let situation = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.cr, {
					trait: t.name ?? "",
				})
				if (reactionMap.has(situation)) reactionMap.get(situation)!.add(source, amount)
				else reactionMap.set(situation, new CondMod(source, situation, amount))
			}
		}
		for (const e of this.carried_equipment) {
			if (e.equipped && e.quantity > 0) {
				let source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_equipment, {
					name: e.name ?? "",
				})
				this.reactionsFromFeatureList(source, e.features, reactionMap)
				for (const mod of e.deepModifiers) {
					this.reactionsFromFeatureList(source, mod.features, reactionMap)
				}
			}
		}
		for (const sk of this.skills) {
			let source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_skill, {
				name: sk.name ?? "",
			})
			if (sk instanceof TechniqueGURPS)
				source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_technique, {
					name: sk.name ?? "",
				})
			this.reactionsFromFeatureList(source, sk.features, reactionMap)
		}
		let reactionList = Array.from(reactionMap.values())
		return reactionList
	}

	reactionsFromFeatureList(source: string, features: Feature[], m: Map<string, CondMod>): void {
		features.forEach(f => {
			if (
				[
					ItemType.Trait,
					ItemType.TraitModifier,
					ItemType.Equipment,
					ItemType.EquipmentContainer,
					ItemType.EquipmentModifier,
				].includes(f.item?.type as any)
			)
				if ((f.item as any).enabled === false) return
			if (f instanceof ReactionBonus) {
				let amount = f.adjustedAmount
				if (m.has(f.situation)) m.get(f.situation)!.add(source, amount)
				else m.set(f.situation, new CondMod(source, f.situation, amount))
			}
		})
	}

	get conditionalModifiers(): CondMod[] {
		let reactionMap: Map<string, CondMod> = new Map()
		this.traits.forEach(t => {
			let source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_trait, {
				name: t.name ?? "",
			})
			this.conditionalModifiersFromFeatureList(source, t.features, reactionMap)
			for (const mod of t.deepModifiers) {
				this.conditionalModifiersFromFeatureList(source, mod.features, reactionMap)
			}
		})
		for (const e of this.carried_equipment) {
			if (e.equipped && e.quantity > 0) {
				let source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_equipment, {
					name: e.name ?? "",
				})
				this.conditionalModifiersFromFeatureList(source, e.features, reactionMap)
				for (const mod of e.deepModifiers) {
					this.conditionalModifiersFromFeatureList(source, mod.features, reactionMap)
				}
			}
		}
		for (const sk of this.skills) {
			let source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_skill, {
				name: sk.name ?? "",
			})
			if (sk instanceof TechniqueGURPS)
				source = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.reaction.from_technique, {
					name: sk.name ?? "",
				})
			this.conditionalModifiersFromFeatureList(source, sk.features, reactionMap)
		}
		let reactionList = Array.from(reactionMap.values())
		return reactionList
	}

	conditionalModifiersFromFeatureList(source: string, features: Feature[], m: Map<string, CondMod>): void {
		features.forEach(f => {
			if (
				[
					ItemType.Trait,
					ItemType.TraitModifier,
					ItemType.Equipment,
					ItemType.EquipmentContainer,
					ItemType.EquipmentModifier,
				].includes(f.item?.type as any)
			)
				if ((f.item as any).enabled === false) return
			if (f instanceof ConditionalModifier) {
				let amount = f.adjustedAmount
				if (m.has(f.situation)) m.get(f.situation)!.add(source, amount)
				else m.set(f.situation, new CondMod(source, f.situation, amount))
			}
		})
	}

	get maxHP(): number {
		return this.resolveAttributeMax(gid.HitPoints)
	}

	newAttributes(defs = this.system.settings.attributes, prev: AttributeObj[] = []): AttributeObj[] {
		const a: AttributeObj[] = []
		// Const a: Record<string, AttributeObj> = {}
		let i = 0
		for (const attribute_def of defs) {
			const attr = new Attribute(this, attribute_def.id, i)
			if (attribute_def.type.includes("separator")) {
				a.push({
					attr_id: attr.attr_id,
					// Order: attr.order,
					adj: attr.adj,
				})
			} else {
				a.push({
					// Bonus: attr.bonus,
					// cost_reduction: attr.costReduction,
					// order: attr.order,
					attr_id: attr.attr_id,
					adj: attr.adj,
				})
			}
			if (attr.damage) a[i].damage = attr.damage
			i++
		}
		if (prev) {
			a.forEach(attr => {
				const prev_attr = prev.find(e => e.attr_id === attr.attr_id)
				Object.assign(attr, prev_attr)
			})
		} else {
			this._prevAttributes = new Map()
		}
		return a
	}

	newTrackers(defs = this.system.settings.resource_trackers, prev: ResourceTrackerObj[] = []): ResourceTrackerObj[] {
		const t: ResourceTrackerObj[] = []
		let i = 0
		for (const tracker_def of defs) {
			const tracker = new ResourceTracker(this, tracker_def.id, i)
			t.push({
				order: tracker.order,
				tracker_id: tracker.tracker_id,
				damage: tracker.damage,
			})
			i++
		}
		if (prev) {
			t.forEach(tracker => {
				const prev_tracker = prev.find(e => e.tracker_id === tracker.tracker_id)
				Object.assign(tracker, prev_tracker)
			})
		}
		return t
	}

	getAttributes(att_array = this.system.attributes): Map<string, Attribute> {
		const attributes: Map<string, Attribute> = new Map()
		if (!att_array.length) return attributes
		att_array.forEach((v, k) => {
			attributes.set(v.attr_id, new Attribute(this, v.attr_id, k, v))
		})
		return attributes
	}

	getResourceTrackers(): Map<string, ResourceTracker> {
		const trackers: Map<string, ResourceTracker> = new Map()
		const tracker_array = this.system.resource_trackers
		if (!tracker_array?.length) return trackers
		tracker_array.forEach((v, k) => {
			trackers.set(v.tracker_id, new ResourceTracker(this, v.tracker_id, k, v))
		})
		return trackers
	}

	// Do not store modifiers directly on actors
	createEmbeddedDocuments(
		embeddedName: string,
		data: Array<Record<string, unknown>>,
		context: DocumentModificationContext & { temporary: boolean; substitutions?: boolean } = {
			temporary: false,
			renderSheet: false,
			render: true,
			substitutions: true,
		}
	): Promise<Array<any>> {
		if (embeddedName === "Item")
			data = data.filter(e => CONFIG.GURPS.Actor.allowedContents[this.type].includes(e.type as string))
		return super.createEmbeddedDocuments(embeddedName, data, context)
	}

	protected override _onCreateDescendantDocuments(
		embeddedName: string,
		documents: Document<any, any, Metadata<any>>[],
		result: Record<string, unknown>[],
		options: DocumentModificationOptionsGURPS,
		userId: string
	): void {
		super._onCreateDescendantDocuments(embeddedName, documents, result, options, userId)

		// Replace @X@ notation fields with given text
		if (embeddedName === "Item" && options.substitutions) {
			for (const item of documents.filter(e => e instanceof ItemGCS)) {
				// If ((item as any).modifiers) ModifierChoiceSheet.new([item as ItemGCS])
				const sheet = ModifierChoiceSheet.new([item as ItemGCS])
				if (game.userId === userId) sheet?.render(true)
				// ItemSubstitutionSheet.new([item as ItemGCS])
			}
		}
		if (this.system.profile.tech_level !== "" && embeddedName === "Item") {
			for (const item of documents.filter(
				e => e instanceof SkillGURPS || e instanceof SpellGURPS || e instanceof RitualMagicSpellGURPS
			)) {
				if ((item as SkillGURPS).system.tech_level_required && !(item as SkillGURPS).system.tech_level)
					(item as SkillGURPS).system.tech_level = this.system.profile.tech_level
			}
		}
	}

	// Prepare data
	override prepareData(): void {
		// If (this.noPrepare) {
		// 	this.noPrepare = false
		// 	return
		// }
		super.prepareData()
		const pools: any = {}
		this.attributes.forEach(e => {
			if (e.attribute_def.type === AttributeType.Pool) {
				pools[e.id] = { value: e.current, min: -Infinity, max: e.max }
			}
		})
		this.system.pools = pools
	}

	override prepareBaseData(): void {
		super.prepareBaseData()
		this.system.settings.attributes.forEach(e => (e.cost_adj_percent_per_sm ??= 0))
		if (this.system.attributes.length === 0) {
			this.system.attributes = this.newAttributes()
			this.attributes = this.getAttributes()
		}
		if (this.system.settings.resource_trackers.length === 0) {
			this.system.resource_trackers = this.newTrackers()
			this.resource_trackers = this.getResourceTrackers()
		}
	}

	override prepareEmbeddedDocuments(): void {
		super.prepareEmbeddedDocuments()
		if (this.noPrepare) {
			this.noPrepare = false
			return
		}
		this.updateSkills()
		this.updateSpells()
		for (let i = 0; i < 5; i++) {
			this.processFeatures()
			this.processPrereqs()
			let skillsChanged = this.updateSkills()
			let spellsChanged = this.updateSpells()
			if (!skillsChanged && !spellsChanged) break
			break
		}
	}

	processFeatures() {
		this.features = {
			attributeBonuses: [],
			costReductions: [],
			drBonuses: [],
			skillBonuses: [],
			skillPointBonuses: [],
			spellBonuses: [],
			spellPointBonuses: [],
			weaponBonuses: [],
			// thresholdBonuses: [],
		}
		for (const t of this.traits) {
			let levels = 0
			if (!t.enabled) continue
			if (t.isLeveled) levels = Math.max(t.levels, 0)
			if (t instanceof TraitGURPS) {
				if (t.features)
					for (const f of t.features) {
						this.processFeature(t, f, levels)
					}
			}
			if (CR_Features.has(t.crAdj))
				for (const f of CR_Features?.get(t.crAdj) || []) {
					this.processFeature(t, f, levels)
				}
			for (const m of t.deepModifiers) {
				if (m.enabled === false) continue
				for (const f of m.features) {
					this.processFeature(t, f, m.levels)
				}
			}
		}
		for (const s of this.skills) {
			if (!(s instanceof SkillContainerGURPS))
				for (const f of s.features) {
					this.processFeature(s, f, 0)
				}
		}
		for (const e of this.equipment) {
			if (!e.enabled) continue
			for (const f of e.features) {
				this.processFeature(e, f, 0)
			}
			for (const m of e.deepModifiers) {
				if (!m.enabled) continue
				for (const f of m.features) {
					this.processFeature(e, f, 0)
				}
			}
		}
		for (const e of this.gEffects) {
			// If (!(e instanceof ConditionGURPS)) continue
			for (const f of e.features) {
				this.processFeature(e, f, 0)
			}
		}

		this.calc ??= {}
		this.calc.lifting_st_bonus = this.attributeBonusFor(gid.Strength, AttributeBonusLimitation.Lifting)
		this.calc.striking_st_bonus = this.attributeBonusFor(gid.Strength, AttributeBonusLimitation.Striking)
		this.calc.throwing_st_bonus = this.attributeBonusFor(gid.Strength, AttributeBonusLimitation.Throwing)

		this.attributes = this.getAttributes()
		this.processThresholds()

		this.resource_trackers = this.getResourceTrackers()
		// This.updateProfile()
		this.calc.dodge_bonus = this.attributeBonusFor(gid.Dodge, AttributeBonusLimitation.None)
		this.calc.parry_bonus = this.attributeBonusFor(gid.Parry, AttributeBonusLimitation.None)
		this.calc.block_bonus = this.attributeBonusFor(gid.Block, AttributeBonusLimitation.None)
	}

	processThresholds() {
		if (this._processingThresholds || !this._prevAttributes || this.attributes === this._prevAttributes) return

		this._processingThresholds = true

		const effects = game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_ATTRIBUTES}.effects`) as any

		this.poolAttributes(false).forEach(e => {
			if (!this._prevAttributes.has(e.id)) return

			const prevState = this._prevAttributes.get(e.id)?.currentThreshold?.state
			const currentState = e.currentThreshold?.state

			if (prevState === currentState) return

			const enterActions = effects
				.filter((f: { attribute: string; state: string }) => f.attribute === e.id && f.state === currentState)
				.reduce((acc: any[], e: any) => {
					return [...acc, ...e.enter]
				}, [])
			const leaveActions = effects
				.filter((f: { attribute: string; state: string }) => f.attribute === e.id && f.state === prevState)
				.reduce((acc: any[], e: any) => {
					return [...acc, ...e.leave]
				}, [])

			let actions = [...enterActions, ...leaveActions]
			actions = actions.filter(a => {
				if (
					a.action === EFFECT_ACTION.REMOVE &&
					actions.some(x => x.id === a.id && x.action === EFFECT_ACTION.ADD)
				)
					return false
				return true
			})

			actions = actions.filter((item, index) => actions.indexOf(item) === index)

			const addActions = actions.filter(item => item.action === EFFECT_ACTION.ADD && !this.hasCondition(item.id))
			const removeActions = actions.filter(
				item => item.action === EFFECT_ACTION.REMOVE && this.hasCondition(item.id)
			)

			if (addActions.length) this.addConditions(addActions.map(e => e.id))
			// this.createEmbeddedDocuments(
			// 	"Item",
			// 	addActions.map(e => duplicate(ConditionGURPS.getData(e.id)))
			// )
			if (removeActions.length) this.removeConditions(removeActions.map(e => e.id))
			// this.deleteEmbeddedDocuments(
			// 	"Item",
			// 	removeActions.map(e => this.conditions?.find(c => c.cid === e.id)!._id)
			// )
		})

		this._prevAttributes = this.attributes
		this._prevAttributes = new Map()
		this.attributes.forEach((e, k) => {
			if (e.attribute_def.type === AttributeType.Pool) {
				e._overridenThreshold = new PoolThreshold({ ...e.currentThreshold } as any)
			}
			this._prevAttributes.set(k, e)
		})
		this._processingThresholds = false
	}

	processFeature(_parent: ItemGURPS, f: Feature, levels: number) {
		f.levels = levels

		switch (f.type) {
			case FeatureType.AttributeBonus:
				return this.features.attributeBonuses.push(f as any)
			case FeatureType.CostReduction:
				return this.features.costReductions.push(f as any)
			case FeatureType.DRBonus:
				return this.features.drBonuses.push(f as any)
			case FeatureType.SkillBonus:
				return this.features.skillBonuses.push(f as any)
			case FeatureType.SkillPointBonus:
				return this.features.skillPointBonuses.push(f as any)
			case FeatureType.SpellBonus:
				return this.features.spellBonuses.push(f as any)
			case FeatureType.SpellPointBonus:
				return this.features.spellPointBonuses.push(f as any)
			case FeatureType.WeaponBonus:
			case FeatureType.WeaponDRDivisorBonus:
				return this.features.weaponBonuses.push(f as any)
			// case FeatureType.ThresholdBonus:
			// 	return this.features.thresholdBonuses.push(f as any)
			case FeatureType.ConditionalModifier:
			case FeatureType.ReactionBonus:
			case FeatureType.ContaiedWeightReduction:
		}
	}

	processPrereqs(): void {
		const not_met = LocalizeGURPS.translations.gurps.prereqs.not_met
		for (const t of this.traits.filter(e => e instanceof TraitGURPS)) {
			t.unsatisfied_reason = ""
			if (t instanceof TraitGURPS && !t.prereqsEmpty) {
				const tooltip = new TooltipGURPS()
				if (!t.prereqs.satisfied(this, t, tooltip)[0]) {
					t.unsatisfied_reason = not_met + tooltip.toString()
				}
			}
		}
		for (let k of this.skills.filter(e => !(e instanceof SkillContainerGURPS))) {
			k = k as SkillGURPS | TechniqueGURPS
			k.unsatisfied_reason = ""
			const tooltip = new TooltipGURPS()
			let satisfied = true
			let eqpPenalty = false
			if (!k.prereqsEmpty) [satisfied, eqpPenalty] = k.prereqs.satisfied(this, k, tooltip)
			if (satisfied && k instanceof TechniqueGURPS) satisfied = k.satisfied(tooltip)
			if (eqpPenalty) {
				const penalty = new SkillBonus({
					type: FeatureType.SkillBonus,
					selection_type: "skills_with_name",
					name: {
						compare: StringComparison.Is,
						qualifier: k.name!,
					},
					specialization: {
						compare: StringComparison.Is,
						qualifier: k.specialization,
					},
					amount: k.techLevel && k.techLevel !== "" ? -10 : -5,
					levels: 0,
				})
				// Penalty.setParent(k)
				this.features.skillBonuses.push(penalty)
			}
			if (!satisfied) {
				k.unsatisfied_reason = not_met + tooltip.toString()
			}
		}
		for (let b of this.spells.filter(e => !(e instanceof SpellContainerGURPS))) {
			b = b as SpellGURPS | RitualMagicSpellGURPS
			b.unsatisfied_reason = ""
			const tooltip = new TooltipGURPS()
			let satisfied = true
			let eqpPenalty = false
			if (!b.prereqsEmpty) [satisfied, eqpPenalty] = b.prereqs.satisfied(this, b, tooltip)
			if (satisfied && b instanceof RitualMagicSpellGURPS) satisfied = b.satisfied(tooltip)
			if (eqpPenalty) {
				const penalty = new SkillBonus(SkillBonus.defaults)
				penalty.name!.qualifier = b.name!
				if (b.techLevel && b.techLevel !== "") {
					penalty.amount = -10
				} else {
					penalty.amount = -5
				}
				// Penalty.setParent(b)
				this.features.skillBonuses.push(penalty)
			}
			if (!satisfied) b.unsatisfied_reason = not_met + tooltip.toString()
		}
		for (const e of this.equipment) {
			e.unsatisfied_reason = ""
			if (!e.prereqsEmpty) {
				const tooltip = new TooltipGURPS()
				if (!e.prereqs.satisfied(this, e, tooltip)[0]) {
					e.unsatisfied_reason = not_met + tooltip.toString()
				}
			}
		}
	}

	updateSkills(): boolean {
		let changed = false
		for (const k of this.skills.filter(e => e.type !== ItemType.SkillContainer) as Array<
			SkillGURPS | TechniqueGURPS
		>) {
			if (k.updateLevel()) {
				changed = true
			}
		}
		return changed
	}

	updateSpells(): boolean {
		let changed = false
		for (const b of this.spells.filter(e => !(e instanceof SpellContainerGURPS)) as Array<
			SpellGURPS | RitualMagicSpellGURPS
		>) {
			if (b.updateLevel()) {
				changed = true
			}
		}
		return changed
	}

	// Directed Skill Getters
	baseSkill(def: SkillDefault, require_points: boolean): SkillGURPS | TechniqueGURPS | null {
		if (!def.skillBased) return null
		return this.bestSkillNamed(def.name ?? "", def.specialization ?? "", require_points, null)
	}

	bestWeaponNamed(
		name: string,
		usage: string,
		type: WeaponType,
		excludes: Map<string, boolean> | null
	): WeaponGURPS | null {
		let best: WeaponGURPS | null = null
		let level = -Infinity
		for (const w of this.weaponNamed(name, usage, type, excludes)) {
			const skill_level = w.level
			if (!best || level < skill_level) {
				best = w
				level = skill_level
			}
		}
		return best
	}

	weaponNamed(
		name: string,
		usage: string,
		type: WeaponType,
		excludes: Map<string, boolean> | null
	): Collection<WeaponGURPS> {
		const weapons: Collection<WeaponGURPS> = new Collection()
		for (const wep of this.equippedWeapons(type)) {
			if (
				(excludes === null || !excludes.get(wep.name!)) &&
				wep.container?.name === name &&
				(usage === "" || usage === wep.usage)
			)
				weapons.set(`${wep.container?.id}-${wep.id}`, wep)
		}
		return weapons
	}

	bestSkillNamed(
		name: string,
		specialization: string,
		require_points: boolean,
		excludes: Map<string, boolean> | null
	): SkillGURPS | TechniqueGURPS | null {
		let best: SkillGURPS | TechniqueGURPS | null = null
		let level = -Infinity
		for (const sk of this.skillNamed(name, specialization, require_points, excludes)) {
			const skill_level = sk.calculateLevel().level
			if (!best || level < skill_level) {
				best = sk
				level = skill_level
			}
		}
		return best
	}

	skillNamed(
		name: string,
		specialization: string,
		require_points: boolean,
		excludes: Map<string, boolean> | null
	): Collection<SkillGURPS | TechniqueGURPS> {
		const skills: Collection<SkillGURPS | TechniqueGURPS> = new Collection()
		const defaultSkills = CONFIG.GURPS.skillDefaults
		for (const item of defaultSkills) {
			if (
				(excludes === null || !excludes.get(item.name!)) &&
				(item instanceof SkillGURPS || item instanceof TechniqueGURPS) &&
				item.name === name &&
				(specialization === "" || specialization === item.specialization)
			) {
				item.dummyActor = this
				item.points = 0
				skills.set(item._id, item)
			}
		}
		for (const item of this.skills) {
			if (
				(excludes === null || !excludes.get(item.name!)) &&
				(item instanceof SkillGURPS || item instanceof TechniqueGURPS) &&
				item.name === name &&
				(!require_points || item instanceof TechniqueGURPS || item.adjustedPoints() > 0) &&
				(specialization === "" || specialization === item.specialization)
			)
				skills.set(item._id, item)
		}
		return skills
	}

	// Feature Processing
	attributeBonusFor(
		attributeId: string,
		limitation: AttributeBonusLimitation,
		effective = false,
		tooltip: TooltipGURPS | null = null
	): number {
		let total = 0
		for (const feature of this.features.attributeBonuses) {
			if (
				feature.limitation === limitation &&
				feature.attribute === attributeId &&
				feature.effective === effective
			) {
				total += feature.adjustedAmount
				feature.addToTooltip(tooltip)
			}
		}
		return total
	}

	skillBonusFor(name: string, specialization: string, tags: string[], tooltip: TooltipGURPS | null = null): number {
		let total = 0
		if (this.features)
			for (const f of this.features.skillBonuses) {
				if (
					stringCompare(name, f.name) &&
					stringCompare(specialization, f.specialization) &&
					stringCompare(tags, f.tags)
				) {
					total += f.adjustedAmount
					f.addToTooltip(tooltip)
				}
			}
		return total
	}

	skillPointBonusFor(
		name: string,
		specialization: string,
		tags: string[],
		tooltip: TooltipGURPS | null = null
	): number {
		let total = 0
		if (this.features)
			for (const f of this.features.skillPointBonuses) {
				if (
					stringCompare(name, f.name) &&
					stringCompare(specialization, f.specialization) &&
					stringCompare(tags, f.tags)
				) {
					total += f.adjustedAmount
					f.addToTooltip(tooltip)
				}
			}
		return total
	}

	spellBonusFor(
		name: string,
		powerSource: string,
		colleges: string[],
		tags: string[],
		tooltip: TooltipGURPS | null = null
	): number {
		let total = 0
		if (this.features)
			for (const f of this.features.spellBonuses) {
				if (stringCompare(tags, f.tags)) {
					if (f.matchForType(name, powerSource, colleges)) {
						total += f.adjustedAmount
						f.addToTooltip(tooltip)
					}
				}
			}
		return total
	}

	spellPointBonusesFor(
		name: string,
		powerSource: string,
		colleges: string[],
		tags: string[],
		tooltip: TooltipGURPS | null = null
	): number {
		let total = 0
		if (this.features)
			for (const f of this.features.spellPointBonuses) {
				if (stringCompare(tags, f.tags)) {
					if (f.matchForType(name, powerSource, colleges)) {
						total += f.adjustedAmount
						f.addToTooltip(tooltip)
					}
				}
			}
		return total
	}

	addWeaponWithSkillBonusesFor(
		name: string,
		specialization: string,
		tags: string[],
		dieCount: number,
		levels: number,
		m: Map<WeaponDamageBonus | WeaponDRDivisorBonus, boolean> = new Map(),
		tooltip: TooltipGURPS | null = null
	): Map<WeaponDamageBonus | WeaponDRDivisorBonus, boolean> {
		let rsl = -Infinity
		for (const sk of this.skillNamed(name, specialization, true, null)) {
			if (rsl < sk.level.relative_level) rsl = sk.level.relative_level
		}
		if (rsl !== -Infinity)
			for (const f of this.features.weaponBonuses) {
				if (
					f.selection_type === "weapons_with_required_skill" &&
					stringCompare(name, f.name) &&
					stringCompare(specialization, f.specialization) &&
					numberCompare(rsl, f.level) &&
					stringCompare(tags, f.tags)
				) {
					const level = f.levels
					if (f.type === FeatureType.WeaponBonus) {
						f.levels = dieCount
					} else {
						f.levels = levels
					}
					f.addToTooltip(tooltip)
					f.levels = level
					m.set(f, true)
				}
			}
		return m
	}

	addNamedWeaponBonusesFor(
		name: string,
		usage: string,
		tags: string[],
		dieCount: number,
		levels: number,
		tooltip: TooltipGURPS | null = null,
		m: Map<WeaponDamageBonus | WeaponDRDivisorBonus, boolean> = new Map()
	): Map<WeaponDamageBonus | WeaponDRDivisorBonus, boolean> {
		for (const f of this.features.weaponBonuses) {
			if (
				f.selection_type === "weapons_with_name" &&
				stringCompare(name, f.name) &&
				stringCompare(usage, f.specialization) &&
				stringCompare(tags, f.tags)
			) {
				const level = f.levels
				if (f.type === FeatureType.WeaponBonus) {
					f.levels = dieCount
				} else {
					f.levels = levels
				}
				f.addToTooltip(tooltip)
				f.levels = level
				m.set(f, true)
			}
		}
		return m
	}

	namedWeaponSkillBonusesFor(name: string, usage: string, tags: string[], tooltip: TooltipGURPS): SkillBonus[] {
		const bonuses: SkillBonus[] = []
		for (const f of this.features.skillBonuses) {
			if (
				f.selection_type === "weapons_with_name" &&
				stringCompare(name, f.name) &&
				stringCompare(usage, f.specialization) &&
				stringCompare(tags, f.tags)
			) {
				bonuses.push(f)
				f.addToTooltip(tooltip)
			}
		}
		return bonuses
	}

	costReductionFor(attributeID: string): number {
		let total = 0
		if (this.features)
			for (const f of this.features.costReductions) {
				if (f.attribute === attributeID) {
					total += f.percentage
				}
			}
		if (total > 80) total = 80
		return Math.max(total, 0)
	}

	addDRBonusesFor(
		locationID: string,
		tooltip: TooltipGURPS | null = null,
		drMap: Map<string, number> = new Map()
	): Map<string, number> {
		for (const f of this.features.drBonuses) {
			if (f.type === "dr_bonus" && equalFold(locationID, f.location)) {
				const current = drMap.has(f.specialization!.toLowerCase())
					? drMap.get(f.specialization!.toLowerCase()) || 0
					: 0
				drMap.set(f.specialization!.toLowerCase(), current + f.adjustedAmount)
				f.addToTooltip(tooltip)
			}
		}
		return drMap
	}

	// Resolve attributes
	resolveAttributeCurrent(attr_id: string): number {
		const att = this.attributes?.get(attr_id)?.current
		if (att) return att
		return -Infinity
	}

	resolveAttributeEffective(attr_id: string): number {
		const att = this.attributes?.get(attr_id)?.effective
		if (att) return att
		return -Infinity
	}

	resolveAttributeMax(attr_id: string): number {
		const att = this.attributes?.get(attr_id)?.max
		if (att) return att
		return -Infinity
	}

	resolveAttributeName(attr_id: string): string {
		const def = this.resolveAttributeDef(attr_id)
		if (def) return def.name
		return "unknown"
	}

	resolveAttributeDef(attr_id: string): AttributeDef | null {
		const a = this.attributes?.get(attr_id)
		if (a) return a.attribute_def
		return null
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
		let attr: Attribute | ResourceTracker | undefined = this.attributes.get(parts[0])
		if (!attr) attr = this.resource_trackers.get(parts[0])
		if (!attr) {
			console.warn(`No such variable: $${variableName}`)
			return ""
		}
		let def
		if (attr instanceof Attribute) {
			// Def = this.settings.attributes.find(e => e.id === (attr as Attribute).attr_id)
			def = attr.attribute_def
		} else if (attr instanceof ResourceTracker) {
			def = attr.tracker_def
			// Def = this.settings.resource_trackers.find(e => e.id === (attr as ResourceTracker).tracker_id)
		}
		if (!def) {
			console.warn(`No such variable definition: $${variableName}`)
			return ""
		}
		if ((def instanceof ResourceTrackerDef || def.type === AttributeType.Pool) && parts.length > 1) {
			switch (parts[1]) {
				case "current":
					return attr.current.toString()
				case "maximum":
				case "max":
					return attr.max.toString()
				default:
					console.warn(`No such variable: $${variableName}`)
					return ""
			}
		}
		this.variableResolverExclusions = new Map()
		return attr?.max.toString()
	}

	async saveLocal(): Promise<void> {
		const json = await this.exportSystemData()
		return saveDataToFile(json.text, "gcs", json.name)
	}

	protected async exportSystemData() {
		const system: any = duplicate(this.system)
		system.type = "character"
		system.calc = {
			thrust: this.thrust.string,
			swing: this.swing.string,
			basic_lift: Weight.format(this.basicLift, this.settings.default_weight_units),
			dodge: [0, 1, 2, 3, 4].map(e => this.dodge(this.allEncumbrance[e])),
			move: [0, 1, 2, 3, 4].map(e => this.move(this.allEncumbrance[e])),
			parry_bonus: this.parryBonus,
			block_bous: this.blockBonus,
			dodge_bonus: this.dodgeBonus,
		}
		const items = (this.items as unknown as Collection<BaseItemGURPS>)
			.filter(e => !e.getFlag(SYSTEM_NAME, ItemFlags.Container))
			.map((e: BaseItemGURPS) => e.exportSystemData(true))
		const third_party: any = {}

		third_party.settings = { resource_trackers: system.settings.resource_trackers }
		third_party.resource_trackers = system.resource_trackers
		third_party.import = system.import
		third_party.move = system.move
		system.third_party = third_party
		system.traits = items.filter(e => [ItemType.Trait, ItemType.TraitContainer].includes(e.type)) ?? []
		system.skills =
			items.filter(e => [ItemType.Skill, ItemType.SkillContainer, ItemType.Technique].includes(e.type)) ?? []
		system.spells =
			items.filter(e => [ItemType.Spell, ItemType.SpellContainer, ItemType.RitualMagicSpell].includes(e.type)) ??
			[]
		system.equipment =
			items
				.filter(
					e => [ItemType.Equipment, "equipment", ItemType.EquipmentContainer].includes(e.type) && !e.other
				)
				.map(e => {
					delete e.other
					return e
				}) ?? []
		system.other_equipment =
			items
				.filter(e => [ItemType.Equipment, "equipment", ItemType.EquipmentContainer].includes(e.type) && e.other)
				.map(e => {
					delete e.other
					return e
				}) ?? []
		system.notes = items.filter(e => [ItemType.Note, ItemType.NoteContainer].includes(e.type)) ?? []
		system.settings.attributes = system.settings.attributes.map((e: Partial<AttributeDef>) => {
			const f = { ...e }
			f.id = e.def_id
			delete f.def_id
			delete f.order
			if (f.type !== AttributeType.Pool) delete f.thresholds
			return f
		})
		system.attributes = system.attributes.map((e: Partial<AttributeObj>) => {
			const f = { ...e }
			return f
		})
		if (this.img && !this.img.endsWith(".svg")) system.profile.portrait = await urlToBase64(this.img)

		delete system.resource_trackers
		delete system.settings.resource_trackers
		delete system.import
		delete system.move
		delete system.pools
		delete system.editing

		const json = JSON.stringify(system, null, "\t")
		const filename = `${this.name}.gcs`

		return { text: json, name: filename }
	}

	async promptImport() {
		let dialog = new Dialog({
			title: LocalizeGURPS.translations.gurps.character.import_prompt.title,
			content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/import-prompt.hbs`, { object: this }),
			buttons: {
				import: {
					icon: '<i class="fas fa-file-import"></i>',
					label: LocalizeGURPS.translations.gurps.character.import_prompt.import,
					callback: _html => {
						let file: any = null
						if (game.settings.get(SYSTEM_NAME, SETTINGS.SERVER_SIDE_FILE_DIALOG)) {
							const filepicker = new FilePicker({
								callback: (path: string) => {
									const request = new XMLHttpRequest()
									request.open("GET", path)
									new Promise(resolve => {
										request.onload = () => {
											if (request.status === 200) {
												const text = request.response
												file = {
													text: text,
													name: path,
													path: request.responseURL,
												}
												CharacterImporter.import(this, file)
											}
											resolve(this)
										}
									})
									request.send(null)
								},
							})
							filepicker.extensions = [".gcs", ".xml", ".gca5"]
							filepicker.render(true)
						} else {
							const inputEl = document.createElement("input")
							inputEl.type = "file"
							$(inputEl).on("change", event => {
								const rawFile = $(event.currentTarget).prop("files")[0]
								file = {
									text: "",
									name: rawFile.name,
									path: rawFile.path,
								}
								readTextFromFile(rawFile).then(text => {
									CharacterImporter.import(this, {
										text: text,
										name: rawFile.name,
										path: rawFile.path,
									})
								})
							})
							$(inputEl).trigger("click")
						}
					},
				},
			},
		})
		dialog.render(true)
	}

	isSkillLevelResolutionExcluded(name: string, specialization: string): boolean {
		if (this.skillResolverExclusions.has(this.skillLevelResolutionKey(name, specialization))) {
			if (specialization) name += ` (${specialization})`
			console.error(`Attempt to resolve skill level via itself: ${name}`)
			return true
		}
		return false
	}

	registerSkillLevelResolutionExclusion(name: string, specialization: string) {
		this.skillResolverExclusions ??= new Map()
		this.skillResolverExclusions.set(this.skillLevelResolutionKey(name, specialization), true)
	}

	unregisterSkillLevelResolutionExclusion(name: string, specialization: string) {
		this.skillResolverExclusions.delete(this.skillLevelResolutionKey(name, specialization))
	}

	skillLevelResolutionKey(name: string, specialization: string): string {
		return `${name}\u0000${specialization}`
	}

	getRollData(): object {
		return {
			id: this.id,
			actor: this,
			system: this.system,
		}
	}

	getTrait(name: string): TraitGURPS {
		return this.traits
			.filter(e => e instanceof TraitGURPS)
			?.filter(e => e.name === name && e.enabled)[0] as TraitGURPS
	}

	hasTrait(name: string): boolean {
		return this.traits.some(e => e instanceof TraitGURPS && e.name === name && e.enabled)
	}

	override async modifyTokenAttribute(attribute: string, value: number, isDelta = false, isBar = true) {
		if (!attribute.startsWith("pools")) return super.modifyTokenAttribute(attribute, value, isDelta, isBar)

		const current = getProperty(this.system, attribute)
		const id = attribute.replace("pools.", "")
		const index = this.system.attributes.findIndex(e => e.attr_id === id)
		if (index === -1) return this
		let updates
		if (isDelta) value = Math.clamped(current.min, Number(current.value) + value, current.max)
		const attributes = this.system.attributes
		attributes[index].damage = Math.max(this.attributes.get(id)!.max - value, 0)
		updates = { "system.attributes": attributes }

		const allowed = Hooks.call("modifyTokenAttribute", { attribute, value, isDelta, isBar }, updates)
		return allowed !== false ? this.update(updates) : this
	}
}

interface CharacterGURPS extends BaseActorGURPS {
	system: CharacterSystemData
	_source: CharacterSource
}

export { CharacterGURPS }
