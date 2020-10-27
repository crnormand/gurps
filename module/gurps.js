// Import Modules
import { GURPS } from "./config.js";
import { GurpsActor } from "./actor.js";
import { GurpsItem } from "./item.js";
import { GurpsItemSheet } from "./item-sheet.js";
import { GurpsActorSheet } from "./actor-sheet.js";
import { GurpsActorSheet2 } from "./actor-sheet.js";
import { Skill } from "./actor.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`Initializing GURPS 4e System`);

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
  Actors.registerSheet("gurps", GurpsActorSheet2, { makeDefault: false });
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
});
