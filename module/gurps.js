// Import Modules
import parselink from '../lib/parselink.js'

import { GurpsActor } from "./actor.js";
import { GurpsItem } from "./item.js";
import { GurpsItemSheet } from "./item-sheet.js";
import { GurpsActorCombatSheet, GurpsActorSheet } from "./actor-sheet.js";
import { ModifierBucket } from "./modifiers.js";
import { ChangeLogWindow } from "../lib/change-log.js";
import { SemanticVersion } from "../lib/semver.js";
import { d6ify } from '../lib/utilities.js'
import { ThreeD6 } from "../lib/threed6.js";

export const GURPS = {};
window.GURPS = GURPS;		// Make GURPS global!

import GURPSRange from '../lib/ranges.js'
import Initiative from '../lib/initiative.js'
import HitFatPoints from '../lib/hitpoints.js'
import HitLocationEquipmentTooltip from '../lib/hitlocationtooltip.js'
import DamageChat from '../lib/damagemessage.js'

import helpers from '../lib/moustachewax.js'

helpers()

//CONFIG.debug.hooks = true;

// Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
GURPS.LastActor = null;
GURPS.SetLastActor = function (actor) {
	GURPS.LastActor = actor;
	GURPS.ModifierBucket.refresh();
	//	console.log("Last Actor:" + actor.name);
}

GURPS.ModifierBucket = new ModifierBucket({
	"popOut": false,
	"minimizable": false,
	"resizable": false,
	"id": "ModifierBucket",
	"template": "systems/gurps/templates/modifier-bucket.html",
	"classes": [],
});

GURPS.ThreeD6 = new ThreeD6({
	"popOut": false,
	"minimizable": false,
	"resizable": false,
	"id": "ThreeD6",
	"template": "systems/gurps/templates/threed6.html",
	"classes": [],
});



// This table is used to display dice rolls and penalties (if they are missing from the import data)
// And to create the HitLocations pulldown menu (skipping any "skip:true" entries)
GURPS.hitlocationRolls = {
	"Eye": { roll: "-", penalty: -9, skip: true },
	"Eyes": { roll: "-", penalty: -9 },																// GCA
	"Skull": { roll: "3-4", penalty: -7 },
	"Skull, from behind": { penalty: -5 },
	"Face": { roll: "5", penalty: -5 },
	"Face, from behind": { penalty: -7 },
	"Nose": { penalty: -7, desc: "front only, *hit chest" },
	"Jaw": { penalty: -6, desc: "front only, *hit chest" },
	"Neck Vein/Artery": { penalty: -8, desc: "*hit neck" },
	"Limb Vein/Artery": { penalty: -5, desc: "*hit limb" },
	"Right Leg": { roll: "6-7", penalty: -2, skip: true },
	"Right Arm": { roll: "8", penalty: -2, skip: true },
	"Right Arm, holding shield": { penalty: -4, skip: true },
	"Arm, holding shield": { penalty: -4 },
	"Arm": { roll: "8 & 12", penalty: -2 },													// GCA
	"Arms": { roll: "8 & 12", penalty: -2, skip: true },													// GCA
	"Torso": { roll: "9-10", penalty: 0 },
	"Vitals": { roll: "-", penalty: -3, desc: "IMP/PI[any] only" },
	"Vitals, Heart": { penalty: -5, desc: "IMP/PI[any] only" },
	"Groin": { roll: "11", penalty: -3 },
	"Left Arm": { roll: "12", penalty: -2, skip: true },
	"Left Arm, holding shield": { penalty: -4, skip: true },
	"Left Leg": { roll: "13-14", penalty: -2, skip: true },
	"Legs": { roll: "6-7&13-14", penalty: -2, skip: true },												// GCA
	"Leg": { roll: "6-7&13-14", penalty: -2 },												// GCA
	"Hand": { roll: "15", penalty: -4 },
	"Hands": { roll: "15", penalty: -4, skip: true },									// GCA
	"Foot": { roll: "16", penalty: -4 },
	"Feet": { roll: "16", penalty: -4, skip: true },															// GCA
	"Neck": { roll: "17-18", penalty: -5 },
	"Chinks in Torso": { penalty: -8, desc: "Halves DR" },
	"Chinks in Other": { penalty: -10, desc: "Halves DR" },
};


GURPS.woundModifiers = {
	"burn": 1,
	"cor": 1,
	"cr": 1,
	"cut": 1.5,
	"fat": 1,
	"imp": 2,
	"pi-": 0.5,
	"pi": 1,
	"pi+": 1.5,
	"pi++": 2,
	"tox": 1
};

GURPS.attributepaths = {
	"ST": "attributes.ST.value",
	"DX": "attributes.DX.value",
	"IQ": "attributes.IQ.value",
	"HT": "attributes.HT.value",
	"WILL": "attributes.WILL.value",
	"Will": "attributes.WILL.value",
	"PER": "attributes.PER.value",
	"Per": "attributes.PER.value"
};


// Map stuff back to translation keys... don't know if useful yet
GURPS.attributes = {
	"ST": "GURPS.attributesST",
	"DX": "GURPS.attributesDX",
	"IQ": "GURPS.attributesIQ",
	"HT": "GURPS.attributesHT",
	"Will": "GURPS.attributesWILL",
	"Per": "GURPS.attributesPER"
};

GURPS.attributeNames = {
	"ST": "GURPS.attributesSTNAME",
	"DX": "GURPS.attributesDXNAME",
	"IQ": "GURPS.attributesIQNAME",
	"HT": "GURPS.attributesHTNAME",
	"Will": "GURPS.attributesWILLNAME",
	"Per": "GURPS.attributesPERNAME"
};

GURPS.skillTypes = {
	"DX/E": "GURPS.SkillDXE",
	"DX/A": "GURPS.SkillDXA",
	"DX/H": "GURPS.SkillDXH",
	"DX/VH": "GURPS.SkillDXVH",

	"IQ/E": "GURPS.SkillIQE",
	"IQ/A": "GURPS.SkillIQA",
	"IQ/H": "GURPS.SkillIQH",
	"IQ/VH": "GURPS.SkillIQVH",

	"HT/E": "GURPS.SkillHTE",
	"HT/A": "GURPS.SkillHTA",
	"HT/H": "GURPS.SkillHTH",
	"HT/VH": "GURPS.SkillHTVH",

	"Will/E": "GURPS.SkillWillE",
	"Will/A": "GURPS.SkillWillA",
	"Will/H": "GURPS.SkillWillH",
	"Will/VH": "GURPS.SkillWillVH",

	"Per/E": "GURPS.SkillPerE",
	"Per/A": "GURPS.SkillPerA",
	"Per/H": "GURPS.SkillPerH",
	"Per/VH": "GURPS.SkillPerVH"
}


GURPS.SavedStatusEffects = CONFIG.statusEffects;

CONFIG.statusEffects = [
	{
		icon: "systems/gurps/icons/shock1.png",
		id: "shock1",
		label: "EFFECT.StatusShocked"
	},
	{
		icon: "systems/gurps/icons/shock2.png",
		id: "shock2",
		label: "EFFECT.StatusShocked"
	},
	{
		icon: "systems/gurps/icons/shock3.png",
		id: "shock3",
		label: "EFFECT.StatusShocked"
	},
	{
		icon: "systems/gurps/icons/shock4.png",
		id: "shock4",
		label: "EFFECT.StatusShocked"
	},
	{
		icon: "systems/gurps/icons/stunned.png",
		id: "stun",
		label: "EFFECT.StatusStunned"
	},
	{
		icon: "systems/gurps/icons/falling.png",
		id: "prone",
		label: "EFFECT.StatusProne"
	},
	{
		icon: "systems/gurps/icons/kneeling.png",
		id: "kneel",
		label: "GURPS.STATUSKneel"
	},
	{
		icon: "systems/gurps/icons/leapfrog.png",
		id: "crouch",
		label: "GURPS.STATUSCrouch"
	},
	{
		icon: "systems/gurps/icons/wooden-chair.png",
		id: "sit",
		label: "GURPS.STATUSSit"
	},
	{
		icon: "systems/gurps/icons/euphoria.png",
		id: "euphoria",
		label: "GURPS.STATUSEuphoria"
	},
	{
		icon: "systems/gurps/icons/coughing.png",
		id: "coughing",
		label: "GURPS.STATUSCoughing"
	},
	{
		icon: "systems/gurps/icons/drowsy.png",
		id: "drowsy",
		label: "GURPS.STATUSDrowsy"
	},
	{
		icon: "systems/gurps/icons/drunk.png",
		id: "drunk",
		label: "GURPS.STATUSDrunk"
	},
	{
		icon: "systems/gurps/icons/tipsy.png",
		id: "tipsy",
		label: "GURPS.STATUSTipsy"
	},
	{
		icon: "systems/gurps/icons/nauseated.png",
		id: "nauseated",
		label: "GURPS.STATUSNauseated"
	},
	{
		icon: "systems/gurps/icons/moderate.png",
		id: "moderate",
		label: "GURPS.STATUSModerate"
	},
	{
		icon: "systems/gurps/icons/severe.png",
		id: "severe",
		label: "GURPS.STATUSSevere"
	},
	{
		icon: "systems/gurps/icons/terrible.png",
		id: "terrible",
		label: "GURPS.STATUSTerrible"
	},
	{
		icon: "systems/gurps/icons/vomiting.png",
		id: "retching",
		label: "GURPS.STATUSRetching"
	}
];

GURPS.SJGProductMappings = {
	"ACT1": "http://www.warehouse23.com/products/gurps-action-1-heroes",
	"ACT3": "http://www.warehouse23.com/products/gurps-action-3-furious-fists",
	"B": "http://www.warehouse23.com/products/gurps-basic-set-characters-and-campaigns",
	"BS": "http://www.warehouse23.com/products/gurps-banestorm",
	"DF1": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-1-adventurers-1",
	"DF3": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-3-the-next-level-1",
	"DF4": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-4-sages-1",
	"DF8": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-8-treasure-tables",
	"DF11": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-11-power-ups",
	"DF12": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-12-ninja",
	"DF13": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-13-loadouts",
	"DF14": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-14-psi",
	"DFM1": "http://www.warehouse23.com/products/gurps-dungeon-fantasy-monsters-1",
	"DFA": "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	"DFM": "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	"DFS": "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	"DFE": "http://www.warehouse23.com/products/dungeon-fantasy-roleplaying-game",
	"DR": "http://www.warehouse23.com/products/gurps-dragons-1",
	"F": "http://www.warehouse23.com/products/gurps-fantasy",
	"GUL": "https://www.gamesdiner.com/gulliver/",
	"H": "http://www.warehouse23.com/products/gurps-horror-1",
	"HF": "http://www.mygurps.com/historical_folks_4e.pdf",
	"HT": "http://www.warehouse23.com/products/gurps-high-tech-2",
	"IW": "http://www.warehouse23.com/products/gurps-infinite-worlds-1",
	"LT": "http://www.warehouse23.com/products/gurps-fourth-edition-low-tech",
	"LTC1": "http://www.warehouse23.com/products/gurps-low-tech-companion-1-philosophers-and-kings",
	"LTIA": "http://www.warehouse23.com/products/gurps-low-tech-instant-armor",
	"LITE": "http://www.warehouse23.com/products/SJG31-0004",
	"M": "http://www.warehouse23.com/products/gurps-magic-5",
	"MPS": "http://www.warehouse23.com/products/gurps-magic-plant-spells",
	"MA": "http://www.warehouse23.com/products/gurps-martial-arts",
	"MAFCCS": "http://www.warehouse23.com/products/gurps-martial-arts-fairbairn-close-combat-systems",
	"MATG": "http://www.warehouse23.com/products/gurps-martial-arts-technical-grappling",
	"MH1": "http://www.warehouse23.com/products/gurps-monster-hunters-1-champions",
	"MYST": "http://www.warehouse23.com/products/gurps-mysteries-1",
	"MYTH": "http://www.sjgames.com/gurps/books/myth/",
	"P": "http://www.warehouse23.com/products/gurps-powers",
	"PDF": "http://www.warehouse23.com/products/gurps-powers-divine-favor",
	"PSI": "http://www.warehouse23.com/products/gurps-psionic-powers",
	"PU1": "http://www.warehouse23.com/products/gurps-power-ups-1-imbuements-1",
	"PU2": "http://www.warehouse23.com/products/gurps-power-ups-2-perks",
	"PU3": "http://www.warehouse23.com/products/gurps-power-ups-3-talents",
	"PY#": "http://www.warehouse23.com/products?utf8=%E2%9C%93&keywords=pyramid+magazine&x=0&y=0",
	"RSWL": "http://www.warehouse23.com/products/gurps-reign-of-steel-will-to-live",
	"SU": "http://www.warehouse23.com/products/gurps-supers-3",
	"TMS": "http://www.warehouse23.com/products/gurps-thaumatology-magical-styles",
	"TRPM": "http://www.warehouse23.com/products/gurps-thaumatology-ritual-path-magic",
	"TS": "http://www.warehouse23.com/products/gurps-tactical-shooting",
	"TSOR": "http://www.warehouse23.com/products/gurps-thaumatology-sorcery",
	"UT": "http://www.warehouse23.com/products/gurps-ultra-tech",
	"VOR": "http://www.warehouse23.com/products/vorkosigan-saga-sourcebook-and-roleplaying-game"
}


// This is an ugly hack to clean up the "formatted text" output from GCS FG XML.
// First we have to remove non-printing characters, and then we want to replace 
// all <p>...</p> with .../n before we try to convert to JSON.   Also, for some reason,
// the DOMParser doesn't like some of the stuff in the formatted text sections, so
// we will base64 encode it, and the decode it in the Named subclass setNotes()
function cleanUpP(xml) {
	// First, remove non-ascii characters
	xml = xml.replace(/[^ -~]+/g, "");
	// &lt;p&gt;
	let swap = (xml, tagin, tagout) => {
		let s = xml.indexOf(tagin);
		while (s > 0) {
			let e = xml.indexOf(tagout, s);
			if (e > s) {
				let t1 = xml.substring(0, s);
				let t2 = xml.substring(s + 3, e);
				t2 = btoa(t2) + "\n";
				let t3 = xml.substr(e + 4);
				xml = t1 + t2 + t3;
				s = xml.indexOf(tagin, s + t2.length);
			}
		}
		return xml;
	}
	xml = swap(xml, "&lt;p&gt;", "&lt;/p&gt;");
	xml = swap(xml, "<p>", "</p>");
	xml = xml.replace(/<br>/g, "\n");
	return xml;
}
GURPS.cleanUpP = cleanUpP;

function extractP(str) {
	let v = "";
	if (!!str) {
		let s = str.split("\n");
		for (let b of s) {
			if (!!b) {
				try {
					v += atob(b) + "\n";
				} catch {
					v += b + "\n";
				}
			}
		}
	}
	return v;
}
GURPS.extractP = extractP;


/*
	A utility function to "deep" print an object
*/
function objToString(obj, ndeep) {
	if (obj == null) { return String(obj); }
	if (ndeep > 10) return "(stopping due to depth): " + obj.toString();
	switch (typeof obj) {
		case "string": return '"' + obj + '"';
		case "function": return obj.name || obj.toString();
		case "object":
			var indent = Array(ndeep || 1).join('\t'), isArray = Array.isArray(obj);
			return '{['[+isArray] + Object.keys(obj).map(function (key) {
				return '\n\t' + indent + key + ': ' + objToString(obj[key], (ndeep || 1) + 1);
			}).join(',') + '\n' + indent + '}]'[+isArray];
		default: return obj.toString();
	}
}
GURPS.objToString = objToString;

function trim(s) {
	return s.replace(/^\s*$(?:\r\n?|\n)/gm, "");         // /^\s*[\r\n]/gm
}
GURPS.trim = trim;

//	"modifier", "attribute", "selfcontrol", "roll", "damage", "skill", "pdf"
function performAction(action, actor) {
	if (!action) return;
	let prefix = "";
	let thing = "";
	let target = -1;	// There will be a roll
	let formula = "";
	let targetmods = []; 		// Should get this from the ModifierBucket someday

	if (action.type == "modifier") {
		let mod = parseInt(action.mod);
		GURPS.ModifierBucket.addModifier(mod, action.desc);
		return;
	}
	if (action.type == "attribute" && !!actor) {
		prefix = "Roll vs ";
		thing = this.i18n(action.path);
		formula = "3d6";
		target = action.target;
		if (!target) target = this.resolve(action.path, actor.data);
		if (!!action.mod || !!action.desc)
			targetmods.push(GURPS.ModifierBucket.makeModifier(action.mod, action.desc));
	}
	if (action.type == "selfcontrol") {
		prefix = "Self Control ";
		thing = action.desc;
		formula = "3d6";
		target = action.target;
	}
	if (action.type == "roll") {
		prefix = "Rolling " + action.formula + " " + action.desc;
		formula = d6ify(action.formula);
	}
	if (action.type == "damage") {
		prefix = "Rolling " + action.formula;
		thing = " points of '" + action.damagetype + "' damage";
		formula = d6ify(action.formula);
	}
	if (action.type == "deriveddamage" && !!actor) {
		prefix = "Rolling " + action.formula + " (" + action.derivedformula + ")";
		thing = " points of '" + action.damagetype + "' damage";
		formula = d6ify(action.derivedformula);
	}
	if (action.type == "skill" && !!actor) {
		prefix = "Attempting ";
		thing = action.name;
		let skill = actor.data.skills.findInProperties(s => s.name == thing);
		target = skill.level;
		formula = "3d6";
		if (!!action.mod) targetmods.push(GURPS.ModifierBucket.makeModifier(action.mod, action.desc));
	}

	if (!!formula) doRoll(actor, formula, targetmods, prefix, thing, target);
}
GURPS.performAction = performAction;



/*
	The user clicked on a field that would allow a dice roll.  
	Use the element information to try to determine what type of roll.
*/
async function onRoll(event, actor) {
	let formula = "";
	let targetmods = null;
	let element = event.currentTarget;
	let prefix = "";
	let thing = "";
	let target = 0;		// -1 == damage roll, target = 0 is NO ROLL.

	if ("path" in element.dataset) {
		prefix = "Roll vs ";
		thing = this.i18n(element.dataset.path);
		formula = "3d6";
		target = parseInt(element.innerText);
	}
	if ("name" in element.dataset) {
		prefix = "Attempting ";
		thing = element.dataset.name.replace(/ \(\)$/g, "");  // sent as "name (mode)", and mode is empty
		formula = "3d6";
		let t = element.innerText;
		if (!!t) {
			t = t.trim();
			if (!!t)
				target = parseInt(t);
			if (isNaN(target)) target = 0;		// Can't roll against a non-integer
		}
	}
	if ("damage" in element.dataset) {
		// expect text like '2d+1 cut'
		let formula = element.innerText.trim();
		let dtype = ''

		let i = formula.indexOf(' ');
		if (i > 0) {
			dtype = formula.substr(i + 1).trim();
			formula = formula.substring(0, i);
		}

		GURPS.damageChat.create(actor, formula, dtype)

		return
	}
	if ("roll" in element.dataset) {
		target = -1;   // Set flag to indicate a non-targeted roll
		formula = element.innerText;
		prefix = "Rolling " + formula;
		formula = d6ify(formula);
	}

	this.doRoll(actor, formula, targetmods, prefix, thing, target);
}
GURPS.onRoll = onRoll;


// If the desc contains *Cost ?FP or *Max:9 then perform action
function applyModifierDesc(actor, desc) {
	let parse = desc.replace(/.*\* ?Costs? (\d+) ?FP.*/g, "$1");
	if (parse != desc) {
		let fp = parseInt(parse);
		fp = actor.data.data.FP.value - fp;
		actor.update({ "data.FP.value": fp });
	}
	parse = desc.replace(/.*\*Max: ?(\d+).*/g, "$1");
	if (parse != desc) {
		return parseInt(parse);
	}
	return null;		// indicating no overriding MAX value
}
GURPS.applyModifierDesc = applyModifierDesc;


/*
	This is the BIG method that does the roll and prepares the chat message.
	unfortunately, it has a lot fo hard coded junk in it.
	*/
// formula="3d6", targetmods="[{ desc:"", mod:+-1 }]", thing="Roll vs 'thing'" or damagetype 'burn', target=skill level or -1=damage roll
async function doRoll(actor, formula, targetmods, prefix, thing, origtarget) {

	if (origtarget == 0) return;	// Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
	let isTargeted = (origtarget > 0 && !!thing);		// Roll "against" something (true), or just a roll (false)

	// Is Dice So Nice enabled ?
	let niceDice = false;
	try { niceDice = game.settings.get('dice-so-nice', 'settings').enabled; } catch { }

	// TODO Code below is duplicated in damagemessage.mjs (DamageChat) -- make sure it is updated in both places
	// Lets collect up the modifiers, they are used differently depending on the type of roll
	let modscontent = "";
	let modifier = 0;
	let maxtarget = null;			// If not null, then the target cannot be any higher than this.

	targetmods = await GURPS.ModifierBucket.applyMods(targetmods);		// append any global mods

	if (targetmods.length > 0) {
		modscontent = "<i>";
		for (let m of targetmods) {
			modifier += parseInt(m.mod);
			modscontent += "<br> &nbsp;<span style='font-size:85%'>" + m.mod;
			if (!!m.desc) {
				modscontent += " : " + m.desc;
				maxtarget = GURPS.applyModifierDesc(actor, m.desc);
			}
			modscontent += "</span>";
		}
	}

	let chatcontent = "";
	let roll = null;  // Will be the Roll
	if (isTargeted) {		// This is a roll "against a target number", e.g. roll vs skill/attack/attribute/etc.
		let finaltarget = origtarget + modifier;
		if (!!maxtarget && finaltarget > maxtarget) finaltarget = maxtarget;
		roll = new Roll(formula);		// The formula will always be "3d6" for a "targetted" roll
		roll.roll();
		let rtotal = roll.total;
		let results = "<i class='fa fa-dice'/> <i class='fa fa-long-arrow-alt-right'/> <b style='font-size: 140%;'>" + rtotal + "</b>";
		if (!!modscontent) modscontent += "</i><br>New Target: (" + finaltarget + ")";  // If we had modifiers, the target will have changed.

		// Actually, you aren't allowed to roll if the target is < 3... except for active defenses.   So we will just allow it and let the GM decide.
		let isCritSuccess = (rtotal <= 4) || (rtotal == 5 && finaltarget >= 15) || (rtotal == 6 && finaltarget >= 16);
		let isCritFailure = (rtotal >= 18) || (rtotal == 17 && finaltarget <= 15) || (rtotal - finaltarget >= 10 && finaltarget > 0);

		let margin = finaltarget - rtotal;
		if (isCritSuccess)
			results += " <span style='color:green; text-shadow: 1px 1px black; font-size: 150%;'><b>Critical Success!</b></span>  ";
		else if (isCritFailure)
			results += " <span style='color:red; text-shadow: 1px 1px black; font-size: 140%;'><b>Critical Failure!</b></span>  ";
		else if (margin >= 0)
			results += " <span style='color:green; font-size: 130%;'><b>Success!</b></span>  ";
		else
			results += " <span style='color:red;font-size: 120%;'><i>Failure.</i></span>  ";

		let rdesc = " <small>";
		if (margin == 0) rdesc += "just made it.";
		if (margin > 0) rdesc += "made it by " + margin;
		if (margin < 0) rdesc += "missed it by " + (-margin);
		rdesc += "</small>";
		chatcontent = prefix + thing + " (" + origtarget + ")" + modscontent + "<br>" + results + rdesc;
	} else {	// This is "damage" roll where the modifier is added to the roll, not the target
		// REPLACED by code in damagemessage.mjs/DamageChat

		// let diceText = prefix.replace(/^Rolling /, '')
		// let type = thing.replace(/^ points of '/, '').replace(/' damage/, '')
		// let min = 1
		// let b378 = false

		// if (type === 'cr') min = 0

		// if (formula.slice(-1) === '!') {
		// 	formula = formula.slice(0, -1)
		// 	min = 1
		// }

		// let roll = new Roll(formula + `+${modifier}`);
		// roll.roll();
		// let rtotal = roll.total;
		// if (rtotal < min) {
		// 	rtotal = min;
		// 	if (type !== 'cr') b378 = true
		// }

		// let contentData = {
		// 	dice: diceText,
		// 	damage: rtotal,
		// 	type: type,
		// 	modifiers: targetmods.map(it => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
		// 	isB378: b378,
		// 	type: 'Damage'
		// }
		// let html = await
		// 	renderTemplate('systems/gurps/templates/damage-message.html', contentData)

		// console.log(html)
		// const speaker = { alias: actor.name, _id: actor._id }
		// let messageData = {
		// 	user: game.user._id,
		// 	speaker: speaker,
		// 	content: html,
		// 	type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		// 	roll: roll
		// };

		// messageData["flags.transfer"] = JSON.stringify(
		// 	{
		// 		type: 'damageItem',
		// 		payload: contentData
		// 	}
		// )

		// let me = await CONFIG.ChatMessage.entityClass.create(messageData);
		// // me.data.flags.damage = contentData
		// return
	}

	const speaker = { alias: actor.name, _id: actor._id }
	let messageData = {
		user: game.user._id,
		speaker: speaker,
		content: chatcontent,
		type: CONST.CHAT_MESSAGE_TYPES.OOC,
		roll: roll
	};

	if (niceDice) {
		game.dice3d.showForRoll(roll).then((displayed) => {
			CONFIG.ChatMessage.entityClass.create(messageData, {});
		});
	} else {
		messageData.sound = CONFIG.sounds.dice;
		CONFIG.ChatMessage.entityClass.create(messageData, {});
	}
}
GURPS.doRoll = doRoll;

// Return html for text, parsing GURPS "links" into <span class="gurplink">XXX</span>
function gurpslink(str, actor, clrdmods = true, inclbrks = false) {
	if (str === undefined) return "!!UNDEFINED";
	let found = -1;
	let output = "";
	for (let i = 0; i < str.length; i++) {
		if (str[i] == "[")
			found = ++i;
		if (str[i] == "]" && found >= 0) {
			output += str.substring(0, (inclbrks ? found : found - 1));
			let action = parselink(str.substring(found, i), actor, "", clrdmods);
			output += action.text;
			str = str.substr(inclbrks ? i : i + 1);
			i = 0;
			found = -1;
		}
	}
	output += str;
	return output.replace(/\n/g, "<br>");
}
GURPS.gurpslink = gurpslink;

// Convert GCS page refs into PDFoundry book & page.   Special handling for refs like "PU8:12"
function onPdf(event) {
	let element = event.currentTarget;
	let t = element.innerText.trim();
	let i = t.indexOf(":");
	let book = "";
	let page = 0;
	if (i > 0) {
		book = t.substring(0, i).trim();
		page = parseInt(t.substr(i + 1));
	} else {
		book = t.replace(/[0-9]*/g, "").trim();
		page = parseInt(t.replace(/[a-zA-Z]*/g, ""));
	}
	if (ui.PDFoundry) {
		const pdf = ui.PDFoundry.findPDFDataByCode(book);
		if (pdf === undefined) {
			let url = game.GURPS.SJGProductMappings[book];
			if (!url) url = "http://www.warehouse23.com/products?taxons%5B%5D=558398545-sb";		// The main GURPS page
			window.open(url, '_blank');
		}
		else
			ui.PDFoundry.openPDF(pdf, { page });
	} else {
		ui.notifications.warn('PDFoundry must be installed to use links.');
	}
}
GURPS.onPdf = onPdf;

// Return the i18n string for this data path (note en.json must match up to the data paths).
// special case, drop ".value" from end of path (and append "NAME"), usually used for attributes
function i18n(path, suffix) {
	let i = path.indexOf(".value");
	if (i >= 0) {
		path = path.substr(0, i) + "NAME";	// used for the attributes
	}

	path = path.replace(/\./g, "");	// remove periods
	return game.i18n.localize("GURPS." + path);
}
GURPS.i18n = i18n;

// Given a string path "x.y.z", use it to resolve down an object heiracrhy
function resolve(path, obj = self, separator = '.') {
	var properties = Array.isArray(path) ? path : path.split(separator)
	return properties.reduce((prev, curr) => prev && prev[curr], obj)
}
GURPS.resolve = resolve;

function onGurpslink(event, actor, desc) {
	let element = event.currentTarget;
	let action = parselink(element.innerText, actor?.data, desc);
	this.performAction(action.action, actor?.data);
}
GURPS.onGurpslink = onGurpslink;


/* You may be asking yourself, why the hell is he generating fake keys to fit in an object
	when he could have just used an array.   Well, I had TONs of problems with the handlebars and Foundry
	trying to deal with an array.   While is "should" be possible to use it, and some people claim
	that they could... everything I tried did something wonky.   So the 2am fix was just make everything an
	object with fake indexes.   Handlebars deals with this just fine using {{#each someobject}} 
	and if you really did just want to modify a single entry, you could use {{#each somobject as | obj key |}}
	which will give you the object, and also the key, such that you could execute somebject.key to get the 
	correct instance.   */
function genkey(index) {
	let k = "key-";
	if (index < 10)
		k += "0";
	if (index < 100)
		k += "0";
	if (index < 1000)
		k += "0";
	return k + index;
}
GURPS.genkey = genkey;

function put(obj, value, index = -1) {
	if (index == -1) {
		index = 0;
		while (obj.hasOwnProperty(this.genkey(index))) index++;
	}
	obj[this.genkey(index)] = value;
}
GURPS.put = put;

function listeqtrecurse(eqts, options, level, data) {
	if (!eqts) return "";
	var list = Object.values(eqts);
	let ret = "";
	for (var i = 0; i < list.length; i++) {
		if (data) data.indent = level;
		ret = ret + options.fn(list[i], { data: data });
		ret = ret + GURPS.listeqtrecurse(list[i].contains, options, level + 1, data);
	}
	return ret;
}
GURPS.listeqtrecurse = listeqtrecurse;


GURPS.rangeObject = new GURPSRange()
GURPS.initiative = new Initiative()
GURPS.hitpoints = new HitFatPoints()
GURPS.hitLocationTooltip = new HitLocationEquipmentTooltip()
GURPS.damageChat = new DamageChat()

/*********************  HACK WARNING!!!! *************************/
/* The following method has been secretly added to the Object class/prototype to
	 make it work like an Array. 
*/
Object.defineProperty(Object.prototype, 'findInProperties', {
	value: function (expression) {
		return Object.values(this).find(expression);
	}
});

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("init", async function () {
	console.log(`Initializing GURPS 4e System`);
	game.GURPS = GURPS;
	CONFIG.GURPS = GURPS;
	console.log(GURPS.objToString(GURPS));


	// Define custom Entity classes
	CONFIG.Actor.entityClass = GurpsActor;
	CONFIG.Item.entityClass = GurpsItem;

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("gurps", GurpsActorSheet, { makeDefault: true });
	Actors.registerSheet("gurps", GurpsActorCombatSheet, { makeDefault: false });
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("gurps", GurpsItemSheet, { makeDefault: true });

	Handlebars.registerHelper('objToString', function (str) {
		let o = CONFIG.GURPS.objToString(str);
		console.log(o);
		return o;
	});


	Handlebars.registerHelper('notEmpty', function (obj) {
		return !!obj ? Object.values(obj).length > 0 : false;
	});


	/// NOTE:  To use this, you must use {{{gurpslink sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
	Handlebars.registerHelper('gurpslink', function (str, root, clrdmods = false, inclbrks = false) {
		let actor = root?.data?.root?.actor;
		if (!actor) actor = root?.actor;
		return game.GURPS.gurpslink(str, actor, clrdmods, inclbrks);
	});


	Handlebars.registerHelper('listeqt', function (context, options) {
		var data;
		if (options.data)
			data = Handlebars.createFrame(options.data);

		return GURPS.listeqtrecurse(context, options, 0, data);
	});


	// Only necessary because of the FG import
	Handlebars.registerHelper('hitlocationroll', function (loc, roll) {
		if (!roll)
			roll = GURPS.hitlocationRolls[loc]?.roll;
		return roll;
	});
	Handlebars.registerHelper('hitlocationpenalty', function (loc, penalty) {
		if (!penalty)
			penalty = GURPS.hitlocationRolls[loc]?.penalty;
		return penalty;
	});




	game.settings.register("gurps", "changelogVersion", {
		name: "Changelog Version",
		scope: "client",
		config: false,
		type: String,
		default: "0.0.0",
	});

	game.settings.register("gurps", "dontShowChangelog", {
		name: "Don't Automatically Show Changelog",
		scope: "client",
		config: false,
		type: Boolean,
		default: false,
	});

	ui.modifierbucket = GURPS.ModifierBucket;
	ui.modifierbucket.render(true);
});

Hooks.once("ready", async function () {
	GURPS.ModifierBucket.clear();
	GURPS.ThreeD6.refresh();

	// Show changelog
	if (!game.settings.get("gurps", "dontShowChangelog")) {
		const v = game.settings.get("gurps", "changelogVersion") || "0.0.1";
		const changelogVersion = SemanticVersion.fromString(v);
		const curVersion = SemanticVersion.fromString(game.system.data.version);

		if (curVersion.isHigherThan(changelogVersion)) {
			const app = new ChangeLogWindow(changelogVersion);
			app.render(true);
			game.settings.set("gurps", "changelogVersion", curVersion.toString());
		}
	}

	// This hook is currently only used for the GM Push feature of the Modifier Bucket.    Of course, we can add more later.
	Hooks.on('updateUser', (...args) => {
		if (!!args) {
			if (args.length >= 4) {
				let source = args[3];
				let target = args[1]._id;
				//				console.log("Update for: " + game.users.get(target).name + " from: " + game.users.get(source).name);
				if (target == game.user.id) {
					if (source != target) {		// Someone else (a GM) is updating your data.
						let date = args[1].flags?.gurps?.modifierchanged;			// Just look for the "modifierchanged" data (which will be a date in ms... something that won't be the same)
						if (!!date) game.GURPS.ModifierBucket.updateDisplay(date);
					}
				}
			}
		}
	});

	Hooks.on('createActiveEffect', (...args) => {
		if (!!args && args.length >= 4)
			GURPS.SetLastActor(args[0]);
	});

	// Keep track of which token has been activated, so we can determine the last actor for the Modifier Bucket (only when args[1] is true)
	Hooks.on("controlToken", (...args) => {
		if (args.length > 1 && args[1]) {
			let a = args[0]?.actor;
			if (!!a) game.GURPS.SetLastActor(a);
		}
	});
});

