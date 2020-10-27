export class GurpsActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    return data;
  }

	prepareData() {
		super.prepareData();
		
		const d = this.data.data;
		if (d.encumbrance.length == 0) {
			let es = [];
			for (let i = 0; i < 5; i++) {
				let e = [];
				e.key = ("enc" + i);
				e.current = false;
				e.weight = "";
				e.move = "";
				e.dodge = "?";
			}
			d.encumbrance = es;
		}
	}

	
	// This is an ugly hack to cleasn up the "formatted text" output from GCS FG XML.
	// First we have to remove non-printing characters, and then we want to replace 
	// all <p>...</p> with .../n before we try to convert to JSON.   Also, for some reason,
	// the DOMParser doesn't like some of the stuff in the formatted text sections, so
	// we will base64 encode it, and the decode it in the NamedLeveled subclass setNotes()
	cleanUpP(xml) {
		// First, remove non-ascii characters
		xml = xml.replace(/[^ -~]+/g, "");
		let s = xml.indexOf("<p>");
		while (s > 0) {
			let e = xml.indexOf("</p>", s);
			if (e > s) {
				let t1 = xml.substring(0, s);
				let t2 = xml.substring(s+3, e);
				t2 = btoa(t2) + "\n";
				let t3 = xml.substr(e+4);
				xml = t1 + t2 + t3;
				s = xml.indexOf("<p>", s + t2.length);
			}
		}
		return xml;
	}

	// First attempt at import GCS FG XML export data.
	async importFromGCSv1(xml) {
		// need to remove <p> and replace </p> with newlines from "formatted text"
		let x = this.cleanUpP(xml);
		x = CONFIG.GURPS.xmlTextToJson(x);
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
		this.importAttributesFromCGSv1(c.attributes);
		this.importSkillsFromGCSv1(c.abilities.skilllist)
		this.importSpellsFromGCSv1(c.abilities.spelllist)
		this.importTraitsfromGCSv1(c.traits);
		this.importAdsFromGCSv1(c.traits.adslist);
		this.importDisadsFromGCSv1(c.traits.disadslist);
		this.importPowersFromGCSv1(c.abilities.powerlist);
		this.importOtherAdsFromGCSv1(c.abilities.otherlist);
		this.importEncumbranceFromGCSv1(c.encumbrance);
		this.importCombatMeleeFromGCSv1(c.combat.meleecombatlist);
		this.importCombatRangedFromGCSv1(c.combat.rangedcombatlist);
		this.importPointTotalsFromGCSv1(c.pointtotals);
		console.log("Done importing.  You can inspect the character data below:");
		console.log(this);
	}
	
	// hack to get to private text element created by xml->json method. 
	textFrom(o) {
		let t = o["#text"];
		if (!!t) t = t.trim();
		return t;
	}
	
	// similar hack to get text as integer.
	intFrom(o) {
		return parseInt(o["#text"]);
	}
		
	async importPointTotalsFromGCSv1(json) {
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
	
	async importEncumbranceFromGCSv1(json) {
		let t= this.textFrom;
		let es = [];
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
			es.push(e);
		}
		await this.update({"data.encumbrance": es});
	}
	
	async importCombatMeleeFromGCSv1(json) {
		let t = this.textFrom;
		let melee = [];
		
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
  					melee.push(m);
					}
				}
			}
		}
		await this.update({"data.melee": melee});	
	}
	
	async importCombatRangedFromGCSv1(json) {
		let t = this.textFrom;
		let ranged = [];
		
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
  					ranged.push(r);
					}
				}
			}
		}
		await this.update({"data.ranged": ranged});	
	
	}
		
	async importTraitsfromGCSv1(json) {
		let t = this.textFrom;
		let ts = [];
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

		data.basiclift = t(json.basiclift);
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
			"data.currentmove": data.currentmove
			});
	}

	// create/update the skills.   
	// NOTE:  For the update to work correctly, no two skills can have the same name.
	// When reading data, use "this.data.data.skills", however, when updating, use "data.skills".
	async importSkillsFromGCSv1(json) {
		let skills = [];
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let sk = new Skill();
				sk.name = t(j.name);	
				sk.type = t(j.type);
				sk.level = parseInt(t(j.level));
				sk.relativelevel = t(j.relativelevel);
				try {
				sk.setNotes(t(j.text));
				} catch {
					console.log(sk);
					console.log(t(j.text));
				}
				skills.push(sk);
			}
		}
		await this.update({"data.skills": skills});
	}
	
		// create/update the spells.   
	// NOTE:  For the update to work correctly, no two spells can have the same name.
	// When reading data, use "this.data.data.spells", however, when updating, use "data.spells".
	async importSpellsFromGCSv1(json) {
		let spells = [];
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let sp = new Spell();
				sp.name = t(j.name);			
				sp.class = t(j.class);
				sp.college = t(j.college);
				sp.costmaintain = t(j.costmaintain);
				sp.duration = t(j.duration);
				sp.points = t(j.points);
				sp.time = t(j.time);	
				sp.level = parseInt(t(j.level));
				sp.duration = t(j.duration);
				sp.setNotes(t(j.text));
				spells.push(sp);
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
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.powers": list});
	}
	
	async importAdsFromGCSv1(json) {
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.ads": list});
	}

	async importDisadsFromGCSv1(json) {
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.disads": list});
	}

	async importOtherAdsFromGCSv1(json) {
		let list = this.importBaseAdvantagesFromGCSv1(json);
		await this.update({"data.otherads": list});
	}


	importBaseAdvantagesFromGCSv1(json) {
		let datalist = [];
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let a = new Advantage();
				a.name = t(j.name);		
				a.points = this.intFrom(j.points);
				a.setNotes(t(j.text));
				datalist.push(a);
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
			let s = n.split("\n");
			let v = "";
			for (let b of s) {
				if (!!b) v += atob(b) + "\n";
			}
			let k = "Page Ref: ";
			let i = v.indexOf(k);
			if (i >= 0) {
				this.notes = v.substr(0, i).trim();
				// Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
				this.pageref = v.substr(i+k.length).trim();
			} else {
				this.notes = v.trim();
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
	costmaintain = "2/1";
	duration = "1";
	resist = "";
	time = "1 sec";
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