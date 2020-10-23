export class GurpsActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    return data;
  }

	// First attempt at import GCS FG XML export data.
	async importFromGCSv1(xml) {
		console.log(xml);
		// need to remove <p> and replace </p> with newlines from "formatted text"
		let x = xml.replace(/<p>/g, "").replace(/<\/p>/g,"\n");
		x = CONFIG.GURPS.xmlTextToJson(x);
		console.log(x);
		console.log(this);
		// The character object starts here
		let c = x.root.character;
		let nm = this.textFrom(c.name);
		console.log("New Name=" + nm);
		// this is how you have to update the domain object so that it is synchronized.
		await this.update({"name": nm});

		// This is going to get ugly, so break out various data into different methods
		this.importAttributesFromCGSv1(c.attributes);
		this.importSkillsFromGCSv1(c.abilities.skilllist, true)
		//this.importSpellsFromGCSv1(c.abilities.spelllist, true)
		
	}
	
	// hack to get to provate text element created by xml->json method. 
	textFrom(o) {
		return o["#text"];
	}
	
	intFrom(o) {
		return parseInt(this.textFrom(o));
	}

	async importAttributesFromCGSv1(json) {
		let att = this.data.data.attributes;
		att.ST.value = this.intFrom(json["strength"]);
		att.ST.points = this.intFrom(json["strength_points"]);
		att.DX.value = this.intFrom(json["dexterity"]);
		att.DX.points = this.intFrom(json["dexterity_points"]);
		att.IQ.value = this.intFrom(json["intelligence"]);
		att.IQ.points = this.intFrom(json["intelligence_points"]);
		att.HT.value = this.intFrom(json["health"]);
		att.HT.points = this.intFrom(json["health_points"]);
		att.WILL.value = this.intFrom(json["will"]);
		att.WILL.points = this.intFrom(json["will_points"]);
		att.PER.value = this.intFrom(json["perception"]);
		att.PER.points = this.intFrom(json["perception_points"]);
		await this.update({"data.attributes": att});
	}

	// create/update the skills.   
	// NOTE:  For the update to work correctly, no two skills can have the same name.
	// When reading data, use "this.data.data.skills", however, when updating, use "data.skills".
	async importSkillsFromGCSv1(json, overwrite) {
		let skills = [];
		if (!overwrite) {
			skills = this.data.data.skills;
		}
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
				sk.relativeLevel = t(j.relativelevel);
				sk.setNotes(CONFIG.GURPS.trim(t(j.text)));
				skills.push(sk);
			}
		}
		await this.update({"data.skills": skills});
	}
	
}

export class NamedLeveled {
	name = "Throwing";
	level = 1;
	points = 1;
	notes = "";
	pageRef = "";
	
	setNotes(n) {
		if (!!n) {
			let k = "Page Ref: ";
			let i = n.indexOf(k);
			this.notes = n.substr(0, i);
			this.pageRef = n.substr(i+k.length);
		}
	}

}

export class Skill extends NamedLeveled {
	type = "DX/E";
	relativeLevel = "DX+1";
	
	// Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
}

export class Spell extends NamedLeveled {
	class = "";
	college = "";
	costMaintain = "2/1";
	duration = "1";
	resist = "HT";
	time = "1 sec";
	}