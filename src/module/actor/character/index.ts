import { BaseActorGURPS } from "@actor/base";
import { ActorConstructorContextGURPS } from "@actor/base";
import { CharacterImporter } from "./import";
import { Feature } from "@feature";
import { ConditionalModifier } from "@feature/conditional_modifier";
import { CostReduction } from "@feature/cost_reduction";
import { ReactionBonus } from "@feature/reaction_bonus";
import { SkillBonus } from "@feature/skill_bonus";
import { SkillPointBonus } from "@feature/skill_point_bonus";
import { SpellBonus } from "@feature/spell_bonus";
import { WeaponBonus } from "@feature/weapon_damage_bonus";
import {
	EquipmentContainerGURPS,
	EquipmentGURPS,
	NoteContainerGURPS,
	NoteGURPS,
	RitualMagicSpellGURPS,
	SkillContainerGURPS,
	SkillGURPS,
	SpellContainerGURPS,
	SpellGURPS,
	TechniqueGURPS,
	TraitContainerGURPS,
	TraitGURPS,
} from "@item";
import { ItemType } from "@item/data";
import { CR_Features } from "@item/trait/data";
import { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import { ActorDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { Attribute, AttributeObj } from "@module/attribute";
import { AttributeDef } from "@module/attribute/attribute_def";
import { ThresholdOp } from "@module/attribute/pool_threshold";
import { CondMod } from "@module/conditional-modifier";
import { attrPrefix, gid } from "@module/data";
import { DiceGURPS } from "@module/dice";
import { SETTINGS_TEMP, SYSTEM_NAME } from "@module/settings";
import { SkillDefault } from "@module/default";
import { TooltipGURPS } from "@module/tooltip";
import { MeleeWeapon, RangedWeapon, Weapon, WeaponType } from "@module/weapon";
import {
	damageProgression,
	floatingMul,
	getCurrentTime,
	i18n,
	i18n_f,
	newUUID,
	numberCompare,
	SelfControl,
	stringCompare,
} from "@util";
import { CharacterSource, CharacterSystemData, Encumbrance } from "./data";

class CharacterGURPS extends BaseActorGURPS {
	attributes: Map<string, Attribute> = new Map();

	variableResolverExclusions: Map<string, boolean> = new Map();

	featureMap: Map<string, Feature[]>;

	constructor(data: CharacterSource, context: ActorConstructorContextGURPS = {}) {
		super(data, context);
		if (this.system.attributes) this.attributes = this.getAttributes();
		this.featureMap = new Map();
	}

	protected _onCreate(data: any, options: DocumentModificationOptions, userId: string): void {
		const sd: CharacterSystemData | any = {
			id: newUUID(),
			created_date: getCurrentTime(),
			total_points: SETTINGS_TEMP.general.initial_points,
			settings: SETTINGS_TEMP.sheet,
			editing: true,
			calc: {
				swing: "",
				thrust: "",
				basic_lift: "0 lb",
				lifting_st_bonus: 0,
				striking_st_bonus: 0,
				throwing_st_bonus: 0,
				move: [0, 0, 0, 0, 0],
				dodge: [0, 0, 0, 0, 0],
				dodge_bonus: 0,
				block_bonus: 0,
				parry_bonus: 0,
			},
		};
		sd.total_points = SETTINGS_TEMP.general.initial_points;
		sd.settings = SETTINGS_TEMP.sheet;
		sd.modified_date = sd.created_date;
		if (SETTINGS_TEMP.general.auto_fill) sd.profile = SETTINGS_TEMP.general.auto_fill;
		sd.attributes = this.newAttributes();
		this.update({ _id: this._id, system: sd });
		super._onCreate(data, options, userId);
	}

	override update(
		data?: DeepPartial<ActorDataConstructorData | (ActorDataConstructorData & Record<string, unknown>)>,
		context?: DocumentModificationContext & foundry.utils.MergeObjectOptions
	): Promise<this | undefined> {
		// Console.log("update data:", data);
		this.updateAttributes(data);
		this.checkImport(data);
		return super.update(data, context);
	}

	checkImport(data?: any) {
		for (const i in data) {
			if (i.includes("system.import")) return;
		}
		data["system.modified_date"] = new Date().toISOString();
	}

	updateAttributes(
		data?: DeepPartial<ActorDataConstructorData | (ActorDataConstructorData & Record<string, unknown>)>
	) {
		for (const i in data) {
			if (i.includes("system.import")) return;
		}
		if (Object.keys(this.system.attributes).length === 0) (data as any)["system.attributes"] = this.newAttributes();
		for (const i in data) {
			if (i.includes("system.attributes.")) {
				const att = this.attributes.get(i.split("attributes.")[1].split(".")[0]);
				const type = i.split("attributes.")[1].split(".")[1];
				if (att) {
					if (type === "adj") (data as any)[i] -= att.max - att.adj;
					else if (type === "damage") (data as any)[i] = Math.max(att.max - (data as any)[i], 0);
				}
			}
		}
	}

	// Getters
	get editing() {
		return this.system.editing;
	}

	get profile() {
		return this.system.profile;
	}

	get importData(): this["system"]["import"] {
		return this.system.import;
	}

	get calc() {
		return this.system.calc;
	}

	set calc(v: any) {
		this.system.calc = v;
	}

	get pools() {
		return this.system.pools;
	}

	set pools(v: any) {
		this.system.pools = v;
	}

	// Points
	get totalPoints(): number {
		return this.system.total_points;
	}

	set totalPoints(v: number) {
		this.system.total_points = v;
	}

	get spentPoints(): number {
		let total = this.attributePoints;
		const [ad, disad, race, quirk] = this.traitPoints;
		total += ad + disad + race + quirk;
		total += this.skillPoints;
		total += this.spellPoints;
		return total;
	}

	get unspentPoints(): number {
		return this.totalPoints - this.spentPoints;
	}

	set unspentPoints(v: number) {
		if (v !== this.unspentPoints) this.totalPoints = v + this.spentPoints;
	}

	get attributePoints(): number {
		let total = 0;
		for (const a of Object.values(this.attributes)) {
			if (!isNaN(a.points)) total += a.points;
		}
		return total;
	}

	get traitPoints(): [number, number, number, number] {
		let [ad, disad, race, quirk] = [0, 0, 0, 0];
		for (const t of this.traits) {
			if (t.parent !== t.actor) continue;
			let [a, d, r, q] = t.calculatePoints();
			ad += a;
			disad += d;
			race += r;
			quirk += q;
		}
		return [ad, disad, race, quirk];
	}

	get skillPoints(): number {
		let total = 0;
		for (const s of this.skills.filter(e => e instanceof SkillGURPS || e instanceof TechniqueGURPS) as Array<
			SkillGURPS | TechniqueGURPS
		>) {
			total += s.points ?? 0;
		}
		return total;
	}

	get spellPoints(): number {
		let total = 0;
		for (const s of this.spells.filter(e => e instanceof SpellGURPS || e instanceof RitualMagicSpellGURPS) as Array<
			SpellGURPS | RitualMagicSpellGURPS
		>) {
			total += s.points ?? 0;
		}
		return total;
	}

	get currentMove() {
		return this.move(this.encumbranceLevel(true));
	}

	get currentDodge() {
		return this.dodge(this.encumbranceLevel(true));
	}

	move(enc: Encumbrance): number {
		let initialMove = Math.max(0, this.resolveAttributeCurrent(gid.BasicMove));
		const divisor = 2 * Math.min(this.countThresholdOpMet("halve_move", this.attributes), 2);
		if (divisor > 0) initialMove = Math.ceil(initialMove / divisor);
		const move = Math.trunc((initialMove * (10 + 2 * enc.penalty)) / 10);
		if (move < 1) {
			if (initialMove > 0) return 1;
			return 0;
		}
		return move;
	}

	dodge(enc: Encumbrance): number {
		let dodge = 3 + (this.calc?.dodge_bonus ?? 0) + Math.max(this.resolveAttributeCurrent(gid.BasicSpeed), 0);
		const divisor = 2 * Math.min(this.countThresholdOpMet("halve_dodge", this.attributes), 2);
		if (divisor > 0) {
			dodge = Math.ceil(dodge / divisor);
		}
		return Math.floor(Math.max(dodge + enc.penalty, 1));
	}

	countThresholdOpMet(op: ThresholdOp, attributes: Map<string, Attribute>) {
		let total = 0;
		attributes.forEach(a => {
			const threshold = a.currentThreshold;
			if (threshold && threshold.ops.includes(op)) total++;
		});
		return total;
	}

	get settings() {
		let settings = this.system.settings;
		const defs: Record<string, AttributeDef> = {};
		for (const att in settings.attributes) {
			defs[att] = new AttributeDef(settings.attributes[att]);
		}
		(settings as any).attributes = defs;
		return settings;
	}

	get adjustedSizeModifier(): number {
		return (this.profile?.SM ?? 0) + this.size_modifier_bonus;
	}

	get created_date(): string {
		return this.system.created_date;
	}

	get modified_date(): string {
		return this.system.created_date;
	}

	get basicLift(): number {
		const basicLift = (this.resolveAttributeCurrent(gid.Strength) + (this.calc?.lifting_st_bonus ?? 0)) ** 2 / 5;
		if (basicLift >= 10) return Math.round(basicLift);
		return basicLift;
	}

	get oneHandedLift(): number {
		return this.basicLift * 2;
	}

	get twoHandedLift(): number {
		return this.basicLift * 8;
	}

	get shove(): number {
		return this.basicLift * 12;
	}

	get runningShove(): number {
		return this.basicLift * 24;
	}

	get carryOnBack(): number {
		return this.basicLift * 15;
	}

	get shiftSlightly(): number {
		return this.basicLift * 50;
	}

	get fastWealthCarried(): string {
		return `$${this.wealthCarried()}`;
	}

	get fastWeightCarried(): string {
		return `${this.weightCarried(false)} ${this.settings.default_weight_units}`;
	}

	encumbranceLevel(for_skills = true): Encumbrance {
		const carried = this.weightCarried(for_skills);
		for (const e of this.allEncumbrance) {
			if (carried <= e.maximum_carry) return e;
		}
		return this.allEncumbrance[this.allEncumbrance.length - 1];
	}

	weightCarried(for_skills: boolean): number {
		let total = 0;
		for (const e of this.carried_equipment) {
			if (e.parent === this) {
				// Console.log(e.name, e.extendedWeight(for_skills, this.settings.default_weight_units));
				total += e.extendedWeight(for_skills, this.settings.default_weight_units);
			}
		}
		// Console.log(total);
		return floatingMul(total);
	}

	wealthCarried(): number {
		let value = 0;
		for (const e of this.carried_equipment) {
			if (e.parent === this) value += e.extendedValue;
		}
		return floatingMul(value);
	}

	wealthNotCarried(): number {
		let value = 0;
		for (const e of this.other_equipment) {
			if (e.parent === this) value += e.extendedValue;
		}
		return value;
	}

	get strengthOrZero(): number {
		return Math.max(this.resolveAttributeCurrent(gid.Strength), 0);
	}

	get thrust(): DiceGURPS {
		return this.thrustFor(this.strengthOrZero + this.striking_st_bonus);
	}

	thrustFor(st: number): DiceGURPS {
		return damageProgression.thrustFor(this.settings.damage_progression, st);
	}

	get swing(): DiceGURPS {
		return this.swingFor(this.strengthOrZero + this.striking_st_bonus);
	}

	swingFor(st: number): DiceGURPS {
		return damageProgression.swingFor(this.settings.damage_progression, st);
	}

	get allEncumbrance(): Encumbrance[] {
		const bl = this.basicLift;
		const ae: Encumbrance[] = [
			{
				level: 0,
				maximum_carry: Number(bl),
				penalty: 0,
				name: i18n("gurps.character.encumbrance.0"),
			},
			{
				level: 1,
				maximum_carry: bl * 2,
				penalty: -1,
				name: i18n("gurps.character.encumbrance.1"),
			},
			{
				level: 2,
				maximum_carry: bl * 3,
				penalty: -2,
				name: i18n("gurps.character.encumbrance.2"),
			},
			{
				level: 3,
				maximum_carry: bl * 6,
				penalty: -3,
				name: i18n("gurps.character.encumbrance.3"),
			},
			{
				level: 4,
				maximum_carry: bl * 10,
				penalty: -4,
				name: i18n("gurps.character.encumbrance.4"),
			},
		];
		return ae;
	}

	// Bonuses
	get size_modifier_bonus(): number {
		return this.bonusFor(attrPrefix + gid.SizeModifier, undefined);
	}

	get striking_st_bonus(): number {
		return this.system.calc.striking_st_bonus;
	}

	set striking_st_bonus(v: number) {
		this.system.calc.striking_st_bonus = v;
	}

	get lifting_st_bonus(): number {
		return this.calc.lifting_st_bonus;
	}

	set lifting_st_bonus(v: number) {
		this.calc.lifting_st_bonus = v;
	}

	get throwing_st_bonus(): number {
		return this.system.calc.throwing_st_bonus;
	}

	set throwing_st_bonus(v: number) {
		this.system.calc.throwing_st_bonus = v;
	}

	get parryBonus(): number {
		return this.calc.parry_bonus ?? 0;
	}

	get blockBonus(): number {
		return this.calc.block_bonus ?? 0;
	}

	// Item Types
	get traits(): Collection<TraitGURPS | TraitContainerGURPS> {
		const traits: Collection<TraitGURPS | TraitContainerGURPS> = new Collection();
		for (const item of this.deepItems) {
			if (item instanceof TraitGURPS || item instanceof TraitContainerGURPS) traits.set(item._id!, item);
		}
		return traits;
	}

	get skills(): Collection<SkillGURPS | TechniqueGURPS | SkillContainerGURPS> {
		const skills: Collection<SkillGURPS | TechniqueGURPS | SkillContainerGURPS> = new Collection();
		for (const item of this.deepItems) {
			if (item instanceof SkillGURPS || item instanceof TechniqueGURPS || item instanceof SkillContainerGURPS)
				skills.set(item._id!, item);
		}
		return skills;
	}

	get spells(): Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS> {
		const spells: Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS> = new Collection();
		for (const item of this.deepItems) {
			if (
				item instanceof SpellGURPS ||
				item instanceof RitualMagicSpellGURPS ||
				item instanceof SpellContainerGURPS
			)
				spells.set(item._id!, item);
		}
		return spells;
	}

	get equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		const equipment: Collection<EquipmentGURPS | EquipmentContainerGURPS> = new Collection();
		for (const item of this.deepItems) {
			if (item instanceof EquipmentGURPS || item instanceof EquipmentContainerGURPS)
				equipment.set(item._id!, item);
		}
		return equipment;
	}

	get carried_equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		return new Collection(
			this.equipment
				.filter(item => !item.other)
				.map(item => {
					return [item._id!, item];
				})
		);
	}

	get other_equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		return new Collection(
			this.equipment
				.filter(item => item.other)
				.map(item => {
					return [item._id!, item];
				})
		);
	}

	get notes(): Collection<NoteGURPS | NoteContainerGURPS> {
		const notes: Collection<NoteGURPS | NoteContainerGURPS> = new Collection();
		for (const item of this.deepItems) {
			if (item instanceof NoteGURPS || item instanceof NoteContainerGURPS) notes.set(item._id!, item);
		}
		return notes;
	}

	// Weapons
	get meleeWeapons(): MeleeWeapon[] {
		return this.weapons("melee_weapon") as MeleeWeapon[];
	}

	get rangedWeapons(): RangedWeapon[] {
		return this.weapons("ranged_weapon") as RangedWeapon[];
	}

	weapons(type: WeaponType): Weapon[] {
		return this.equippedWeapons(type);
	}

	equippedWeapons(type: WeaponType): Weapon[] {
		let weaponList: Weapon[] = [];
		for (const t of this.traits) {
			t.weapons.forEach(w => {
				if (w.type === type) weaponList.push(w);
			});
			// For (const w of Object.values(t.weapons)) {
			// 	if (w.type === type) weaponList.push(w);
			// }
		}
		for (const sk of this.skills) {
			sk.weapons.forEach(w => {
				if (w.type === type) weaponList.push(w);
			});
			// For (const w of Object.values(sk.weapons)) {
			// 	if (w.type === type) weaponList.push(w);
			// }
		}
		for (const sp of this.spells) {
			sp.weapons.forEach(w => {
				if (w.type === type) weaponList.push(w);
			});
			// For (const w of Object.values(sp.weapons)) {
			// 	if (w.type === type) weaponList.push(w);
			// }
		}
		for (const e of this.carried_equipment) {
			e.weapons.forEach(w => {
				if (w.type === type) weaponList.push(w);
			});
			// For (const w of Object.values(e.weapons)) {
			// 	if (w.type === type) weaponList.push(w);
			// }
		}
		weaponList.sort((a, b) => (a.usage > b.usage ? 1 : b.usage > a.usage ? -1 : 0));
		return weaponList;
	}

	// TODO: changed
	// get reactions(): Collection<any> {
	// 	return new Collection();
	// }
	get reactions(): CondMod[] {
		let reactionMap: Map<string, CondMod> = new Map();
		for (const t of this.traits) {
			let source = i18n("gurps.reaction.from_trait") + (t.name ?? "");
			this.reactionsFromFeatureList(source, t.features, reactionMap);
			for (const mod of t.deepModifiers) {
				this.reactionsFromFeatureList(source, mod.features, reactionMap);
			}
			if (t.cr !== -1 && t.crAdj === "reaction_penalty") {
				let amount = SelfControl.adjustment(t.cr, t.crAdj);
				let situation = i18n_f("gurps.reaction.cr", {
					trait: t.name ?? "",
				});
				if (reactionMap.has(situation)) reactionMap.get(situation)!.add(source, amount);
				else reactionMap.set(situation, new CondMod(source, situation, amount));
			}
		}
		for (const e of this.carried_equipment) {
			if (e.equipped && e.quantity > 0) {
				let source = i18n("gurps.reaction.from_equipment") + (e.name ?? "");
				this.reactionsFromFeatureList(source, e.features, reactionMap);
				for (const mod of e.deepModifiers) {
					this.reactionsFromFeatureList(source, mod.features, reactionMap);
				}
			}
		}
		for (const sk of this.skills) {
			let source = i18n("gurps.reaction.from_skill") + (sk.name ?? "");
			if (sk instanceof TechniqueGURPS) source = i18n("gurps.reaction.from_technique") + (sk.name ?? "");
			this.reactionsFromFeatureList(source, sk.features, reactionMap);
		}
		let reactionList = Array.from(reactionMap.values());
		return reactionList;
	}

	reactionsFromFeatureList(source: string, features: Feature[], m: Map<string, CondMod>): void {
		for (const f of features)
			if (f instanceof ReactionBonus) {
				let amount = f.adjustedAmount;
				if (m.has(f.situation)) m.get(f.situation)!.add(source, amount);
				else m.set(f.situation, new CondMod(source, f.situation, amount));
			}
	}

	get conditionalModifiers(): CondMod[] {
		let reactionMap: Map<string, CondMod> = new Map();
		for (const t of this.traits) {
			let source = i18n("gurps.reaction.from_trait") + (t.name ?? "");
			this.conditionalModifiersFromFeatureList(source, t.features, reactionMap);
			for (const mod of t.deepModifiers) {
				this.conditionalModifiersFromFeatureList(source, mod.features, reactionMap);
			}
		}
		for (const e of this.carried_equipment) {
			if (e.equipped && e.quantity > 0) {
				let source = i18n("gurps.reaction.from_equipment") + (e.name ?? "");
				this.conditionalModifiersFromFeatureList(source, e.features, reactionMap);
				for (const mod of e.deepModifiers) {
					this.conditionalModifiersFromFeatureList(source, mod.features, reactionMap);
				}
			}
		}
		for (const sk of this.skills) {
			let source = i18n("gurps.reaction.from_skill") + (sk.name ?? "");
			if (sk instanceof TechniqueGURPS) source = i18n("gurps.reaction.from_technique") + (sk.name ?? "");
			this.conditionalModifiersFromFeatureList(source, sk.features, reactionMap);
		}
		let reactionList = Array.from(reactionMap.values());
		return reactionList;
	}

	conditionalModifiersFromFeatureList(source: string, features: Feature[], m: Map<string, CondMod>): void {
		for (const f of features)
			if (f instanceof ConditionalModifier) {
				let amount = f.adjustedAmount;
				if (m.has(f.situation)) m.get(f.situation)!.add(source, amount);
				else m.set(f.situation, new CondMod(source, f.situation, amount));
			}
	}

	newAttributes(): Record<string, AttributeObj> {
		const a: Record<string, AttributeObj> = {};
		let i = 0;
		for (const attr_id in this.system.settings.attributes) {
			const attr = new Attribute(this, attr_id, i);
			if (attr.attribute_def.type.includes("separator")) {
				a[attr_id] = {
					attr_id: attr.attr_id,
					order: attr.order,
					adj: attr.adj,
				};
			} else {
				a[attr_id] = {
					bonus: attr.bonus,
					cost_reduction: attr.cost_reduction,
					order: attr.order,
					attr_id: attr.attr_id,
					adj: attr.adj,
				};
			}
			if (attr.damage) a[attr_id].damage = attr.damage;
			i++;
		}
		return a;
	}

	getAttributes(): Map<string, Attribute> {
		const a: Map<string, Attribute> = new Map();
		let i = 0;
		for (const attr_id in this.system.attributes) {
			let att = this.system.attributes[attr_id];
			a.set(attr_id, new Attribute(this, attr_id, i, att));
			i++;
		}
		return a;
	}

	// Do not store modifiers directly on actors
	createEmbeddedDocuments(
		embeddedName: string,
		data: Array<Record<string, unknown>>,
		context: DocumentModificationContext & { temporary: boolean }
	): Promise<Array<any>> {
		data = data.filter(e => !(e.type as ItemType).includes("modifier"));
		return super.createEmbeddedDocuments(embeddedName, data, context);
	}

	// Prepare data
	override prepareData(): void {
		super.prepareData();
	}

	override prepareBaseData(): void {
		super.prepareBaseData();
		if (this.system.attributes && Object.keys(this.system.attributes).length === 0) {
			this.system.attributes = this.newAttributes();
			this.attributes = this.getAttributes();
		}
	}

	override prepareEmbeddedDocuments(): void {
		super.prepareEmbeddedDocuments();
		this.updateSkills();
		this.updateSpells();
		for (let i = 0; i < 5; i++) {
			this.processFeatures();
			this.processPrereqs();
			let skillsChanged = this.updateSkills();
			let spellsChanged = this.updateSpells();
			if (!skillsChanged && !spellsChanged) break;
		}
		this.pools = {};
		for (const a of Object.values(this.attributes)) {
			if (a.attribute_def.type === "pool")
				this.pools[a.attribute_def.name] = {
					max: a.max,
					value: a.current,
				};
		}
	}

	updateProfile(): void {
		if (this.profile) this.profile.SM = this.bonusFor(`${attrPrefix}${gid.SizeModifier}`, undefined);
	}

	processFeatures() {
		// Const featureMap: Map<string, Feature[]> = new Map();
		this.featureMap = new Map();
		for (const t of this.traits) {
			if (t instanceof TraitGURPS) {
				if (t.features)
					for (const f of t.features) {
						processFeature(t, this.featureMap, f, Math.max(t.levels, 0));
					}
			}
			if (CR_Features.has(t.crAdj))
				for (const f of CR_Features?.get(t.crAdj)) {
					processFeature(t, this.featureMap, f, Math.max(t.levels, 0));
				}
			for (const m of t.deepModifiers) {
				for (const f of m.features) {
					processFeature(t, this.featureMap, f, m.levels);
				}
			}
		}
		for (const s of this.skills) {
			if (!(s instanceof SkillContainerGURPS))
				for (const f of s.features) {
					processFeature(s, this.featureMap, f, 0);
				}
		}
		for (const e of this.equipment) {
			for (const f of e.features) {
				processFeature(e, this.featureMap, f, 0);
			}
			for (const m of e.deepModifiers) {
				for (const f of m.features) {
					processFeature(e, this.featureMap, f, 0);
				}
			}
		}
		// This.featureMap = featureMap;
		if (!this.calc) this.calc = {};
		this.calc.lifting_st_bonus = this.bonusFor(`${attrPrefix}${gid.Strength}.lifting_only`, undefined);
		this.calc.striking_st_bonus = this.bonusFor(`${attrPrefix}${gid.Strength}.striking_only`, undefined);
		this.calc.throwing_st_bonus = this.bonusFor(`${attrPrefix}${gid.Strength}.throwing_only`, undefined);
		this.attributes = this.getAttributes();
		if (this.attributes)
			for (const attr of Object.values(this.attributes)) {
				if (!this.system.attributes[attr.attr_id]) return;
				const def = attr.attribute_def;
				if (def) {
					const attrID = attrPrefix + attr.attr_id;
					this.system.attributes[attr.attr_id].bonus = this.bonusFor(attrID, undefined);
					if (def.type !== "decimal") attr.bonus = Math.floor(attr.bonus);
					this.system.attributes[attr.attr_id].cost_reduction = this.costReductionFor(attrID);
				} else {
					this.system.attributes[attr.attr_id].bonus = 0;
					this.system.attributes[attr.attr_id].cost_reduction = 0;
				}
			}
		this.attributes = this.getAttributes();
		this.updateProfile();
		this.calc.dodge_bonus = this.bonusFor(`${attrPrefix}${gid.Dodge}`, undefined);
		this.calc.parry_bonus = this.bonusFor(`${attrPrefix}${gid.Parry}`, undefined);
		this.calc.block_bonus = this.bonusFor(`${attrPrefix}${gid.Block}`, undefined);
	}

	processPrereqs(): void {
		const prefix = "\n● ";
		const not_met = i18n("gurps.prerqs.not_met");
		for (const t of this.traits.filter(e => e instanceof TraitGURPS)) {
			t.unsatisfied_reason = "";
			if (t instanceof TraitGURPS && !t.prereqsEmpty) {
				const tooltip = new TooltipGURPS();
				if (!t.prereqs.satisfied(this, t, tooltip, prefix)) {
					t.unsatisfied_reason = not_met + tooltip.toString();
				}
			}
		}
		for (let k of this.skills.filter(e => !(e instanceof SkillContainerGURPS))) {
			k = k as SkillGURPS | TechniqueGURPS;
			k.unsatisfied_reason = "";
			const tooltip = new TooltipGURPS();
			let satisfied = true;
			if (!k.prereqsEmpty) satisfied = k.prereqs.satisfied(this, k, tooltip, prefix);
			if (satisfied && k instanceof TechniqueGURPS) satisfied = k.satisfied(tooltip, prefix);
			if (!satisfied) {
				k.unsatisfied_reason = not_met + tooltip.toString();
			}
		}
		for (let b of this.spells.filter(e => !(e instanceof SpellContainerGURPS))) {
			b = b as SpellGURPS | RitualMagicSpellGURPS;
			b.unsatisfied_reason = "";
			const tooltip = new TooltipGURPS();
			let satisfied = true;
			if (!b.prereqsEmpty) satisfied = b.prereqs.satisfied(this, b, tooltip, prefix);
			if (satisfied && b instanceof RitualMagicSpellGURPS) satisfied = b.satisfied(tooltip, prefix);
			if (!satisfied) b.unsatisfied_reason = not_met + tooltip.toString();
		}
		for (const e of this.equipment) {
			e.unsatisfied_reason = "";
			if (!e.prereqsEmpty) {
				const tooltip = new TooltipGURPS();
				if (!e.prereqs.satisfied(this, e, tooltip, prefix)) {
					e.unsatisfied_reason = not_met + tooltip.toString();
				}
			}
		}
	}

	updateSkills(): boolean {
		let changed = false;
		for (const k of this.skills.filter(e => !(e instanceof SkillContainerGURPS)) as Array<
			SkillGURPS | TechniqueGURPS
		>) {
			if (k.updateLevel()) changed = true;
		}
		return changed;
	}

	updateSpells(): boolean {
		let changed = false;
		for (const b of this.spells.filter(e => !(e instanceof SpellContainerGURPS)) as Array<
			SpellGURPS | RitualMagicSpellGURPS
		>) {
			if (b.updateLevel()) changed = true;
		}
		return changed;
	}

	// Directed Skill Getters
	baseSkill(def: SkillDefault, require_points: boolean): SkillGURPS | TechniqueGURPS | null {
		if (!def.skillBased) return null;
		return this.bestSkillNamed(def.name ?? "", def.specialization ?? "", require_points, null);
	}

	bestWeaponNamed(
		name: string,
		usage: string,
		type: WeaponType,
		excludes: Map<string, boolean> | null
	): Weapon | null {
		let best: Weapon | null = null;
		let level = Math.max();
		for (const w of this.weaponNamed(name, usage, type, excludes)) {
			const skill_level = w.level;
			if (!best || level < skill_level) {
				best = w;
				level = skill_level;
			}
		}
		return best;
	}

	weaponNamed(
		name: string,
		usage: string,
		type: WeaponType,
		excludes: Map<string, boolean> | null
	): Collection<Weapon> {
		const weapons: Collection<Weapon> = new Collection();
		for (const wep of this.equippedWeapons(type)) {
			if (
				(excludes === null || !excludes.get(wep.name!)) &&
				wep.parent.name === name &&
				(usage === "" || usage === wep.usage)
			)
				weapons.set(`${wep.parent._id}-${wep.id}`, wep);
		}
		return weapons;
	}

	bestSkillNamed(
		name: string,
		specialization: string,
		require_points: boolean,
		excludes: Map<string, boolean> | null
	): SkillGURPS | TechniqueGURPS | null {
		let best: SkillGURPS | TechniqueGURPS | null = null;
		let level = Math.max();
		for (const sk of this.skillNamed(name, specialization, require_points, excludes)) {
			const skill_level = sk.calculateLevel.level;
			if (!best || level < skill_level) {
				best = sk;
				level = skill_level;
			}
		}
		return best;
	}

	skillNamed(
		name: string,
		specialization: string,
		require_points: boolean,
		excludes: Map<string, boolean> | null
	): Collection<SkillGURPS | TechniqueGURPS> {
		const skills: Collection<SkillGURPS | TechniqueGURPS> = new Collection();
		for (const item of this.skills) {
			if (
				(excludes === null || !excludes.get(item.name!)) &&
				(item instanceof SkillGURPS || item instanceof TechniqueGURPS) &&
				item.name === name &&
				(!require_points || item instanceof TechniqueGURPS || item.adjustedPoints() > 0) &&
				(specialization === "" || specialization === item.specialization)
			)
				skills.set(item._id!, item);
		}
		return skills;
	}

	// Feature Processing
	bonusFor(featureID: string, tooltip: TooltipGURPS | undefined): number {
		let total = 0;
		for (const feature of this.featureMap?.get(featureID.toLowerCase()) ?? []) {
			if (!(feature instanceof WeaponBonus)) {
				total += feature.adjustedAmount;
				feature.addToTooltip(tooltip);
			}
		}
		return total;
	}

	skillComparedBonusFor(
		featureID: string,
		name: string,
		specialization: string,
		tags: string[],
		tooltip: TooltipGURPS | undefined
	): number {
		let total = 0;
		for (const f of this.featureMap.get(featureID) ?? []) {
			if (!(f instanceof SkillBonus)) continue;
			if (
				stringCompare(name, f.name) &&
				stringCompare(specialization, f.specialization) &&
				stringCompare(tags, f.tags)
			) {
				total += f.adjustedAmount;
				f.addToTooltip(tooltip);
			}
		}
		return total;
	}

	skillPointComparedBonusFor(
		featureID: string,
		name: string,
		specialization: string,
		tags: string[],
		tooltip: TooltipGURPS | undefined
	): number {
		let total = 0;
		for (const f of this.featureMap?.get(featureID) ?? []) {
			if (!(f instanceof SkillPointBonus)) continue;
			if (
				stringCompare(name, f.name) &&
				stringCompare(specialization, f.specialization) &&
				stringCompare(tags, f.tags)
			) {
				total += f.adjustedAmount;
				f.addToTooltip(tooltip);
			}
		}
		return total;
	}

	spellBonusesFor(featureID: string, qualifier: string, tags: string[], tooltip: TooltipGURPS | undefined): number {
		let level = this.bonusFor(featureID, tooltip);
		level += this.bonusFor(`${featureID}/${qualifier.toLowerCase()}`, tooltip);
		level += this.spellComparedBonusFor(`${featureID}*`, qualifier, tags, tooltip);
		return level;
	}

	spellPointBonusesFor(
		featureID: string,
		qualifier: string,
		tags: string[],
		tooltip: TooltipGURPS | undefined
	): number {
		let level = this.bonusFor(featureID, tooltip);
		level += this.bonusFor(`${featureID}/${qualifier.toLowerCase()}`, tooltip);
		level += this.spellComparedBonusFor(`${featureID}*`, qualifier, tags, tooltip);
		return level;
	}

	spellComparedBonusFor(featureID: string, name: string, tags: string[], tooltip: TooltipGURPS | undefined): number {
		let total = 0;
		for (const feature of this.featureMap.get(featureID.toLowerCase()) ?? []) {
			if (
				feature instanceof SpellBonus &&
				stringCompare(name, feature.name) &&
				stringCompare(tags, feature.tags)
			) {
				total += feature.adjustedAmount;
				feature.addToTooltip(tooltip);
			}
		}
		return total;
	}

	bestCollegeSpellBonus(colleges: string[], tags: string[], tooltip: TooltipGURPS | undefined): number {
		let best = Math.max();
		let bestTooltip = "";
		for (const c of colleges) {
			const buffer = new TooltipGURPS();
			if (!tooltip) tooltip = new TooltipGURPS();
			const points = this.spellPointBonusesFor("spell.college.points", c, tags, buffer);
			if (best < points) {
				best = points;
				if (buffer) bestTooltip = buffer.toString();
			}
		}
		if (tooltip) tooltip.push(bestTooltip);
		if (best === Math.max()) best = 0;
		return best;
	}

	bestCollegeSpellPointBonus(colleges: string[], tags: string[], tooltip: TooltipGURPS | undefined): number {
		let best = Math.max();
		let bestTooltip = "";
		for (const c of colleges) {
			const buffer = new TooltipGURPS();
			if (!tooltip) tooltip = new TooltipGURPS();
			const points = this.spellBonusesFor("spell.college", c, tags, buffer);
			if (best < points) {
				best = points;
				if (buffer) bestTooltip = buffer.toString();
			}
		}
		if (tooltip) tooltip.push(bestTooltip);
		if (best === Math.max()) best = 0;
		return best;
	}

	addWeaponComparedDamageBonusesFor(
		featureID: string,
		nameQualifier: string,
		specializationQualifier: string,
		tagsQualifier: string[],
		dieCount: number,
		tooltip: TooltipGURPS | undefined,
		m: Map<WeaponBonus, boolean>
	): Map<WeaponBonus, boolean> {
		if (!m) m = new Map();
		for (const one of this.weaponComparedDamageBonusesFor(
			featureID,
			nameQualifier,
			specializationQualifier,
			tagsQualifier,
			dieCount,
			tooltip
		)) {
			m.set(one, true);
		}
		return m;
	}

	addNamedWeaponDamageBonusesFor(
		featureID: string,
		nameQualifier: string,
		usageQualifier: string,
		tagsQualifier: string[],
		dieCount: number,
		tooltip: TooltipGURPS | undefined,
		m: Map<WeaponBonus, boolean>
	): Map<WeaponBonus, boolean> {
		if (!m) m = new Map();
		for (const one of this.namedWeaponDamageBonusesFor(
			featureID,
			nameQualifier,
			usageQualifier,
			tagsQualifier,
			dieCount,
			tooltip
		)) {
			m.set(one, true);
		}
		return m;
	}

	namedWeaponDamageBonusesFor(
		featureID: string,
		nameQualifier: string,
		usageQualifier: string,
		tagsQualifier: string[],
		dieCount: number,
		tooltip: TooltipGURPS | undefined
	): WeaponBonus[] {
		const list = this.featureMap.get(featureID.toLowerCase());
		if (!list || list.length === 0) return [];
		const bonuses: WeaponBonus[] = [];
		for (const f of list) {
			if (
				f instanceof WeaponBonus &&
				f.selection_type === "weapons_with_name" &&
				stringCompare(nameQualifier, f.name) &&
				stringCompare(usageQualifier, f.specialization) &&
				stringCompare(tagsQualifier, f.tags)
			) {
				bonuses.push(f);
				const level = f.levels;
				f.levels = dieCount;
				f.addToTooltip(tooltip);
				f.levels = level;
			}
		}
		return bonuses;
	}

	namedWeaponSkillBonusesFor(
		featureID: string,
		nameQualifier: string,
		usageQualifier: string,
		tagsQualifier: string[],
		tooltip: TooltipGURPS
	): Feature[] {
		const list = this.featureMap.get(featureID.toLowerCase()) ?? [];
		if (list.length === 0) return [];
		let bonuses: SkillBonus[] = [];
		for (const f of list) {
			if (
				f instanceof SkillBonus &&
				f.selection_type === "weapons_with_name" &&
				stringCompare(nameQualifier, f.name) &&
				stringCompare(usageQualifier, f.specialization) &&
				stringCompare(tagsQualifier, f.tags)
			) {
				bonuses.push(f);
				f.addToTooltip(tooltip);
			}
		}
		return bonuses;
	}

	weaponComparedDamageBonusesFor(
		featureID: string,
		nameQualifier: string,
		specializationQualifier: string,
		tagsQualifier: string[],
		dieCount: number,
		tooltip: TooltipGURPS | undefined
	): WeaponBonus[] {
		let rsl = -Infinity;
		for (const sk of this.skillNamed(nameQualifier, specializationQualifier, true, null)) {
			if (rsl < sk.level.relative_level) rsl = sk.level.relative_level;
		}
		if (rsl === -Infinity) return [];
		let bonuses: WeaponBonus[] = [];
		for (const f of this.featureMap.get(featureID.toLowerCase()) ?? []) {
			if (f instanceof WeaponBonus) {
				if (
					stringCompare(nameQualifier, f.name) &&
					stringCompare(specializationQualifier, f.specialization) &&
					numberCompare(rsl, f.level) &&
					stringCompare(tagsQualifier, f.tags)
				) {
					bonuses.push(f);
					let level = f.levels;
					f.levels = dieCount;
					f.addToTooltip(tooltip);
					f.levels = level;
				}
			}
		}
		return bonuses;
	}

	costReductionFor(featureID: string): number {
		let total = 0;
		for (const feature of this.featureMap.get(featureID.toLowerCase()) ?? []) {
			if (feature instanceof CostReduction) {
				total += feature.percentage;
			}
		}
		if (total > 80) total = 80;
		return Math.max(total, 0);
	}

	// Resolve attributes
	resolveAttributeCurrent(attr_id: string): number {
		const att = this.attributes?.get(attr_id)?.current;
		if (att) return att;
		return Math.max();
	}

	resolveAttributeName(attr_id: string): string {
		const def = this.resolveAttributeDef(attr_id);
		if (def) return def.name;
		return "unknown";
	}

	resolveAttributeDef(attr_id: string): AttributeDef | null {
		const a = this.attributes?.get(attr_id);
		if (a) return a.attribute_def;
		return null;
	}

	resolveVariable(variableName: string): string {
		if (this.variableResolverExclusions?.has(variableName)) {
			console.warn(`Attempt to resolve variable via itself: $${variableName}`);
			return "";
		}
		if (!this.variableResolverExclusions) this.variableResolverExclusions = new Map();
		this.variableResolverExclusions.set(variableName, true);
		if (gid.SizeModifier === variableName) return this.profile.SM.signedString();
		const parts = variableName.split("."); // TODO: check
		const attr = this.attributes.get(parts[0]);
		if (!attr) {
			console.warn(`No such variable: $${variableName}`);
			return "";
		}
		const def = this.settings.attributes[attr.attr_id];
		if (!def) {
			console.warn(`No such variable definition: $${variableName}`);
			return "";
		}
		if (def.type === "pool" && parts.length > 1) {
			switch (parts[1]) {
				case "current":
					return attr.current.toString();
				case "maximum":
					return attr.max.toString();
				default:
					console.warn(`No such variable: $${variableName}`);
					return "";
			}
		}
		this.variableResolverExclusions = new Map();
		return attr?.max.toString();
	}

	// Import from GCS
	async importCharacter() {
		const import_path = this.importData.path;
		const import_name = import_path.match(/.*[/\\]Data[/\\](.*)/);
		if (import_name) {
			const file_path = import_name[1].replace(/\\/g, "/");
			const request = new XMLHttpRequest();
			request.open("GET", file_path);

			new Promise(resolve => {
				request.onload = () => {
					if (request.status === 200) {
						const text = request.response;
						CharacterImporter.import(this, {
							text: text,
							name: import_name[1],
							path: import_path,
						});
					} else this._openImportDialog();
					resolve(this);
				};
			});
			request.send(null);
		} else this._openImportDialog();
	}

	_openImportDialog() {
		setTimeout(async () => {
			new Dialog(
				{
					title: `Import character data for: ${this.name}`,
					content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/import.hbs`, {
						name: `"${this.name}"`,
					}),
					buttons: {
						import: {
							icon: '<i class="fas fa-file-import"></i>',
							label: "Import",
							callback: html => {
								const form = $(html).find("form")[0];
								const files = form.data.files;
								if (!files.length) {
									return ui.notifications?.error("You did not upload a data file!");
								} else {
									const file = files[0];
									readTextFromFile(file).then(text =>
										CharacterImporter.import(this, {
											text: text,
											name: file.name,
											path: file.path,
										})
									);
								}
							},
						},
						no: {
							icon: '<i class="fas fa-times"></i>',
							label: "Cancel",
						},
					},
					default: "import",
				},
				{
					width: 400,
				}
			).render(true);
		}, 200);
	}
}

/**
 *
 * @param _parent
 * @param m
 * @param f
 * @param levels
 */
export function processFeature(_parent: any, m: Map<string, Feature[]>, f: Feature, levels: number): void {
	// Const key = f.type;
	const key = f.featureMapKey.toLowerCase();
	const list = m.get(key) ?? [];
	// F.setParent(parent);
	// f.setLevel(levels);
	f.levels = levels; // ?
	list.push(f);
	m.set(key, list!);
}

interface CharacterGURPS extends BaseActorGURPS {
	system: CharacterSystemData;
	_source: CharacterSource;
}

export { CharacterGURPS };
