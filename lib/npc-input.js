'use strict'

import { GURPS } from "../module/gurps.js";
import { GurpsActor } from "../module/actor.js";

export class NpcInput extends Application {
	
  constructor(actor, options = {}) {
	  super(options);
		this.actor = getDefaultMook();
  }

	getDefaultMook() {
		let m = new Mook();		
		
		return m;
	}
	
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['boilerplate', 'sheet', 'actor'],
      id: 'npc-input',
      template: 'systems/gurps/templates/npc-input.html',
      resizable: true,
      minimizable: false,
      width: 800,
      height: 600,
      title: 'Mook generator'
    });
  }	
	getData(options) {
		let data = super.getData(options);
		data.actor = this.actor;
		return data;
	}

	activateListeners(html) {
	  super.activateListeners(html);
    let self = this
	}
	

}

class Mook {
	constructor() {
		this.name = "";
		this.title = "";
		this.desc = "";
		this.st = 10;
		this.dx = 10;
		this.iq = 10;
		this.ht = 10;
	}
	
}