'use strict'

import { GURPS } from "../module/gurps.js";
import { GurpsActor, Advantage, Skill, Melee, Ranged, HitLocation, Encumbrance, Note } from "../module/actor.js";
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
      classes: ['npc-input', 'sheet', 'actor'],
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
  async createMook() {
    if (this.check()) {
	    let data = { name: this.mook.name, type: "character" };
	    let a = await GurpsActor.create(data, {renderSheet: false});
      await this.populate(a);
      await a.setFlag("core", "sheetClass", "gurps.GurpsActorNpcSheet");
      a.sheet.render(true);
	  } else
      ui.notifications.warn("Unable to create Mook");
    this.render(true);
	}
	
	async populate(a) {
		let m = this.mook;
		let data = a.data.data;
    let att = data.attributes;
    att.ST.value = m.st;
    att.DX.value = m.dx;
    att.IQ.value = m.iq;
    att.HT.value = m.ht;
    att.WILL.value = m.will;
    att.PER.value = m.per;
   
    data.HP.max = m.hp;
    data.HP.value = m.hp;
    data.FP.max = m.fp;
    data.FP.value = m.fp;
    
    data.basicmove.value = m.move;
    data.basicspeed.value = m.speed;
    data.currentmove = m.move;
    data.frightcheck = m.will;

    data.hearing = m.per;
    data.tastesmell = m.per;
    data.touch = m.per;
    data.vision = m.per;

    let ns = {};
    let nt = new Note(m.notes);
    GURPS.put(ns, nt);

    let hls = data.hitlocations;
    let hl = Object.values(hls).find(h => h.penalty == 0);
    hl.dr = m.dr;

    let es = {};
    let e = new Encumbrance();
    e.level = 0;
    e.current = true;
    e.key = "enc0";
    e.move = m.move;
    e.dodge = m.dodge;
    game.GURPS.put(es, e);


    let melee = {};
    m.a_melee.forEach(me => game.GURPS.put(melee, me));

    let ranged = {};
    m.a_ranged.forEach(r => game.GURPS.put(ranged, r));
   
    let ts = {};
    ts.title = m.title;
    let dt = (new Date()).toString().split(' ').splice(1,3).join(' ');
    ts.createdon = dt;
//    ts.modifiedon = dt;
    if (!!m.sm) ts.sizemod = (m.sm[0] == "-") ? m.sm : "+" + m.sm;
    ts.appearance = m.desc;

    let skills = {};
    m.a_skills.forEach(s => game.GURPS.put(skills, s));

    let ads = {};
    m.a_traits.forEach(a => game.GURPS.put(ads, a));

    let commit =  {
      "data.attributes": att,
      "data.HP": data.HP,
      "data.FP": data.FP,
      "data.basicmove": data.basicmove,
      "data.basicspeed": data.basicspeed,
      "data.currentmove": data.currentmove,
      "data.frightcheck": data.frightcheck,
      "data.hearing": data.hearing,
      "data.tastesmell": data.tastesmell,
      "data.touch": data.touch,
      "data.vision": data.vision,
      "data.notes": ns,
      "data.hitlocations": hls,
      "data.encumbrance": es,
      "data.melee": melee,
      "data.ranged": ranged,
      "data.traits": ts,
      "data.skills": skills,
      "data.ads": ads,
   };

    await a.update(commit);
    console.log("Created Mook:");  
    console.log(a);
	}

  check() {
	  let error = !this.mook.name;
    error = this.checkTraits() || error;
	  error = this.checkSkills() || error;
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
    return txt.includes(err);
  }

  checkMelee() {
    const pats = [
      { regex: "(^reach|^Reach)\\d+", var: "reach" },
      { regex: "(^usage|^Usage|^mode|^Mode)\\w+", var: "mode" },
      { regex: "(^parry|^Parry)\\d+", var: "parry" },
      { regex: "(^reach|^Reach)[\\w,]+", var: "reach" },
      { regex: "(^st|^ST|^St)\\d+", var: "st" },
      { regex: "(^block|^Block)\\d+", var: "block" }
    ];
    const m = this.mook;
    const err = "Error:";
    let txt = [];
    let arr = [];
    this.prep(m.melee).forEach(e => { 
      if (e.includes(err)) return txt += "\n" + e;
      let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)? ?(\w+)(.*)$/g, "$1~$2~$3~$4~$5~$6~$7~$8~$9");
      if (e == parse) return txt += `\n${e} ${err} unable to parse (level) and damage`;
      parse = parse.split("~");
      let me = new Melee(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + " " + parse[7]);
      if (!!parse[8]) {
        let ext = parse[8].trim().replace(/ +/g, " ").split(" ");
        if (ext.length % 2 != 0) return txt += `\n${e} ${err} unable to parse "${parse[8]}"`;
        for (let i = 0; i < ext.length; i += 2) {
          let s = ext[i] + ext[i+1];
          let found = false;
          pats.forEach(p => {
             if (s.match(new RegExp(p.regex))) {
  	           me[p.var] = ext[i+1];
               found = true;
             }
          });
          if (!found) return txt += `\n${e} ${err} unknown pattern "${ext[i]} ${ext[i+1]}"`;
        }
      }
      arr.push(me);
      txt += "\n" + e;    
    });
    m.melee = txt.substr(1);
    m.a_melee = arr;
    return txt.includes(err);
  }

  checkRanged() {
	  const pats = [
      { regex: "(^acc|^Acc)\\d+", var: "acc" },
      { regex: "(^rof|^RoF|^Rof)\\d+", var: "rof" },
      { regex: "(^rcl|^Rcl)\\d+", var: "rcl" },
      { regex: "(^usage|^Usage|^mode|^Mode)\\w+", var: "mode" },
      { regex: "(^range|^Range)\\d+(\\/\\d+)?", var: "range" },
      { regex: "(^shots|^Shots)[\\w\\)\\(]+", var: "shots" },
      { regex: "(^bulk|^Bulk)[\\w-]+", var: "bulk" },
      { regex: "(^st|^ST|^St)\\d+", var: "st" },
    ];
    const m = this.mook;
    const err = "Error:";
    let txt = [];
    let arr = [];
    this.prep(m.ranged).forEach(e => { 
      if (e.includes(err)) return txt += "\n" + e;
      let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)? ?(\w+)(.*)/g, "$1~$2~$3~$4~$5~$6~$7~$8~$9");
      if (e == parse) return txt += `\n${e} ${err} unable to parse (level) and damage`;
      parse = parse.split("~");
      let r = new Ranged(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + " " + parse[7]);
      if (!!parse[8]) {
        let ext = parse[8].trim().replace(/ +/g, " ").split(" ");
        if (ext.length % 2 != 0) return txt += `\n${e} ${err} unable to parse "${parse[8]}"`;
        for (let i = 0; i < ext.length; i += 2) {
  	      let s = ext[i] + ext[i+1];
          let found = false;
          pats.forEach(p => {
  	         if (s.match(new RegExp(p.regex))) {
               r[p.var] = ext[i+1];
               found = true;
             }
  	      });
          if (!found) return txt += `\n${e} ${err} unknown pattern "${ext[i]} ${ext[i+1]}"`;
  	    }
      }
      txt += "\n" + e;    
      arr.push(r);
    });
    m.ranged = txt.substr(1);
    m.a_ranged = arr;
    return txt.includes(err);
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
    return false;
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
		this.notes = `Notes.   May include On-the-Fly formulas
[IQ to remember something] [Dodge] [+2 Blessed]`;
    this.traits = `Ugly [-4 from everyone]
High Pain Threshold; Annoying`;
    this.skills = `Barter-14
Search-13,Lockpicking-11`;
    this.melee = `Punch (12) 1d-2 cr
Kick (11) 1d cr`;
    this.ranged = `Slingshot (9) 1d-3 imp acc 2`;
	}
	
}