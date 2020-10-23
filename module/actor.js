export class GurpsActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    return data;
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
		//console.log("XML:" + xml);
		let x = this.cleanUpP(xml);
		//console.log(x);
		x = CONFIG.GURPS.xmlTextToJson(x);
		//console.log(x);
		console.log(this);
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
		
	}
	
	// hack to get to private text element created by xml->json method. 
	textFrom(o) {
		return o["#text"];
	}
	
	// similar hack to get text as integer.
	intFrom(o) {
		return parseInt(o["#text"]);
	}
		
	async importTraitsfromGCSv1(json) {
		let t = this.textFrom;
		let ts = this.data.data.traits;
		
		ts.race = t(json["race"]);
		ts.height = t(json["height"]);
		ts.weight = t(json["weight"]);
		ts.age = t(json["age"]);
		// <appearance type="string">@GENDER, Eyes: @EYES, Hair: @HAIR, Skin: @SKIN</appearance>
		let a = t(json["appearance"]);
		ts.appearance = a;
		let x = a.indexOf(", Eyes: ");
		ts.gender = a.substring(0, x);
		let y = a.indexOf(", Hair: ");
		ts.eyes = a.substring(x + 8, y);
		x = a.indexOf(", Skin: ")
		ts.hair = a.substring(y + 8, x);
		ts.skin = a.substr(x + 8);
		ts.sizemod = t(json["sizemodifier"]);
		await this.update({"data.traits": ts});
	}

	// Import the <attributes> section of the GCS FG XML file.
	async importAttributesFromCGSv1(json) {
		let i = this.intFrom;		// shortcut to make code smaller
		let t = this.textFrom;
		let data = this.data.data;
		let att = data.attributes;
		att.ST.value = i(json["strength"]);
		att.ST.points = i(json["strength_points"]);
		att.DX.value = i(json["dexterity"]);
		att.DX.points = i(json["dexterity_points"]);
		att.IQ.value = i(json["intelligence"]);
		att.IQ.points = i(json["intelligence_points"]);
		att.HT.value = i(json["health"]);
		att.HT.points = i(json["health_points"]);
		att.WILL.value = i(json["will"]);
		att.WILL.points = i(json["will_points"]);
		att.PER.value = i(json["perception"]);
		att.PER.points = i(json["perception_points"]);
		await this.update({"data.attributes": att});
		
		data.HP.max = i(json["hitpoints"]);
		data.HP.points = i(json["hitpoints_points"]);
		data.HP.value = i(json["hps"]);
		data.FP.max = i(json["fatiguepoints"]);
		data.FP.points = i(json["fatiguepoints_points"]);
		data.FP.value = i(json["fps"]);

		data.basiclift = t(json["basiclift"]);
		data.basicmove.value = i(json["basicmove"]);
		data.basicmove.points = i(json["basicmove_points"]);
		data.basicspeed.value = i(json["basicspeed"]);
		data.basicspeed.points = i(json["basicspeed_points"]);
		data.thrust = t(json["thrust"]);
		data.swing = t(json["swing"]);
		data.currentmove = t(json["move"]);
	
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
		let skills = this.data.data.skills;
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let sn =  t(j.name);
				let sk = skills.find(s => s.name === sn);
				if (!sk) sk = new Skill();
				sk.name = sn;				
				sk.type = t(j.type);
				sk.level = parseInt(t(j.level));
				sk.relativelevel = t(j.relativelevel);
				sk.setNotes(t(j.text));
				skills.push(sk);
			}
		}
		await this.update({"data.skills": skills});
	}
	
		// create/update the spells.   
	// NOTE:  For the update to work correctly, no two spells can have the same name.
	// When reading data, use "this.data.data.spells", however, when updating, use "data.spells".
	async importSpellsFromGCSv1(json) {
		let spells = this.data.data.spells;
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in json) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = json[key];
				let sn =  t(j.name);
				let sp = spells.find(s => s.name === sn);
				if (!sp) sp = new Spell();
				sp.name = sn;			
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

	
}

export class NamedLeveled {
	name = "Throwing";
	level = 1;
	points = 1;
	notes = "";
	pageref = "";
	
	setNotes(n) {
		if (!!n) {
			let s = n.split("\n");
			let v = "";
			for (let b of s) {
				if (!!b) v += atob(b) + "\n";
			}
			let k = "Page Ref: ";
			let i = v.indexOf(k);
			this.notes = v.substr(0, i).trim();
			this.pageref = v.substr(i+k.length).trim();
		}
	}

}

export class Skill extends NamedLeveled {
	type = "DX/E";
	relativelevel = "DX+1";
	
	// Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
}

export class Spell extends NamedLeveled {
	class = "";
	college = "";
	costmaintain = "2/1";
	duration = "1";
	resist = "";
	time = "1 sec";
	}