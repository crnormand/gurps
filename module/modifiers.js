export class ModifierBucket extends Application {
	
	modifierList = [];  // { "mod": +/-N, "desc": "" }
	currentSum = 0;
	displaySum = "+0";
	displayElement = null;
	
  getData(options) {
    const data = super.getData(options);
		data.gmod = this;
    return data;
	}
	activateListeners(html) {
	  super.activateListeners(html);
		html.find("#showlist").click(this._onClickShowlist.bind(this));
		html.find("#trash").click(this._onClickTrash.bind(this));
		this.displayElement = html.find("#globalmodifier");
		this.displayElement.click(this._update.bind(this));
		html.find("modifierbucket").hover(this._onHover.bind(this));
	}
	
	async _onHover(event) {
		event.preventDefault();
		let element = event.currentTarget;
		console.log("Hovering over:");
		console.log(element);		
	}
	
	async _update(event) {
		event.preventDefault();
		let element = event.currentTarget;
		for (let e of this.displayElement) 
			e.innerHTML(this.displaySum);
		this.showMods();
	}
	
	async _onClickShowlist(event) {
		event.preventDefault();
		this.showMods();
	}
	
	async _onClickTrash(event) {
		event.preventDefault();
		this.clear();
		this.showMods();
	}

	makeModifier(mod, reason) {
		let n = mod.toString();
		if (n[0] != '-' && n[0] != '+') n = "+" + n;
		return { "mod": n, "desc": reason };
	}
		
	addModifier(mod, reason) {
		this.modifierList.push(this.makeModifier(mod, reason));
		this.sum();
		this.showMods();
	}
	
	sum() {
		this.currentSum = 0;
		for (let m of this.modifierList) {
			this.currentSum += parseInt(m.mod);
		}
		this.displaySum = this.currentSum.toString();
		if (this.displaySum[0] != "-") this.displaySum = "+" + this.displaySum;
	}

	applyMods(targetmods) {
		let answer = this.modifierList;
		this.clear();
		if (!!targetmods) answer = targetmods.concat(answer);
		return answer;
	}
	
	clear() {
		this.modifierList = [];
		this.sum();
	}
	
	showMods() {
		let content = "Current Modifiers:";
		for (let m of this.modifierList) {
			content += "<br>" + m.mod + " : " + m.desc;
		}
		content += "<br>Sum: " + this.currentSum;
		let messageData = {
	    content: content,
	    type: CONST.CHAT_MESSAGE_TYPES.OOC,
	 	};
		CONFIG.ChatMessage.entityClass.create(messageData, {});
	}
}
