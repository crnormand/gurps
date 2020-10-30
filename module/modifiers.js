export class ModifierBucket extends Application {
	
	modifierList = [];  // { "mod": +/-N, "desc": "" }
	currentSum = 0;
	displaySum = "+0";
	
  getData(options) {
    const data = super.getData(options);
		data.gmod = game.GURPS.ModifierBucket;
    return data;
	}
	activateListeners(html) {
	  super.activateListeners(html);
		html.find("#showlist").click(this._onClickShowlist.bind(this));
		html.find("#trash").click(this._onClickTrash.bind(this));
		html.find("#globalmodifier").click(this._update.bind(this));
	}
	
	async _update(event) {
		event.preventDefault();
		let element = event.currentTarget;
		element.innerHtml = this.displaySum;
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

		
	addModifier(mod, reason) {
		let n = mod.toString();
		if (n[0] != '-') n = "+" + n;
		this.modifierList.push({ "mod": n, "desc": reason });
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

	applyMods() {
		let answer = {
			"sum" : this.currentSum,
			"mods" : this.modifierList
		};
		this.clear();
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
