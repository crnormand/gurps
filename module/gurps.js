// Import Modules
import { GurpsActor } from "./actor.js";
import { GurpsItem } from "./item.js";
import { GurpsItemSheet } from "./item-sheet.js";
import { GurpsActorSheet } from "./actor-sheet.js";
import { GurpsActorSheetGCS } from "./actor-sheet.js";
import { Skill } from "./actor.js";
import { Spell } from "./actor.js";
import { Advantage } from "./actor.js";
import { Melee } from "./actor.js";
import { Ranged } from "./actor.js";
import { Encumbrance } from "./actor.js";
import { ModifierBucket } from "./modifiers.js";

export const GURPS = {};

let opts = {
	"width": 300,
	"height": 200,
	"top": 600,
	"left": 300,
	"popOut": false,
	"minimizable": false,
	"resizable": false,
	"id": "ModifierBucket",
	"template": "systems/gurps/templates/modifier-bucket.html",
	"classes": [],
	
}

GURPS.ModifierBucket = new ModifierBucket(opts);

GURPS.attributes = {
  "ST": "GURPS.ST",
  "DX": "GURPS.DX",
  "IQ": "GURPS.IQ",
  "HT": "GURPS.HT",
  "Will": "GURPS.WILL",
  "Per": "GURPS.PER"
};

GURPS.attributeNames = {
  "ST": "GURPS.ST.NAME",
  "DX": "GURPS.DX.NAME",
  "IQ": "GURPS.IQ.NAME",
  "HT": "GURPS.HT.NAME",
  "Will": "GURPS.WILL.NAME",
  "Per": "GURPS.PER.NAME"
};

GURPS.skillTypes = {
		"DX/E": "GURPS.Skill.DXE",
		"DX/A": "GURPS.Skill.DXA",
		"DX/H": "GURPS.Skill.DXH",
		"DX/VH": "GURPS.Skill.DXVH",

		"IQ/E": "GURPS.Skill.IQE",
		"IQ/A": "GURPS.Skill.IQA",
		"IQ/H": "GURPS.Skill.IQH",
		"IQ/VH": "GURPS.Skill.IQVH",

		"HT/E": "GURPS.Skill.HTE",
		"HT/A": "GURPS.Skill.HTA",
		"HT/H": "GURPS.Skill.HTH",
		"HT/VH": "GURPS.Skill.HTVH",

		"Will/E": "GURPS.Skill.WillE",
		"Will/A": "GURPS.Skill.WillA",
		"Will/H": "GURPS.Skill.WillH",
		"Will/VH": "GURPS.Skill.WillVH",

		"Per/E": "GURPS.Skill.PerE",
		"Per/A": "GURPS.Skill.PerA",
		"Per/H": "GURPS.Skill.PerH",
		"Per/VH": "GURPS.Skill.PerVH"
}

function xmlTextToJson(text) {
	var xml = new DOMParser().parseFromString(text, 'application/xml');
	return xmlToJson(xml);
}
GURPS.xmlTextToJson = xmlTextToJson;

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
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
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
GURPS.xmlToJson= xmlToJson;

function objToString(obj, ndeep) {
  if(obj == null){ return String(obj); }
  switch(typeof obj){
    case "string": return '"'+obj+'"';
    case "function": return obj.name || obj.toString();
    case "object":
      var indent = Array(ndeep||1).join('\t'), isArray = Array.isArray(obj);
      return '{['[+isArray] + Object.keys(obj).map(function(key){
           return '\n\t' + indent + key + ': ' + objToString(obj[key], (ndeep||1)+1);
         }).join(',') + '\n' + indent + '}]'[+isArray];
    default: return obj.toString();
  }
}
GURPS.objToString = objToString;

function trim(s) {
	return s.replace(/^\s*$(?:\r\n?|\n)/gm,"");         // /^\s*[\r\n]/gm
}
GURPS.trim = trim;

GURPS.attributepaths = { 
    "ST": "attributes.ST",
    "DX": "attributes.DX",
    "IQ": "attributes.IQ",
    "HT": "attributes.HT",
    "WILL": "attributes.WILL",
    "Will": "attributes.WILL",
    "PER": "attributes.PER",
    "Per": "attributes.PER"
  };

function gspan(str) {
	return "<span class='gurpslink'>" + str + "</span>";
}
GURPS.gspan=gspan;

function gmspan(str) {
	return "<span class='gmod'>" + str + "</span>";
}
GURPS.gmspan=gmspan;

/* Here is where we do all the work to try to parse the text inbetween [ ].
 Supported formats:
	+N <desc>
 	-N <desc>
		add a modifier to the stack, using text as the description
	ST/IQ/DX[+-]N <desc>
		attribute roll with optional add/subtract
	CR: N <desc>
	  Self control roll
	"Skill" +/-N
		Roll vs skill (with option +/- mod).
*/
function parselink(str) {
	if (str.length < 2) 
		return { "text": str };
	
	// Modifiers
	if (str[0] === "+" || str[0] === "-") {
		let sign = str[0];
		let rest = str.substr(1);
		let num = rest.replace(/([0-9]+).*/g,"$1");
		if (!num) return { "text": str };
		let desc = rest.replace(/[0-9]+(.*)/g,"$1").trim();
		return {
			"text": this.gmspan(str),
			"action": {
				"type": "modifier",
				"mod": sign + num,
				"desc": desc
			}
		}
	}
	
	// Attributes ST+2 desc
	let two = str.substr(0, 2);
	let path = GURPS.attributepaths[two];
	if (!!path) {
		let rest = str.substr(2).trim();
		let mod = rest.replace(/([+-][0-9]+).*/g,"$1");
		let desc = rest.replace(/[+-][0-9]+ *(.*)/g,"$1");
		return {
			"text": this.gspan(str),
			"action": {
				"type": "attribute",
				"attribute": two,
				"path": path,
				"desc": desc,
				"mod": mod
			}
		}
	}
	
	// Self control roll CR: N
	if (two === "CR" && str.length > 2 && str[2] === ":") {
		let rest = str.substr(3).trim();	
		let num = rest.replace(/([0-9]+).*/g,"$1");
		let desc = rest.replace(/[0-9]+ *(.*)/g,"$1");
		return {
			"text": this.gspan(str),
			"action": {
				"type": "selfcontrol",
				"num": num,
				"desc": desc
			}
		}
	}
	 
	return { "test": str };	
}
GURPS.parselink = parselink;

// Return html for text, parsing GURPS "links" into <span class="gurplink">XXX</span>
function gurpslink(str) {
	let found = -1;
	let output = "";
	for (let i = 0; i < str.length; i++)
	{
		if (str[i] == "[")
			found = ++i;
		if (str[i] == "]" && found >= 0) {
			output += str.substring(0, found);
			let action = this.parselink(str.substring(found, i));
			output += action.text;
			str = str.substr(i);
			i = 0;
			found = -1;
		}
	}
	output += str;
	return output;
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
		page = parseInt(t.substr(i+1));
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
function resolve(path, obj=self, separator='.') {
  var properties = Array.isArray(path) ? path : path.split(separator)
  return properties.reduce((prev, curr) => prev && prev[curr], obj)
}
GURPS.resolve = resolve;

function onRoll(event, actor) {
	let element = event.currentTarget;
	  // Is Dice So Nice enabled ?
  let niceDice = false;
  try { niceDice = game.settings.get('dice-so-nice', 'settings').enabled; } catch {}

	let content = "";
	let dmgtype = "";
	let rollMods = "";
	let damageMods = "";
	
	let thing = "";
	let roll = new Roll("3d6" + rollMods);
	
	if ("path" in element.dataset) {
		thing = this.i18n(element.dataset.path);
	}
	if ("name" in element.dataset) {
		thing = element.dataset.name.replace(/\(\)$/g, "");
	}
	if ("damage" in element.dataset) {
		let d = element.innerText;
		let i = d.indexOf(" ");
		if (i > 0) {
			dmgtype = d.substr(i+1);
			d = d.substring(0, i);
			let w = d.replace(/d([^6])/g, "d6$1");
			d= w.replace(/d$/g, "d6");
		}
		roll = new Roll(d + damageMods);
	}
	
	roll.roll();
	let rtotal = roll.total;
	if (rtotal < 0) rtotal = 0;
	if (!!thing) {
		let target = parseInt(element.innerText);	
		if (!target) return;
		let results = "<i class='fa fa-dice'/> <i class='fa fa-long-arrow-alt-right'/> <b style='font-size: 140%;'>" + rtotal + "</b>";
		results += (roll.total <= target) ? " <span style='color:green; font-size: 140%;'><b>Success!</b></span>  " : " <span style='color:red;font-size: 120%;'><i>Failure.</i></span>  ";
		let margin = target - rtotal;
		let rdesc = " <small>";
		if (margin == 0) rdesc += "just made it.";
		if (margin > 0) rdesc += "made it by " + margin;
		if (margin < 0) rdesc += "missed it by " + (-margin);
		rdesc += "</small>";
		content = "Roll vs " + thing + " [" + target + "]<br>" + results + rdesc;
	} else {
		content = "Does <b>" + rtotal + "</b> points of '" + dmgtype + "' damage";
	}
	
	const speaker = { alias: actor.name, _id: actor._id }
  let messageData = {
		user: game.user._id,
    speaker: speaker,
    content: content,
    type: CONST.CHAT_MESSAGE_TYPES.OOC,
    roll: roll
	};

	if (niceDice) {
		game.dice3d.showForRoll(roll).then((displayed) => { 
			CONFIG.ChatMessage.entityClass.create(messageData, {})});
	} else {
		messageData.sound = CONFIG.sounds.dice;
		CONFIG.ChatMessage.entityClass.create(messageData, {});
	}
}
GURPS.onRoll = onRoll; 
	
function onGurpslink(event, actor) {
	let element = event.currentTarget;
}
GURPS.onGurpslink = onGurpslink;


/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
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
  Actors.registerSheet("gurps", GurpsActorSheet, { makeDefault: false });
  Actors.registerSheet("gurps", GurpsActorSheetGCS, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("gurps", GurpsItemSheet, {makeDefault: true});

 // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

	// Add "@index to {{times}} function
	Handlebars.registerHelper("times", function(n, content) {
		let result = "";
		for (let i = 0; i < n; i++) {
			content.data.index = i + 1;
			result += content.fn(i);
		}
		return result;
	});

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('objToString', function(str) {
    let o = CONFIG.GURPS.objToString(str);
		console.log(o);
		return o;
  });

  Handlebars.registerHelper('globalmodifier', function() {
    return game.GURPS.ModifierBucket.getCurrentModifier();
  });

  Handlebars.registerHelper('gurpslink', function(str) {
    return game.GURPS.gurpslink(str);
  });



});

Hooks.once("ready", async function() {
	console.log(GURPS.ModifierBucket);
	ui.modifierbucket = GURPS.ModifierBucket;
	ui.modifierbucket.render(true);
});
