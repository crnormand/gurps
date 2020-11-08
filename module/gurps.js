// Import Modules
import { GurpsActor } from "./actor.js";
import { GurpsItem } from "./item.js";
import { GurpsItemSheet } from "./item-sheet.js";
import { GurpsActorCombatSheet, GurpsActorSheet } from "./actor-sheet.js";
import { ModifierBucket } from "./modifiers.js";
import { ChangeLogWindow } from "../lib/change-log.js";
import { SemanticVersion } from "../lib/semver.js";

export const GURPS = {};

//CONFIG.debug.hooks = true;

// Hack to remember the last Actor sheet that was accessed... for the Modifier Bucket to work
GURPS.LastActor = null;
GURPS.SetLastActor = function (actor) {
	GURPS.LastActor = actor;
	GURPS.ModifierBucket.refresh();
	console.log("Last Actor:" + actor.name);
}

GURPS.ModifierBucket = new ModifierBucket({
	"width": 200,
	"height": 200,
	"top": 600,
	"left": 300,
	"popOut": false,
	"minimizable": false,
	"resizable": false,
	"id": "ModifierBucket",
	"template": "systems/gurps/templates/modifier-bucket.html",
	"classes": [],
});

// Trick to make a nice break between items, instead of "---"
GURPS.horiz = function (text, size = 10) {
	let s = "<span style='text-decoration:line-through'>";
	let line = s;
	for (let i = 0; i < size; i++)
		line += "&nbsp;";
	line += "</span>";
	line += " " + text + " ";
	line += s;
	for (let i = 0; i < size; i++)
		line += "&nbsp;";
	line += "</span>";
	return line;
}

// Using back quote to allow \n in the string.  Will make it easier to edit later (instead of array of strings)
GURPS.MeleeMods = `[+4 to hit (Determined Attack)]
[+4 to hit (Telegraphic Attack)]
[-2 to hit (Deceptive Attack)]
[+2 damage (Strong Attack)]
${GURPS.horiz("Extra Effort")}
[+2 damage (Mighty Blow) *Cost 1FP]
[+0 Heroic Charge *Cost 1FP]`;

GURPS.RangedMods = `[+1 Aim]
[+1 to hit (Determined Attack)]`;
	
GURPS.DefenseMods = `[+2 All-Out Defense]
[+1 to dodge (Shield)]
[+2 to dodge (Acrobatics)]
[+3 to dodge (Dive)]
[+3 to dodge (Retreat)]
[+1 block/parry (Retreat)]

[-2 to dodge (Failed Acrobatics)]
[-2 to dodge (Attacked from side)]
[-4 to dodge (Attacked from rear)]
[-2 to defend (Kneeling/Sitting)]
${GURPS.horiz("Extra Effort")}
[+2 Feverish Defense *Cost 1FP]`;

GURPS.BasicRangeSpeedMods = `[-1 Range 3 yds]
[-2 Range 5 yds]
[-3 Range 7 yds]
[-4 Range 10 yds]
[-5 Range 15 yds]
[-6 Range 20 yds]
[-7 Range 30 yds]
[-8 Range 50 yds]
[-9 Range 70 yds]`;

GURPS.MonsterHunterSpeedRangeMods= `[-3 20 yds, Short range]
[-7 100 yds, Medium range]
[-11 500 yds, Long range]
[-15 500+ yds, Extreme range]`;
	
GURPS.SpeedRangeMods = GURPS.BasicRangeSpeedMods;

GURPS.OtherMods= `[+1 GM 'cause I said so!]
[-1 GM 'cause I said so!]`

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

GURPS.hitlocationRolls = {
	"Eye": "-",
	"Skull": "3-4",
	"Face": "5",
	"Right Leg": "6-7",
	"Right Arm": "8",
	"Torso": "9-10",
	"Groin": "11",
	"Left Arm": "12",
	"Left Leg": "13-14",
	"Hand": "15",
	"Foot": "16",
	"Neck": "17-18",
	"Vitals": "-"
}

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
/* Example code:
				for (let range of game.GURPS.ranges) {
					if (yards <= range.max)
						return range.penalty;
				}
*/
GURPS.monsterHunter2Ranges = [
	{
		moddesc: "for Close range",
		max: 5,
		penalty: 0,
		description: "Can touch or strike foe"
	},
	{
		moddesc: "for Short range",
		max: 20,
		penalty: -3,
		description: "Can talk to foe; pistol or muscle-powered missile range"
	},
	{
		moddesc: "for Medium range",
		max: 100,
		penalty: -7,
		description: "Can only shout to foe; shotgun or SMG range"
	},
	{
		moddesc: "for Long range",
		max: 500,
		penalty: -11,
		description: "Opponent out of earshot; rifle range"
	},
	{
		moddesc: "for Extreme range",
		max: "500+",				// Finaly entry.   Could be null, but would require extra check... so just make it LARGE
		penalty: -15,
		desc: "Rival difficult to even see; sniper range"
	}
];

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
GURPS.basicSetRanges = [];
// Yes, I should be able to do this programatically... but my brain hurts right now, so there.
let r = [
	2, 0,
	3, -1,
	5, -2,
	7, -3,
	10, -4,
	15, -5,
	20, -6,
	30, -7,
	50, -8,
	70, -9,
	100, -10,
	150, -11,
	200, -12,
	300, -13,
	"300+", -14];

for (let i = 0; i < r.length; i = i + 2) {
	let d = {
		moddesc: `for range/speed ${r[i]} yds`,
		max: r[i],
		penalty: r[i + 1],
		desc: `${r[i]} yds`
	};
	GURPS.basicSetRanges.push(d);
}	
	
//GURPS.ranges = GURPS.monsterHunter2Ranges;
GURPS.ranges = GURPS.basicSetRanges;

/*
	Convert XML text into a JSON object
*/
function xmlTextToJson(text) {
	var xml = new DOMParser().parseFromString(text, 'application/xml');
	return xmlToJson(xml);
}
GURPS.xmlTextToJson = xmlTextToJson;

/*
	Convert a DOMParsed version of the XML, return a JSON object.
*/
function xmlToJson(xml) {

	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
			obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for (var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof (obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof (obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};
GURPS.xmlToJson = xmlToJson;

// This is an ugly hack to clean up the "formatted text" output from GCS FG XML.
// First we have to remove non-printing characters, and then we want to replace 
// all <p>...</p> with .../n before we try to convert to JSON.   Also, for some reason,
// the DOMParser doesn't like some of the stuff in the formatted text sections, so
// we will base64 encode it, and the decode it in the Named subclass setNotes()
function cleanUpP(xml) {
	// First, remove non-ascii characters
	xml = xml.replace(/[^ -~]+/g, "");
	let s = xml.indexOf("<p>");
	while (s > 0) {
		let e = xml.indexOf("</p>", s);
		if (e > s) {
			let t1 = xml.substring(0, s);
			let t2 = xml.substring(s + 3, e);
			t2 = btoa(t2) + "\n";
			let t3 = xml.substr(e + 4);
			xml = t1 + t2 + t3;
			s = xml.indexOf("<p>", s + t2.length);
		}
	}
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

function gspan(str) {
	return "<span class='gurpslink'>" + str + "</span>";
}
GURPS.gspan = gspan;

function gmspan(str, plus, clrdmods) {
	if (clrdmods) {
		if (plus) 
			return "<span class='glinkmodplus'>" + str + "</span>";
		else
			return "<span class='glinkmodminus'>" + str + "</span>";
	}
	return "<span class='glinkmod'>" + str + "</span>";
}
GURPS.gmspan = gmspan;

/* Here is where we do all the work to try to parse the text inbetween [ ].
 Supported formats:
	+N <desc>
	-N <desc>
		add a modifier to the stack, using text as the description
	ST/IQ/DX[+-]N <desc>
		attribute roll with optional add/subtract
	CR: N <desc>
		Self control roll
	"Skill*" +/-N
		Roll vs skill (with option +/- mod)
	"ST12"
	"SW+1"/"THR-1"
	"PDF:B102"
		
	"modifier", "attribute", "selfcontrol", "damage", "roll", "skill", "pdf"
*/
function parselink(str, actor, htmldesc, clrdmods = false) {
	if (str.length < 2)
		return { "text": str };

	// Modifiers
	if (str[0] === "+" || str[0] === "-") {
		let sign = str[0];
		let rest = str.substr(1);
		let parse = rest.replace(/^([0-9]+)+( .*)?/g, "$1~$2");
		if (parse != rest) {
			let a = parse.split("~");
			let desc = a[1].trim();
			return {
				"text": this.gmspan(str, sign == "+", clrdmods),
				"action": {
					"type": "modifier",
					"mod": sign + a[0],
					"desc": (!!desc) ? desc : htmldesc
				}
			}
		}
	}

	// Attributes "ST+2 desc, Per"
	let parse = str.replace(/^(\w+)([+-]\d+)?(.*)$/g, "$1~$2~$3")
	let a = parse.split("~");
	let path = GURPS.attributepaths[a[0]];
	if (!!path) {
		return {
			"text": this.gspan(str),
			"action": {
				"type": "attribute",
				"attribute": a[0],
				"path": path,
				"desc": a[2].trim(),		// Action description, not modifier desc
				"mod": a[1]
			}
		}
	}

	// Special case where they are makeing a targeted roll, NOT using their own attributes.  ST26.  Does not support mod (no ST26+2)
	parse = str.replace(/^([a-zA-Z]+)(\d+)(.*)$/g, "$1~$2~$3")
	if (parse != str) {
		a = parse.split("~");
		path = GURPS.attributepaths[a[0]];
		if (!!path) {
			let n = parseInt(a[1]);
			if (n) {
				return {
					"text": this.gspan(str),
					"action": {
						"type": "attribute",
						"target": n,
						"desc": a[2].trim(),  // Action description, not modifier desc
						"path": path
					}
				}
			}
		}
	}

	// Self control roll CR: N
	let two = str.substr(0, 2);
	if (two === "CR" && str.length > 2 && str[2] === ":") {
		let rest = str.substr(3).trim();
		let num = rest.replace(/([0-9]+).*/g, "$1");
		let desc = rest.replace(/[0-9]+ *(.*)/g, "$1");
		return {
			"text": this.gspan(str),
			"action": {
				"type": "selfcontrol",
				"target": num,
				"desc": desc
			}
		}
	}

	// Straight roll, no damage type. 4d, 2d-1, etc.   Allows "!" suffix to indicate minimum of 1.
	parse = str.replace(/^(\d+)d([-+]\d+)?(!)?(.*)$/g, "$1~$2~$3~$4")
	if (parse != str) {
		let a = parse.split("~");
		let d = a[3].trim();
		let m = GURPS.woundModifiers[d];
		if (!m) {		// Not one of the recognized damage types
			return {
				"text": this.gspan(str),
				"action": {
					"type": "roll",
					"formula": a[0] + "d" + a[1] + a[2],
					"desc": d			// Action description, not modifier desc
				}
			}
		} else {	// Damage roll 1d+2 cut.   Not allowed an action desc
			return {
				"text": this.gspan(str),
				"action": {
					"type": "damage",
					"formula": a[0] + "d" + a[1] + a[2],
					"damagetype": d
				}
			}
		}
	}

	// Look for skill*+/-N test
	parse = str.replace(/^([\w ]*)(\*?)([-+]\d+)? ?(.*)/g, "$1~$2~$3~$4");
	let skill = null;
	let mod = "";
	if (parse == str)
		skill = actor?.data.skills.findInProperties(s => s.name == str);
	else {
		let a = parse.split("~");
		let n = a[0].trim();
		if (!!n) {
			mod = a[2];
			if (a[1] == "*") {
				skill = actor?.data.skills.findInProperties(s => s.name.startsWith(n));
			} else {
				skill = actor?.data.skills.findInProperties(s => s.name == n);
			}
			if (!!skill) {
				return {
					"text": this.gspan(str),
					"action": {
						"type": "skill",
						"name": skill.name,
						"mod": mod,
						"desc": a[3]
					}
				}
			}
		}
	}

	// for PDF link
	parse = str.replace(/^PDF: */g, "");
	if (parse != str) {
		return { "text": "<span class='pdflink'>" + parse + "</span>" };  // Just get rid of the "[PDF:" and allow the pdflink css class to do the work
	}

	// SW and THR damage
	parse = str.replace(/^(SW|THR)([-+]\d+)?(!)?( .*)?$/g, "$1~$2~$3~$4")
	if (parse != str) {
		let a = parse.split("~");
		let d = a[3].trim();
		let m = GURPS.woundModifiers[d];
		if (!!m) {
			let df = (a[0] == "SW" ? actor?.data.swing : actor?.data.thrust)
			return {
				"text": this.gspan(str),
				"action": {
					"type": "deriveddamage",
					"derivedformula": df + a[1] + a[2],
					"formula": a[0] + a[1] + a[2],
					"damagetype": d
				}
			}
		}
	}

	return { "text": str };
}
GURPS.parselink = parselink;



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
	if (action.type == "attribute") {
		prefix = "Roll vs ";
		thing = this.i18n(action.path);
		formula = "3d6";
		target = action.target;
		if (!target) target = this.resolve(action.path, actor.data);
		if (!!action.mod) targetmods.push(GURPS.ModifierBucket.makeModifier(action.mod, action.desc));
	}
	if (action.type == "selfcontrol") {
		prefix = "Self Control ";
		thing = action.desc;
		formula = "3d6";
		target = action.target;
	}
	if (action.type == "roll") {
		prefix = "Rolling " + action.formula + " " + action.desc;
		formula = this.d6ify(action.formula);
	}
	if (action.type == "damage") {
		prefix = "Rolling " + action.formula;
		thing = " points of '" + action.damagetype + "' damage";
		formula = this.d6ify(action.formula);
	}
	if (action.type == "deriveddamage") {
		prefix = "Rolling " + action.formula + " (" + action.derivedformula + ")";
		thing = " points of '" + action.damagetype + "' damage";
		formula = this.d6ify(action.derivedformula);
	}
	if (action.type == "skill") {
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

function d6ify(str) {
	let w = str.replace(/d([^6])/g, "d6$1");		// Find 'd's without a 6 behind it, and add it.
	return w.replace(/d$/g, "d6"); 								// and do the same for the end of the line.
}
GURPS.d6ify = d6ify


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
		}
	}
	if ("damage" in element.dataset) {
		formula = element.innerText.trim();
		let i = formula.indexOf(" ");
		if (i > 0) {
			let dtype = formula.substr(i + 1).trim();
			thing = " points of '" + dtype + "' damage";
			formula = formula.substring(0, i);
		}
		if (formula != "0") {
			prefix = "Rolling " + formula;
			formula = this.d6ify(formula);
			target = -1;		// Set flag to indicate a non-targeted roll
		}
	}
	if ("roll" in element.dataset) {
		target = -1;   // Set flag to indicate a non-targeted roll
		formula = element.innerText;
		prefix = "Rolling " + formula;
		formula = this.d6ify(formula);
	}

	this.doRoll(actor, formula, targetmods, prefix, thing, target);
}
GURPS.onRoll = onRoll;


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

	// Lets collect up the modifiers, they are used differently depending on the type of roll
	let modscontent = "";
	let modifier = 0;
	
	targetmods = await GURPS.ModifierBucket.applyMods(targetmods);		// append any global mods

	if (targetmods.length > 0) {
		modscontent = "<i>";
		for (let m of targetmods) {
			modifier += parseInt(m.mod);
			modscontent += "<br> &nbsp;<span style='font-size:85%'>" + m.mod;
			if (!!m.desc) modscontent += " : " + m.desc;
			modscontent += "</span>";
		}
	}

	let chatcontent = "";
	let roll = null;  // Will be the Roll
	if (isTargeted) {		// This is a roll "against a target number", e.g. roll vs skill/attack/attribute/etc.
		let finaltarget = origtarget + modifier;
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
		let min = 0;
		let b378 = false;
		let b378content = "";
		// This is a nasty hack to give other damage types a minimum of 1 pt
		if (thing.includes("damage") && !thing.includes("'cr' damage")) {
			min = 1;
			b378 = true;
		}
		if (formula[formula.length - 1] == "!") {
			formula = formula.substr(0, formula.length - 1);
			min = 1;
		}
		roll = new Roll(formula + `+${modifier}`);
		roll.roll();
		let rtotal = roll.total;
		if (rtotal < min) {
			rtotal = min;
			if (b378) b378content = " (minimum of 1 point of damage per B378)"
		}

		let results = "<i class='fa fa-dice'/> <i class='fa fa-long-arrow-alt-right'/> <b style='font-size: 140%;'>" + rtotal + "</b>";
		if (rtotal == 1) thing = thing.replace("points", "point") + b378content;
		chatcontent = prefix + modscontent + "<br>" + results + thing;
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
			output += str.substring(0, (inclbrks ? found : found -1));
			let action = this.parselink(str.substring(found, i), actor, "", clrdmods);
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
		ui.PDFoundry.openPDFByCode(book, { page });
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
	let action = this.parselink(element.innerText, actor?.data, desc);
	this.performAction(action.action, actor?.data);
}
GURPS.onGurpslink = onGurpslink;

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

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
		formula: "1d20",
		decimals: 2
	};

	// Define custom Entity classes
	CONFIG.Actor.entityClass = GurpsActor;
	CONFIG.Item.entityClass = GurpsItem;

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("gurps", GurpsActorSheet, { makeDefault: true });
	Actors.registerSheet("gurps", GurpsActorCombatSheet, { makeDefault: false });
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("gurps", GurpsItemSheet, { makeDefault: true });

	// If you need to add Handlebars helpers, here are a few useful examples:
	Handlebars.registerHelper('concat', function () {
		var outStr = '';
		for (var arg in arguments) {
			if (typeof arguments[arg] != 'object') {
				outStr += arguments[arg];
			}
		}
		return outStr;
	});

	// Add "@index to {{times}} function
	Handlebars.registerHelper("times", function (n, content) {
		let result = "";
		for (let i = 0; i < n; i++) {
			content.data.index = i + 1;
			result += content.fn(i);
		}
		return result;
	});

	Handlebars.registerHelper('toLowerCase', function (str) {
		return str.toLowerCase();
	});

	Handlebars.registerHelper('objToString', function (str) {
		let o = CONFIG.GURPS.objToString(str);
		console.log(o);
		return o;
	});


	/// NOTE:  To use this, you must use {{{gurpslink sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
	Handlebars.registerHelper('gurpslink', function (str, root, clrdmods=false, inclbrks=false) {
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

	Handlebars.registerHelper('gt', function (a, b) { return a > b; });

	GURPS.hpConditions = {
		NORMAL: {
			breakpoint: (_) => Number.MAX_SAFE_INTEGER,
			label: 'Normal',
			style: 'normal'
		},
		REELING: {
			breakpoint: (HP) => (HP.max / 3),
			label: 'Reeling',
			style: 'reeling'
		},
		COLLAPSE: {
			breakpoint: (_) => 0,
			label: 'Collapse',
			style: 'collapse'
		},
		CHECK1: {
			breakpoint: (HP) => -1 * HP.max,
			label: 'Check #1',
			style: 'check'
		},
		CHECK2: {
			breakpoint: (HP) => -2 * HP.max,
			label: 'Check #2',
			style: 'check'
		},
		CHECK3: {
			breakpoint: (HP) => -3 * HP.max,
			label: 'Check #3',
			style: 'check'
		},
		CHECK4: {
			breakpoint: (HP) => -4 * HP.max,
			label: 'Check #4',
			style: 'check'
		},
		DEAD: {
			breakpoint: (HP) => -5 * HP.max,
			label: 'Dead',
			style: 'dead'
		},
		DESTROYED: {
			breakpoint: (HP) => -10 * HP.max,
			label: 'Destroyed',
			style: 'destroyed'
		}
	}

	GURPS.fpConditions = {
		NORMAL: {
			breakpoint: (_) => Number.MAX_SAFE_INTEGER,
			label: 'Normal',
			style: 'normal'
		},
		REELING: {
			breakpoint: (FP) => (FP.max / 3),
			label: 'Tired',
			style: 'tired'
		},
		COLLAPSE: {
			breakpoint: (_) => 0,
			label: 'Collapse',
			style: 'collapse'
		},
		UNCONSCIOUS: {
			breakpoint: (FP) => -1 * FP.max,
			label: 'Unconscious',
			style: 'unconscious'
		}
	}

	const getConditionKey = function (pts, conditions) {
		var found = conditions['NORMAL']
		for (const [key, value] of Object.entries(conditions)) {
			if (pts.value > value.breakpoint(pts)) { return found }
			found = key
		}
		return found
	}

	const hpCondition = function (HP, member) {
		let key = getConditionKey(HP, GURPS.hpConditions)
		return GURPS.hpConditions[key][member]
	}

	const fpCondition = function (FP, member) {
		let key = getConditionKey(FP, GURPS.fpConditions)
		return GURPS.fpConditions[key][member]
	}

	Handlebars.registerHelper('hpCondition', hpCondition);
	Handlebars.registerHelper('fpCondition', fpCondition);

	const buildOutput = function (list, opt) {
		var results = ''
		list.forEach((item) => {
			results += opt.fn(item)
		})
		return results
	}

	Handlebars.registerHelper('hpBreakpoints', function (HP, opt) {
		var list = []
		for (const [key, value] of Object.entries(GURPS.hpConditions)) {
			let currentKey = getConditionKey(HP, GURPS.hpConditions)
			list.push({
				breakpoint: Math.floor(value.breakpoint(HP)).toString(),
				label: value.label.toString(),
				style: (key === currentKey) ? "selected" : ""
			})
		}
		list.shift()
		return buildOutput(list, opt)
	});

	Handlebars.registerHelper('fpBreakpoints', function (FP, opt) {
		var list = []
		for (const [key, value] of Object.entries(GURPS.fpConditions)) {
			let currentKey = getConditionKey(FP, GURPS.fpConditions)
			list.push({
				breakpoint: Math.floor(value.breakpoint(FP)).toString(),
				label: value.label.toString(),
				style: (key === currentKey) ? "selected" : ""
			})
		}
		list.shift()
		return buildOutput(list, opt)
	});

	// Only necessary because of the FG import
	Handlebars.registerHelper('hitlocationroll', function (loc, roll) {
		if (!roll)
			roll = GURPS.hitlocationRolls[loc];
		return roll;
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
});
