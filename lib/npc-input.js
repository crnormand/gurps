'use strict'

import { GURPS } from "../module/gurps.js";
import { GurpsActor, Advantage, Skill, Melee, Ranged  } from "../module/actor.js";
import { digitsAndDecimalOnly, digitsOnly } from './jquery-helper.js'

Hooks.on(`renderNpcInput`, (app, html, data) => {
  $(html).find("#npc-input-name").focus();
});

export class NpcInput extends Application {
	
  constructor(actor, options = {}) {
	  super(options);
		this.mook = new Mook();
  }
	
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['boilerplate', 'sheet', 'actor'],
      id: 'npc-input',
      template: 'systems/gurps/templates/npc-input.html',
      resizable: true,
      minimizable: false,
      width: 800,
      height: 700,
      title: 'Mook Generator'
    });
  }	
	getData(options) {
		let data = super.getData(options);
		data.mook = this.mook;
		return data;
	}

	activateListeners(html) {
	  super.activateListeners(html);
 
    html.find(".gcs-input-sm2").inputFilter(value => digitsOnly.test(value))
  	html.find('input[type=text]').on('change paste keyup', (ev) => {
      let el = ev.currentTarget;
  		let k = el.dataset.key;
  		if (!!k) this.mook[k] = el.value;
     })
	
	   html.find('.npc-input-ta').on('change', (ev) => {
      let el = ev.currentTarget;
      let k = el.dataset.key;
      if (!!k) this.mook[k] = el.value;
     })

    html.find('#npc-input-create').on('click keydown focusout', (ev) => {
      if (ev.type == 'click' || (ev.type == 'keydown' && ev.which == 13))
        this.createMook();
      else {
	      ev.preventDefault();
        $(html).find("#npc-input-name").focus();
      }
    });
  }

  // return an array of string representing each line
  prep(text, delim) {
    if (!!delim) {
      const regex = new RegExp(delim, "g");
      text = text.replace(regex, "\n");
    }
    let ans = text.split("\n");
    return ans.map(e => e.trim()).filter(e => e.length > 0);
	}

  // This does all the work ;-)
  createMook() {
    if (this.check()) {
	     a = new GurpsActor();
	  }
    this.render(true);
//    console.log(GURPS.objToString(this.mook));
	}

  check() {
    this.checkTraits();
	  let error = this.checkSkills();
    error = this.checkMelee() || error;
    error = this.checkRanged() || error;
    return !error;
	}
	
	checkSkills() {
  	const m = this.mook;
    const err = "Error:";
    let txt = "";
    let arr = [];
  	this.prep(m.skills, ",").forEach(e => { 
	    if (e.includes(err)) return txt += "\n" + e;
  		const i = e.indexOf("-");
  		if (i < 1) return txt += `\n${e} ${err} missing '-'`;
  		const n = e.substring(0, i).trim();
  		const v = e.substr(i+1).trim();
      if (!v) return txt += `\n${e} ${err} missing skill level`;
  		if (isNaN(v)) return txt += `\n${e} ${err} "${v}" is not a number`;
  	  txt += "\n" + e;
      arr.push(new Skill(n, v));
    });
    m.skills = txt.substr(1);
    m.a_skills = arr;
    return txt.contains(err);
  }

  checkMelee() {
    const m = this.mook;
    const err = "Error:";
    let txt = [];
    let arr = [];
    this.prep(m.melee).forEach(e => { 
      if (e.includes(err)) return txt += "\n" + e;
      let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)?(.*)$/g, "$1~$2~$3~$4~$5~$6~$7~$8");
      if (e == parse) return txt += `\n${e} ${err} unable to parse (level) and damage`;
      parse = parse.split("~");
      arr.push(new Melee(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + parse[7]));
      txt += "\n" + e;    
    });
    m.melee = txt.substr(1);
    m.a_melee = arr;
    return txt.contains(err);
  }

  checkRanged() {
	  const pats = [
      { regex: "(acc|Acc)\\d+", var: "acc" },
      { regex: "(rof|RoF|Rof)\\d+", var: "rof" },
      { regex: "(rcl|Rcl)\\d+", var: "rcl" },
      { regex: "(range|Range)\\d+(\\/\\d+)?", var: "range" }
    ];
    const m = this.mook;
    const err = "Error:";
    let txt = [];
    let arr = [];
    this.prep(m.ranged).forEach(e => { 
      if (e.includes(err)) return txt += "\n" + e;
      let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)?( \w+)(.*)/g, "$1~$2~$3~$4~$5~$6~$7~$8~$9");
      if (e == parse) return txt += `\n${e} ${err} unable to parse (level) and damage`;
      parse = parse.split("~");
      let r = new Ranged(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + parse[7]);
      let ext = parse[8].trim().replace(/ +/g, " ").split(" ");
      if (ext.length % 2 != 0) return txt += `\n${e} ${err} unable to parse "${parse[8]}"`;
      for (let i = 0; i < ext.length; i += 2) {
	      let s = ext[i] + ext[i+1];
        pats.forEach(p => {
	         if (s.match(new RegExp(p.regex))) r[p.var] = ext[i+1];
	      });
	    }
      txt += "\n" + e;    
      arr.push(r);
    });
    m.ranged = txt.substr(1);
    m.a_ranged = arr;
    return txt.contains(err);
  }


  checkTraits() {
    const m = this.mook;
    let txt = [];
    let arr = [];
    this.prep(m.traits, ";").forEach(e => { 
      arr.push(new Advantage(e));
      txt += "\n" + e;
    });
    m.traits = txt.substr(1);
    m.a_traits = arr;
  }
}


class Mook {
	constructor() {
		this.name = "";
		this.title = "bad guy";
		this.desc = "appearence";
		this.st = 10;
		this.dx = 10;
		this.iq = 10;
		this.ht = 10;
		this.dodge = 9;
		this.hp = 10;
		this.will = 10;
		this.per = 10;
		this.fp = 10;
		this.speed = 5;
		this.move = 5;
		this.sm = 0;
		this.dr = 1;
		this.notes = `Joe will sell you anything, for a price.   He likes the ladies... but they don't like him.
[+2 Reactions towards Women] / [-2 Reactions from Women]`;
    this.traits = `Ugly [-4 from everyone]
High Pain Threshold; Annoying`;
    this.skills = `Barter-14
Search-13,Lockpicking-11`;
    this.melee = `Punch (12) 1d-2 cr
Kick (11) 1d cr`;
    this.ranged = `Slingshot (9) 1d-3 imp rof 2 rcl 2 `;
	}
	
}