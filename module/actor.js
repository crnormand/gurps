export class GurpsActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    return data;
  }

	t(o) {
		return o["#text"];
	}

	async updateSkills(jsonSkills, overwrite) {
		let skills = [];
		if (!overwrite) {
			skills = this.data.data.skills;
		}
		for (let key in jsonSkills) {
			if (key.startsWith("id-")) {
				let j = jsonSkills[key];
				let sk = new Skill();
				sk.name = this.t(j.name)
				sk.type = this.t(j.type);
				sk.skillLevel = parseInt(this.t(j.level));
				sk.relativeLevel = this.t(j.relativelevel);
				sk.notes = CONFIG.GURPS.trim(this.t(j.text));
				sk.parseGCSNotes();
				skills.push(sk);
			}
		}
		await this.update({"data.skills": skills});
	}
	
	async importFromGCS(xml) {
		console.log(xml);
		let x = xml.replace(/<p>/g, "").replace(/<\/p>/g,"\n");
		console.log(x);
		x = CONFIG.GURPS.xmlTextToJson(x);
		console.log(x);
		console.log(this);
		let c = x.root.character;
		let nm = this.t(c.name);
		console.log("New Name=" + nm);
		await this.update({"name": nm});

		this.updateSkills(c.abilities.skilllist, true)
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
	
	parseGCSNotes() {
		let n = this.notes;
		if (!!n) {
			let k = "Page Ref: ";
			let i = n.indexOf(k);
			this.notes = n.substr(0, i);
			this.pageRef = n.substr(i+k.length);
		}
	}
}