export class GurpsActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    return data;
  }

	prepareData() {
		super.prepareData();
	}
		
	// First attempt at import GCS FG XML export data.
	async importFromGCSv1(xml) {
		// need to remove <p> and replace </p> with newlines from "formatted text"
		let x = game.GURPS.cleanUpP(xml);
		x = game.GURPS.xmlTextToJson(x);
		let r = x.root;
		if (!r) {
			ui.notifications.warn("No <root> object found.  Are you importing the correct GCS XML file?");
			return;
		}
			
		// The character object starts here
		let c = r.character;
		if (!c) {
			ui.notifications.warn("Unable to detect the 'character' format.   Most likely you are trying to import the 'npc' format.");
			return;
		}
		let nm = this.textFrom(c.name);
		console.log("Importing '" + nm + "'");
		// this is how you have to update the domain object so that it is synchronized.
		await this.update({"name": nm});

		// This is going to get ugly, so break out various data into different methods
		await this.importAttributesFromCGSv1(c.attributes);
		await this.importSkillsFromGCSv1(c.abilities?.skilllist)
		await this.importTraitsfromGCSv1(c.traits);
		await this.importCombatMeleeFromGCSv1(c.combat?.meleecombatlist);
		await this.importCombatRangedFromGCSv1(c.combat?.rangedcombatlist);
		await this.importSpellsFromGCSv1(c.abilities?.spelllist)
		await this.importAdsFromGCSv1(c.traits?.adslist);
		await this.importDisadsFromGCSv1(c.traits?.disadslist);
		await this.importPowersFromGCSv1(c.abilities?.powerlist);
		await this.importOtherAdsFromGCSv1(c.abilities?.otherlist);
		await this.importEncumbranceFromGCSv1(c.encumbrance);
		await this.importPointTotalsFromGCSv1(c.pointtotals);
		await this.importNotesFromGCSv1(c.notelist);
		await this.importEquipmentFromGCSv1(c.inventorylist);
		await this.importProtectionFromGCSv1(c.combat?.protectionlist);


		console.log("Done importing.  You can inspect the character data below:");
		console.log(this);
	}
	
	// hack to get to private text element created by xml->json method. 
	textFrom(o) {
		if (!o) return "";
		let t = o["#text"];
		if (!!t) t = t.trim();
		return t;
	}
	
	// similar hack to get text as integer.
	intFrom(o) {
		if (!o) return 0;
		return parseInt(o["#text"]);
	}
	
	floatFrom(o) {
		if (!o) return 0;
		return parseFloat(o["#text"]);
	}

		
	async importPointTotalsFromGCSv1(json) {
		if (!json) return;
		
		let i = this.intFrom;
		await this.update({
			"data.totalpoints.attributes": i(json.attributes),
			"data.totalpoints.ads": i(json.ads),
			"data.totalpoints.disads": i(json.disads),
			"data.totalpoints.quirks": i(json.quirks),
			"data.totalpoints.skills": i(json.skills),
			"data.totalpoints.spells": i(json.spells),
			"data.totalpoints.unspent": i(json.unspentpoints),
			"data.totalpoints.total": i(json.totalpoints)
		});
	}
	
	async importNotesFromGCSv1(json) {
		if (!json) return;
		let t= this.textFrom;
		let ns = {};
		let index = 0;
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let n = new Note();
				n.setNotes(t(j.text));
				game.GURPS.put(ns, n, index++);
			}
		}
		await this.update({"data.notes": ns});
	}
	
	async importProtectionFromGCSv1(json) {
		if (!json) return;
		let t= this.textFrom;
		let prot = {};
		let index = 0;
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let hl = new HitLocation();
				hl.where = t(j.location);
				hl.dr = t(j.dr);
				hl.penalty = t(j.db);
				hl.setEquipment(t(j.text));
				game.GURPS.put(prot, hl, index++);
			}
		}
		await this.update({"data.hitlocations": prot});

	}
	
	async importEquipmentFromGCSv1(json) {
		if (!json) return;
		let t = this.textFrom;
		let i = this.intFrom;
		let f = this.floatFrom;
		
		let temp = [];
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let eqt = new Equipment();
				eqt.name = t(j.name);	
				eqt.count = i(j.count);
				eqt.cost = t(j.cost);
				eqt.weight = f(j.weight);
				eqt.location = t(j.location);
				let cstatus = i(j.carried);
				eqt.carried = (cstatus >= 1);
				eqt.equipped = (cstatus == 2);
				eqt.techlevel = t(j.tl);
				eqt.legalityclass = t(j.lc);
				eqt.categories = t(j.type);
				eqt.setNotes(t(j.notes));
				temp.push(eqt);
			}
		}
		
		// Put everything in it container (if found), otherwise at the top level
		temp.forEach(eqt => {
			if (!!eqt.location) {
				let parent = null;
				parent = temp.find(e => e.name === eqt.location);
				if (!!parent)
					game.GURPS.put(parent.contains, eqt);
				else
					eqt.location = "";	// Can't find a parent, so put it in the top list
			}
		});
		
		let equipment = {
			"carried": {},
			"other": {}
		};
		let cindex = 0;
		let oindex = 0;

		temp.forEach(eqt => {
			if (!eqt.location) {
				if (eqt.carried) 
					game.GURPS.put(equipment.carried, eqt, cindex++);
				else
					game.GURPS.put(equipment.other, eqt, oindex++);
			}
		});
		await this.update({ "data.equipment": equipment });
	}
	
	async importEncumbranceFromGCSv1(json) {
		if (!json) return;
		let t= this.textFrom;
		let es = {};
		let index = 0;
		for (let i = 0; i < 5; i++ ) {
			let e = new Encumbrance();
			e.level = i;
			let k = "enc_" + i;
			let c = t(json[k]);
			e.current = (c === "1");
			k = "enc" + i;
			e.key = k;
			let k2 = k + "_weight";
			e.weight = t(json[k2]);
			k2 = k + "_move";
			e.move = t(json[k2]);
			k2 = k + "_dodge";
			e.dodge = t(json[k2]);
			game.GURPS.put(es, e, index++);
		}
		await this.update({"data.encumbrance": es});
	}
	
	async importCombatMeleeFromGCSv1(json) {
		if (!json) return;
		let t = this.textFrom;
		let melee = {};
		let index = 0;
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				for (let k2 in j.meleemodelist) {
					if (k2.startsWith("id-")) {	
						let j2 = j.meleemodelist[k2];
						let m = new Melee();
						m.name = t(j.name);	
						m.st = t(j.st);
						m.weight = t(j.weight);
						m.techlevel = t(j.tl);
						m.cost = t(j.cost);
						try {
							m.setNotes(t(j.text));
						} catch {
							console.log(m);
							console.log(t(j.text));
						}
						m.mode = t(j2.name);
						m.level = t(j2.level);
						m.damage = t(j2.damage);
						m.reach = t(j2.reach);
						m.parry = t(j2.parry);
						game.GURPS.put(melee, m, index++);
					}
				}
			}
		}
		await this.update({"data.melee": melee});	
	}
	
	async importCombatRangedFromGCSv1(json) {
		if (!json) return;
		let t = this.textFrom;
		let ranged = {};
		let index = 0;
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				for (let k2 in j.rangedmodelist) {
					if (k2.startsWith("id-")) {	
						let j2 = j.rangedmodelist[k2];
						let r = new Ranged();
						r.name = t(j.name);	
						r.st = t(j.st);
						r.bulk = t(j.bulk);
						r.legalityclass = t(j.lc);
						r.ammo = t(j.ammo);
						try {
							r.setNotes(t(j.text));
						} catch {
							console.log(m);
							console.log(t(j.text));
						}
						r.mode = t(j2.name);
						r.level = t(j2.level);
						r.damage = t(j2.damage);
						r.acc = t(j2.acc);
						r.rof = t(j2.rof);
						r.shots = t(j2.shots);
						r.rcl = t(j2.rcl);
						game.GURPS.put(ranged, r, index++);
					}
				}
			}
		}
		await this.update({"data.ranged": ranged});	
	
	}
		
	async importTraitsfromGCSv1(json) {
		if (!json) return;
		let t = this.textFrom;
		let ts = {};
		ts.race = t(json.race);
		ts.height = t(json.height);
		ts.weight = t(json.weight);
		ts.age = t(json.age);
		// <appearance type="string">@GENDER, Eyes: @EYES, Hair: @HAIR, Skin: @SKIN</appearance>
		let a = t(json.appearance);
		ts.appearance = a;
		ts.sizemod = t(json.sizemodifier);
		try {
			let x = a.indexOf(", Eyes: ");
			ts.gender = a.substring(0, x);
			let y = a.indexOf(", Hair: ");
			ts.eyes = a.substring(x + 8, y);
			x = a.indexOf(", Skin: ")
			ts.hair = a.substring(y + 8, x);
			ts.skin = a.substr(x + 8);
		} catch {
			console.log("Unable to parse appearance traits for ");
			console.log(this);
		}
		await this.update({
			"data.traits.race": ts.race,
			"data.traits.height": ts.height,
			"data.traits.weight": ts.weight,
			"data.traits.age": ts.age,
			"data.traits.appearance": ts.appearance,
			"data.traits.gender": ts.gender,
			"data.traits.eyes": ts.eyes,
			"data.traits.hair": ts.hair,
			"data.traits.skin": ts.skin
			});
	}

	// Import the <attributes> section of the GCS FG XML file.
	async importAttributesFromCGSv1(json) {
		if (!json) return;
		let i = this.intFrom;		// shortcut to make code smaller
		let t = this.textFrom;
		let data = this.data.data;
		let att = data.attributes;
		att.ST.value = i(json.strength);
		att.ST.points = i(json.strength_points);
		att.DX.value = i(json.dexterity);
		att.DX.points = i(json.dexterity_points);
		att.IQ.value = i(json.intelligence);
		att.IQ.points = i(json.intelligence_points);
		att.HT.value = i(json.health);
		att.HT.points = i(json.health_points);
		att.WILL.value = i(json.will);
		att.WILL.points = i(json.will_points);
		att.PER.value = i(json.perception);
		att.PER.points = i(json.perception_points);
		await this.update({"data.attributes": att});
		
		data.HP.max = i(json.hitpoints);
		data.HP.points = i(json.hitpoints_points);
		data.HP.value = i(json.hps);
		data.FP.max = i(json.fatiguepoints);
		data.FP.points = i(json.fatiguepoints_points);
		data.FP.value = i(json.fps);

		let lm = {};
		lm.basiclift = t(json.basiclift);
		
		data.basicmove.value = i(json.basicmove);
		data.basicmove.points = i(json.basicmove_points);
		data.basicspeed.value = i(json.basicspeed);
		data.basicspeed.points = i(json.basicspeed_points);
		data.thrust = t(json.thrust);
		data.swing = t(json.swing);
		data.currentmove = t(json.move);
	
		// Instead of updating the whole "data" object, we can pass in subsets
		await this.update({
			"data.HP": data.HP,
			"data.FP": data.FP,
			"data.basiclift": data.basiclift,
			"data.basicmove": data.basicmove,
			"data.basicspeed": data.basicspeed,
			"data.thrust": data.thrust,
			"data.swing": data.swing,
			"data.currentmove": data.currentmove,
			"data.liftingmoving": lm
			});
	}

	// create/update the skills.   
	// NOTE:  For the update to work correctly, no two skills can have the same name.
	// When reading data, use "this.data.data.skills", however, when updating, use "data.skills".
	async importSkillsFromGCSv1(json) {
		if (!json) return;
		let skills = {};
		let index = 0;
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let sk = new Skill();
				sk.name = t(j.name);	
				sk.type = t(j.type);
				sk.level = this.intFrom(j.level);
				sk.points = this.intFrom(j.points);
				sk.relativelevel = t(j.relativelevel);
				try {
				sk.setNotes(t(j.text));
				} catch {
					console.log(sk);
					console.log(t(j.text));
				}
				game.GURPS.put(skills, sk, index++);
			}
		}
		await this.update({"data.skills": skills});
	}
	
		// create/update the spells.   
	// NOTE:  For the update to work correctly, no two spells can have the same name.
	// When reading data, use "this.data.data.spells", however, when updating, use "data.spells".
	async importSpellsFromGCSv1(json) {
		if (!json) return;
		let spells = {};
		let index = 0;
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let sp = new Spell();
				sp.name = t(j.name);			
				sp.class = t(j.class);
				sp.college = t(j.college);
				let cm = t(j.costmaintain);
				let i = cm.indexOf('/');
				if (i >= 0) {
					sp.cost = cm.substring(0, i);
					sp.maintain = cm.substr(i+1);
				} else {
					sp.cost = cm;
				}
				sp.duration = t(j.duration);
				sp.points = t(j.points);
				sp.casttime = t(j.time);	
				sp.level = parseInt(t(j.level));
				sp.duration = t(j.duration);
				sp.setNotes(t(j.text));
				game.GURPS.put(spells, sp, index++);
			}
		}
		await this.update({"data.spells": spells});
	}
	
	
	/* For the following methods, I could not figure out how to use the update location
		"data.powers", "data.ads" as a variable (so I could pass it into the
		importBaseAdvantagesFromGCSv1() method.   So instead, I did the update()
		in these methods with the string literal.
	*/
	async importPowersFromGCSv1(json) {
		if (!json) return;
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.powers": list});
	}
	
	async importAdsFromGCSv1(json) {
		if (!json) return;
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.ads": list});
	}

	async importDisadsFromGCSv1(json) {
		if (!json) return;
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.disads": list});
	}

	async importOtherAdsFromGCSv1(json) {
		if (!json) return;
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.otherads": list});
	}

	importBaseAdvantagesFromGCSv1(json) {
		let datalist = {};
		let index = 0;
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let a = new Advantage();
				a.name = t(j.name);		
				a.points = this.intFrom(j.points);
				a.setNotes(t(j.text));
				game.GURPS.put(datalist, a, index++);
			}
		}
		return datalist;
	}
}

export class Named {
	name = "";
	notes = "";
	pageref = "";
	
	// This is an ugly hack to parse the GCS FG Formatted Text entries.   See the method cleanUpP() above.
	setNotes(n) {
		if (!!n) {
			let v = game.GURPS.extractP(n);
			let k = "Page Ref: ";
			let i = v.indexOf(k);
			if (i >= 0) {
				this.notes = v.substr(0, i).trim();
				// Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
				this.pageref = v.substr(i+k.length).trim();
			} else {
				this.notes = v.trim();
				this.pageref = "";
			}
		}
	}
}

export class NamedCost extends Named {
		points = 0;
}

export class Leveled extends NamedCost {
	level = 1;
}

export class Skill extends Leveled {
	type = "DX/E";
	relativelevel = "DX+1";
		
}

export class Spell extends Leveled {
	class = "";
	college = "";
	cost = "";
	maintain = "";
	duration = "";
	resist = "";
	casttime = "";
	}
	
export class Advantage extends NamedCost {
}

export class Attack extends Named {
	st = "";
	mode = "";
	level = "";
	damage = "";
}

export class Melee extends Attack {
	weight = "";
	techlevel = "";
	cost = "";
	reach = "";
	parry = "";
}

export class Ranged extends Attack {
	bulk = "";
	legalityclass = "";
	ammo = "";
	acc = "";
	range = "";
	rof = "";
	shots = "";
	rcl = "";
}

export class Encumbrance {
	key = "";
	level = 0;
	dodge = 9;
	weight = "";
	move = "";
	current = false;
}

export class Note extends Named {
}

export class Equipment extends Named {
	equipped = false;
	carried = false;
	count = 0;
	cost = 0;
	weight = 0;
	location ="";
	techlevel = "";
	legalityclass = "";
	categories = "";
	contains = {};
}

export class HitLocation {
	dr = "";
	equipment = "";
	penalty = "";
	roll = "";
	where = "";
	
	setEquipment(frmttext) {
		let e = game.GURPS.extractP(frmttext);
		this.equipment = e.trim().replace("\n", ", ");
	}
}

