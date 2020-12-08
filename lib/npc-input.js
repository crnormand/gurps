'use strict'

import { GURPS } from "../module/gurps.js";
import { GurpsActor, Advantage, Skill, Melee, Ranged, HitLocation, Encumbrance, Note } from "../module/actor.js";
import { digitsAndDecimalOnly, digitsOnly } from './jquery-helper.js'

Hooks.on(`renderNpcInput`, (app, html, data) => {
  $(html).find("#npc-input-name").focus();
});

Hooks.once("ready", () => { new NpcInput().render(true) });

const COMMENT_CHAR = "#";
const ERR = "???:";

// Keys we might see during attribute parsing, and whether we should skip them when looking for data
const ADDITIONAL_ATTRIBUTE_KEYS =  {
	"basic": true,
	"speed": false, 
	"move": false, 
	"dodge": false, 
	"sm": false, 
	"parry": false, 
	"block": false, 
	"dr": false, 
	"damage": false, 
	"bl": false, 
	"fright": true, 
	"check": false, 
	"height": false, 
	"weight": false, 
	"age": false,
	"attributes": true,
	"secondary": true,
	"characteristics": true,
	"dmg": false,
	"hp": false,
	"fp": false,
};

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
        this.createMook(ev);
      else {
	      ev.preventDefault();
        $(html).find("#npc-input-name").focus();
      }
    });
    html.find('#npc-input-import').on('click keydown', (ev) => {
      if (ev.type == 'click' || (ev.type == 'keydown' && ev.which == 13))
        this.importStatBlock(ev);
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

	async importStatBlock(ev) {
		ev.preventDefault();
		let self = this;
		
		let d = new Dialog({
      title: `Import Stat Block`,
      content: await renderTemplate("systems/gurps/templates/import-stat-block.html"),
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import",
          callback: html => {
            let ta = html.find("#npc-input-import-ta")[0];
						this.parseStatBlock(ta.value);
						self.render(true);
          }
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: false
    }, {
      width: 800,
			height: 800
    });
		d.render(true);
	}

  async createMook(ev) {
		ev.preventDefault();
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
		if (!!m.check) data.frightcheck = m.check;		// Imported "fright check"

    data.hearing = m.per;
    data.tastesmell = m.per;
    data.touch = m.per;
    data.vision = m.per;
		if (!!m.parry) data.parry = m.parry;

    let ns = {};
    let nt = new Note(m.notes.trim());
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
    if (!!m.sm) ts.sizemod = (m.sm[0] == "-") ? m.sm : "+" + m.sm;
    ts.appearance = m.desc;
		ts.height = m.height;
		ts.weight = m.weight;
		ts.age = m.age;

    let skills = {};
    m.a_skills.forEach(s => game.GURPS.put(skills, s));

    let ads = {};
    m.a_traits.forEach(a => game.GURPS.put(ads, a));

		let swng = m.damage || m.dmg || "";

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
      "data.parry": data.parry,
      "data.notes": ns,
      "data.hitlocations": hls,
      "data.encumbrance": es,
      "data.melee": melee,
      "data.ranged": ranged,
      "data.traits": ts,
      "data.skills": skills,
      "data.ads": ads,
			"data.swing": swng
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
    let txt = "";
    let arr = [];
  	this.prep(m.skills, ";").forEach(e => { 
	    if (e.includes(ERR)) return;
  	  txt += "\n" + e;
 			if (e.startsWith(COMMENT_CHAR)) {
				if (arr.length > 0) 
					this.addToNotes(arr, e.substr(1), " ");
				return;
			}
  		const i = e.indexOf("-");
  		if (i < 1) return txt += `\n${ERR} missing '-'`;
  		const n = e.substring(0, i).trim();
  		const v = e.substr(i+1).trim();
      if (!v) return txt += `\n${ERR} missing skill level`;
  		if (isNaN(v)) return txt += `\n${ERR} "${v}" is not a number`;
      arr.push(new Skill(n, v));
    });
    m.skills = txt.substr(1);
    m.a_skills = arr;
    return txt.includes(ERR);
  }

  checkMelee() {
    const pats = [
      { regex: "(^usage|^Usage|^mode|^Mode)\\w+", var: "mode" },
      { regex: "(^parry|^Parry)\\d+", var: "parry" },
      { regex: "(^reach|^Reach)[\\w,]+", var: "reach" },
      { regex: "(^st|^ST|^St)\\d+", var: "st" },
      { regex: "(^block|^Block)\\d+", var: "block" }
    ];
    const m = this.mook;
    let txt = "";
    let arr = [];
    this.prep(m.melee).forEach(e => { 
      if (e.includes(ERR)) return;
      txt += "\n" + e;    
 			if (e.startsWith(COMMENT_CHAR)) {
				if (arr.length > 0) 
					this.addToNotes(arr, e.substr(1), " ");
				return;
			}
      let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d6?([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)? ?(\w+)(.*)$/g, "$1~$2~$3~$4~$5~$6~$7~$8~$9");
      if (e == parse) return txt += `\n${ERR} unable to parse (level) and damage`;
      parse = parse.split("~");
      let me = new Melee(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + " " + parse[7]);
      if (!!parse[8]) {
        let ext = parse[8].trim().replace(/ +/g, " ").split(" ");
        if (ext.length % 2 != 0) return txt += `\n${ERR} unable to parse "${parse[8]}"`;
        for (let i = 0; i < ext.length; i += 2) {
          let s = ext[i] + ext[i+1];
          let found = false;
          pats.forEach(p => {
             if (s.match(new RegExp(p.regex))) {
  	           me[p.var] = ext[i+1];
               found = true;
             }
          });
          if (!found) return txt += `\n${ERR} unknown pattern "${ext[i]} ${ext[i+1]}"`;
        }
      }
      arr.push(me);
    });
    m.melee = txt.substr(1);
    m.a_melee = arr;
    return txt.includes(ERR);
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
      { regex: "^halfd\\d+", var: "halfd" },
      { regex: "^max\\d+", var: "max" },
    ];
    const m = this.mook;
    let txt = "";
    let arr = [];
    this.prep(m.ranged).forEach(e => { 
      if (e.includes(ERR)) return;
      txt += "\n" + e;    
 			if (e.startsWith(COMMENT_CHAR)) {
				if (arr.length > 0) 
					this.addToNotes(arr, e.substr(1), " ");
				return;
			}
      let parse = e.replace(/(.*) ?\((\d+)\) (\d+)d6?([-+]\d+)?([xX\*]\d+)?(\([.\d]+\))?(!)? ?(\w+)(.*)/g, "$1~$2~$3~$4~$5~$6~$7~$8~$9");
      if (e == parse) return txt += `\n${ERR} unable to parse (level) and damage`;
      parse = parse.split("~");
      let r = new Ranged(parse[0].trim(), parse[1], parse[2] + "d" + parse[3] + parse[4] + parse[5] + parse[6] + " " + parse[7]);
      if (!!parse[8]) {
        let ext = parse[8].trim().replace(/ +/g, " ").split(" ");
        if (ext.length % 2 != 0) return txt += `\n${ERR} unable to parse for `;
        for (let i = 0; i < ext.length; i += 2) {
  	      let s = ext[i] + ext[i+1];
          let found = false;
          pats.forEach(p => {
  	         if (s.match(new RegExp(p.regex))) {
               r[p.var] = ext[i+1];
               found = true;
             }
  	      });
          if (!found) return txt += `\n${ERR} unknown pattern "${ext[i]} ${ext[i+1]}"`;
  	    }
      }
			r.checkRange();
      arr.push(r);
    });
    m.ranged = txt.substr(1);
    m.a_ranged = arr;
    return txt.includes(ERR);
  }

	addToNotes(arr, note, delim) {
		let n = arr[arr.length-1].notes;   
		if (!!n) 
			n += delim + note;
		else 
			n = note;
		arr[arr.length-1].notes = n;
	}


  checkTraits() {
    const m = this.mook;
    let txt = "";
    let arr = [];
    this.prep(m.traits, ";").forEach(e => { 
      txt += "\n" + e;
 			if (e.startsWith(COMMENT_CHAR)) {
				if (arr.length > 0) 
					this.addToNotes(arr, e.substr(1), "\n");
				return;
			}
      arr.push(new Advantage(e));
     });
    m.traits = txt.substr(1);
    m.a_traits = arr;
    return false;
  }

  parseStatBlock(txt) {
	  this.statblk = txt.replace(/ +/g, " ");  // remove multiple spaces in a row
		console.log(this.statblk);
		try {
			this.resetMook();
			this.checkForNameNotes();
    	this.parseAttrs();
			this.parseAttacks();
			this.parseTraits();
			this.parseSkills();
			this.parseFinalNotes();
			this.parseAttacks(true);
		} catch (e) {
			console.log(e);
			ui.notifications.warn(e);
		}
			
	}
	
	resetMook() {
		this.mook.name = "";
		this.mook.notes = "";
		this.mook.melee = "";
		this.mook.ranged = "";
	 	this.mook.traits = "";
		this.mook.skills = "";
	}
	
	gatherAttackLines(attblk, currentline, oldformat) {// read lines looking for (\d+) and any lines following that do NOT have (\d+)
		if (oldformat) return [attblk, currentline, this.nextToken() ];
		var nextline;
		[attblk, nextline] = this.nextTokenPrim(attblk, "\n", false, true);	
		while (!!nextline && (nextline.match(/[Ss]hots.*\(\d+\)/) || !nextline.match(/\(\d+\)/))) {			// If the new line doesn't contain a skill level "(\d+)" that isn't part of [Ss]hots assume it is still from the previous attack
		  currentline += " " + nextline;
			[attblk, nextline] = this.nextTokenPrim(attblk, "\n", false, true);	
		}
		return [attblk, currentline, nextline];
	}
	
	parseSkills() {
		let line = this.nextToken("\n", false, true).trim();
		let skills = "";
		while(!!line && line.match(/[^-]+-\d+/)) {
			skills += " " + this.cleanLine(line);
			line = this.nextToken("\n", false, true);
		}
		if (!skills) this.appendToNotes("?? No skills matching pattern 'skill-lvl' found");
		skills = this.cleanLine(skills);
		var l;
		while (!!skills) {
				[skills, l] = this.nextTokenPrim(skills, ";", false, true);	 	// Start it off reading the first line
				l = this.cleanLine(l).replace(/ ?\[-?\d+\] ?/, " ");		// Remove points costs [20]

				let m = l.match(/([^-]+-\d+)(.*)/);
				if (m) {
					this.mook.skills += "\n" + m[1];
					if (!!m[2])
						this.mook.skills += "\n" + COMMENT_CHAR + m[2];
				} else 
					this.mook.skills += "\n" + COMMENT_CHAR + "Unknown skill pattern '" + l + "'";
		}
		if (!!line) this.pushToken(line);
	}
	
	parseTraits() {
		this.peekskipto("\nAdvantages:");
		let trblk = this.nextToken("Skills:", false, true);
		if (!trblk) return this.appendToNotes("?? Looking for Traits block, unable to find 'Skills:' after Attack block");
		trblk = this.cleanLine(trblk);
		let traits = "";
		trblk.replace(/\n/g," ").split(";").forEach(t => {
			t = t.trim().replace(/ ?\[-?\d+\],?.? ?/, " ");		// Remove points costs [20], [20].
			let m = t.match(/(.*)\((\d+)\)/);
			if (!!m) 
				traits += `\n[CR: ${m[2]} ${m[1].trim()}]`;		// Special handling for CR rolls
			else
				traits += "\n" + t;
		});
	  this.mook.traits = traits;
	}
	
		
	parseAttacks(oldformat = false) {
	  const rpats = [
      { regex: " [Aa]cc *(\\d+) ?,?", var: "acc" },
      { regex: " [Rr]o[Ff] *(\\d+) ?,?", var: "rof" },
      { regex: " [Rr]cl *(\\d+) ?,?", var: "rcl" },
      { regex: " 1\\/2[Dd] *(\\d+) ?,?", var: "halfd" },
      { regex: " [Mm]ax *(\\d+) ?,?", var: "max" },
      { regex: " [Ss]hots *([\\w\\)\\(]+) ?,?", var: "shots" },
      { regex: " [Bb]ulk *([\\w-]+) ?,?", var: "bulk" },
      { regex: " [Ss][Tt] *(\\d+) ?,?", var: "st" },
      { regex: " ?[Rr]anged,? *with ?", var: "" },
      { regex: " ?[Rr]anged,?", var: "" },
      { regex: " ?[Rr]ange ([0-9\/]+) *,?", var: "range" },
    ];
		var attblk;
		if (oldformat) {
			attblk = this.statblk;
			if (!attblk) return;
		} else {
			attblk = this.nextToken("Traits:", "Advantages/Disadvantages:");		// Look for either as start of ads/disads
			if (!attblk) {
				if (!this.peek("\nWeapons:")) this.mook.melee= COMMENT_CHAR + "No attacks found";		// If Weapons aren't listedt later, show error.
			}
		}
		// assume a line is an attack if it contains '(n)'
		let line, nextline;
		[attblk, line] = this.nextTokenPrim(attblk.trim(), "\n", false, true);	 	// Start it off reading the first line

		[attblk, line, nextline] = this.gatherAttackLines(attblk, line, oldformat);	// collect up any more lines.

		while (!!line) {
			save = line;
			line = this.cleanLine(line);
			var name, lvl, dmg, save;
			[line, name] = this.nextTokenPrim(line, "(", false);	
			if (!name)  return this.mook.melee += `${COMMENT_CHAR}No attacks found, "${save}" `;
			name = name.trim();
			[line, lvl] = this.nextTokenPrim(line, ")", "):");	
			if (!lvl || isNaN(lvl)) return this.mook.melee += `${COMMENT_CHAR}No attack level or level is not a number "${save}"`;
			[line, dmg] = this.nextTokenPrim(line, ".", ",", true);		// find up to . or , or end of string	
			let savedmg1 = dmg;
			let note = "";
			[dmg, note] = this.mapDmg(line, dmg);
			if (!!dmg && !!note) note = "\n" + COMMENT_CHAR + this.cleanLine(note);
			if (!dmg) {		// If not dmg formula, try one more time.
				[line, dmg] = this.nextTokenPrim(line, ".", ",", true);		// find up to . or , or end of string	
				let savedmg2 = dmg;
				[dmg, note] = this.mapDmg(line, dmg);
				if (!dmg) {
					line = savedmg1 + " " + savedmg2 + " " + note;				// Nope, couldn't find anything, so reset the line
					note = "";
				} else 
					if (!!note) note = "\n" + COMMENT_CHAR + this.cleanLine(note);
			}					
			let regex = /.*[Rr]each (?<reach>[^, \.]+)/g 
			let result = regex.exec(line);
			let extra = "";
			let final = "";
			if (!!result?.groups?.reach) {		// If it has Reach, it is definitely melee
				extra = " reach " + result.groups.reach.replace(/ /g,"");
				line = this.cleanLine(line.replace(/[Rr]each [^, \.]+/, ""));
				if (!!line) note += "\n" + COMMENT_CHAR + line;
				final = "\n" + name + " (" + lvl + ") " + dmg + extra;
				this.mook.melee += final + note;
			} else {
				let ranged = [];
				rpats.forEach(p => {
					let re = new RegExp(p.regex);
	  	    let match = line.match(re);
					if (!!match) {
						line = line.replace(re, "").trim();
						if (!!match[1]) 
							ranged.push(p.var + " " + match[1]);
					}
	  	  });
				if (ranged.length > 0) {
					extra = ranged.join(" ");
					final = "\n" + name + " (" + lvl + ") " + dmg + " " + extra;
					if (!!line) note += "\n" + COMMENT_CHAR + line;
					this.mook.ranged += final + note;				
							
				} else {	// but it may not have either, in which case we treat as melee
					final = "\n" + name + " (" + lvl + ") " + dmg + extra;
					this.mook.melee += final + note;
				}
			}
			[attblk, line, nextline] = this.gatherAttackLines(attblk, nextline, oldformat);	// collect up any more lines.
		}
	}
	
	mapDmg(line, dmg) {
		if (!dmg) return [ "", "" ];
		dmg = dmg.trim().toLowerCase()
		let p = GURPS.parseDmg(dmg);
		if (p == dmg) return [ "", line ];
		let a = p.split("~");
		let roll = a[0] + "d" + a[1] + a[2] + a[3] + a[4];
		let types = a[5].trim().split(" ")
		let m = GURPS.damageTypeMap[types[0]]
		if (!m) return [ "", `Unrecognized damage type "${types[0]}" for "${line}"` ];
		return [ roll + " " + m, types.slice(1).join(" ") ];
	}
	
	appendToNotes(t) {
		this.mook.notes += "\n" + t;
	}
	
	// If the first line does not contain a ":" (or "ST "), then it probably is not the start of the stat block
	checkForNameNotes() {
		let line = this.nextToken("\n");
		let oldregex = /ST.*DX.*IQ.*HT/
		if (line.includes(":") || line.match(oldregex)) return this.pushToken(line);
		
		// if the first line has 2 or fewer spaces, assume that it is a name.   Just guessing here
		let notes = "";
		if ((line.match(/ /g)||[]).length < 3) 	
			this.mook.name = line;
		else
			this.appendToNotes(line);
		line = this.nextToken("\n");
		while (((line.match(/:/g)||[]).length < 2) && !line.match(oldregex)) {		// Has at least 2 ":" and doesn't match the old style 
			this.appendToNotes(line);
			line = this.nextToken("\n");
		}
		if (!!line) this.pushToken(line);
	}
	
	parseFinalNotes() {
		let postProcessWeapons = this.stealahead("\Weapons:");
		let t = this.nextToken();
		if (!!t) {
			this.appendToNotes("");
			if (t == "Class:") {
				this.appendToNotes(t + " " + this.nextToken("\n"));
				return this.parseFinalNotes();
			}
			if (t == "Notes:")
				this.appendToNotes(this.statblk);
			else
				this.appendToNotes(t + " " + this.statblk);
		}
			
		this.mook.notes = this.mook.notes.trim();
		
		this.statblk = postProcessWeapons;
	}
	
	pushToken(t) {
		this.statblk = t + "\n" + this.statblk;
	}
	
	isAttribute(a) {
		if (!a) return false;
		if (a == "Traits:" || a == "Advantages/Disadvantages:") return false;
		if (a.match(/\w+:/) || !!GURPS.attributepaths[a]) return true;
		if (a.match(/\[\d+\],?/)) return true;		// points costs [20
		return ADDITIONAL_ATTRIBUTE_KEYS.hasOwnProperty(a.toLowerCase());
	}
	
	getAttrib(t) {
		if (t.match(/\[\d+\],?/)) return "";		// points costs [20]
		let a = t.replace(/[^A-Za-z]/g, "");
		// Special case is attributes are listed as "basic speed" or "fright check"
		let l = a.toLowerCase();
		if (!!ADDITIONAL_ATTRIBUTE_KEYS[a.toLowerCase()]) return "";
		return a;
	}
	
	storeAttrib(attrib, value) {
		value = value.replace(/[^0-9\.]/g,"");		// strip off any non-numbers
		attrib.toLowerCase().split("/").forEach(a => this.mook[a] = value);	// handles cases like "Parry/Block: 9"
	}
	
	parseAttrs() {
		var attr, val;
		let done = false;
		let any = false;
		let line = this.nextToken("\n");
		while (!done) {
			done = true;
			any = false;
			[line, attr] = this.nextTokenPrim(line, " ", false, true);
			while(this.isAttribute(attr)) {
				any = true;
				attr = this.getAttrib(attr);
				if (!!attr) {
					done = false;
					[line, val] = this.nextTokenPrim(line, " ", false, true);
					if (!line && !val) {
						line = this.nextToken("\n");
						[line, val] = this.nextTokenPrim(line, " ", false, true);
					}
					this.storeAttrib(attr, val);
				}
				if (!line) {
					line = this.nextToken("\n");
					attr = "";
					done = false;
				} else
					[line, attr] = this.nextTokenPrim(line, " ", false, true);
			}
			if (!!any && !!attr) {	// we parse somethings, but something didnt work.   Note it and get the next line.
				this.appendToNotes("?? " + attr + " " + line);
				line = this.nextToken("\n");
			}
		}
		if (!!line) this.pushToken(attr + " " + line);		// We didn't finish paring the line, so put it back
	}
	
	stealahead(str) {
		let i = this.statblk.indexOf(str);
		if (i < 0) return "";
		let s = this.statblk.substr(i + str.length + 1);
		this.statblk = this.statblk.substring(0, 1);
		return s;
	}
	
	peek(str) {
		return this.statblk.includes(str);
	}
	
	peekskipto(str) {
		if (this.peek(str)) this.nextToken(str, false);
	}
	
	nextToken(d1 = " ", d2 = "\n") {
		let [s, t] = this.nextTokenPrim(this.statblk, d1, d2);
		this.statblk = s;
    return t;
	}
 	
	nextTokenPrim(str, d1 = " ", d2 = "\n", all = false) {  // d2 must be equal or longer in length than d1  ")" and "):"
		if (!str) return [str, undefined];
	  let i = str.indexOf(d1);
		let j = str.indexOf(d2);
    if (i > 0 && j > 0) {
			if (j <= i) {
				d1 = d2;	// 
				i = j;	// Crappy hack to be able to search for 2 delims
			}
	    let t = str.substring(0, i);
			return [str.substr(i + d1.length), t];
		}
		if (i > 0 ) {
	    let t = str.substring(0, i);
			return [str.substr(i + d1.length), t];		
		}
		if (j > 0 ) {
	    let t = str.substring(0, j);
			return [str.substr(j + d2.length), t];		
		}
		return (all) ? ["", str] : [str, undefined];
 	}

	cleanLine(line) {
		let start = line;
		if (!line) return line;
		if (line[0] == ".") line = line.substr(1);
	  if (line[line.length-1] == ".") line = line.substring(0, line.length-1);
		line = line.trim();
		return (start == line) ? line : this.cleanLine(line);	
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
		this.parry = 9;
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
Search-13;Lockpicking-11`;
    this.melee = `Punch (12) 1d-2 cr
Kick (11) 1d cr`;
    this.ranged = `Slingshot (9) 1d-3 imp acc 2`;
	}
	
}