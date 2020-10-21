export class GurpsActor extends Actor {

  /** @override */
  getRollData() {
    const data = super.getRollData();
    return data;
  }

	async importFromGCS(xml) {
		console.log(xml);
		let o = CONFIG.GURPS.xmlTextToJson(xml);
		console.log(o);
		console.log(this);
		o = o.root.character;
		let nm = o.name["#text"];
		console.log("New Name=" + nm);
		await this.update({"name": nm});
		console.log(this);
	}
}

export class Skill {
	
}