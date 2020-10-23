export class GurpsActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    return data;
  }

	// hack to get to provate text element created by xml->json method. 
	textFrom(o) {
		return o["#text"];
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
		let nm = this.t(c.name);
		console.log("New Name=" + nm);
		// this is how you have to update the domain object so that it is synchronized.
		await this.update({"name": nm});

		// This is going to get ugly, so break out various data into different methods
		this.importSkillsFromGCSv1(c.abilities.skilllist, true)
	}
	
	
		// create/update the skills.   
		// NOTE:  For the update to work correctly, no two skills can have the same name.
		// When reading data, use "this.data.data", however, when updating, use "data.skills".
		async importSkillsFromGCSv1(jsonSkills, overwrite) {
		let skills = [];
		if (!overwrite) {
			skills = this.data.data.skills;
		}
		let t = this.textFrom;		/// shortcut to make code smaller
		for (let key in jsonSkills) {
			if (key.startsWith("id-")) {	// Allows us to skip over junk elements created by xml->json code, and only select the skills.
				let j = jsonSkills[key];
				let sk = new Skill();
				sk.name = t(j.name)
				sk.type = t(j.type);
				sk.skillLevel = parseInt(t(j.level));
				sk.relativeLevel = t(j.relativelevel);
				sk.notes = CONFIG.GURPS.trim(t(j.text));
				sk.parseGCSv1Notes();
				skills.push(sk);
			}
		}
		await this.update({"data.skills": skills});
	}
	
}


export class Skill {
	name = "Throwing";
	type = "DX/E";
	skillLevel = 11;
	relativeLevel = "DX+1";
	points = 0;
	notes = "";
	pageRef = "";
	
	// Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
	parseGCSv1Notes() {
		let n = this.notes;
		if (!!n) {
			let k = "Page Ref: ";
			let i = n.indexOf(k);
			this.notes = n.substr(0, i);
			this.pageRef = n.substr(i+k.length);
		}
	}
}