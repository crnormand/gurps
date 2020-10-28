// Import Modules
import { GURPS } from "./config.js";
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
	console.log(GURPS.ModifierBucket);
	ui.modifierbucket = GURPS.ModifierBucket;
	ui.modifierbucket.render(true);
});
