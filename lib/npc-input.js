import { GURPS } from "../module/gurps.js";
import { GurpsActor } from "../module/actor.js";

export class NpcInput extends FormApplication {
	
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "sheet", "actor"],
      template: "systems/gurps/templates/npc-input.html",
      width: 900,
      height: 600,
			minimizable: true,
			resizable: true,
    });
	}
	
	getData(options) {
		let data = super.getData(options);
		if (!data.data) data.data = new GurpsActor();
		return data;
	}

  getTitle() {
    return "Mook's extra special NPC creator";
  }

	activateListeners(html) {
	  super.activateListeners(html);
	}
	
	async _updateObject(event, formData) {
    console.log("A subclass of the FormApplication must implement the _updateObject method.");
  }
	
}