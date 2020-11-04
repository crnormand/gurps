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
		let e = html.find("#globalmodifier");
		if (!!e[0])
			this.displayElement = e[0];
		html.find("#modifierbucket").hover(this._onHover.bind(this));
	}
	
	async _onHover(event) {
		event.preventDefault();
		let element = event.currentTarget;
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

	displayMod(mod) {
		let n = mod.toString();
		if (n[0] != '-' && n[0] != '+') n = "+" + n;
		return n;
	}
	
	addModifier(mod, reason) {
		let oldmod = this.modifierList.find(m => m.desc == reason);
		if (!!oldmod) {
			let m = parseInt(oldmod.mod) + mod;
			oldmod.mod = this.displayMod(m);
		} else {
			this.modifierList.push({ "mod": this.displayMod(mod), "desc": reason });
		}
		this.sum();
		this.showMods();
	}
	
	sum() {
		this.currentSum = 0;
		for (let m of this.modifierList) {
			this.currentSum += parseInt(m.mod);
		}
		this.displaySum = this.displayMod(this.currentSum);
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
		//CONFIG.ChatMessage.entityClass.create(messageData, {});
		if (!!this.displayElement) {
			this.displayElement.textContent = this.displaySum;
		}
	}
}
