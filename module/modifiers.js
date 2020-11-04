export class ModifierBucket extends Application {
	
	modifierList = [];  // { "mod": +/-N, "desc": "" }
	currentSum = 0;
	displaySum = "+0";
	displayElement = null;
	tooltipElement = null;
	
  getData(options) {
    const data = super.getData(options);
		data.gmod = this;
    return data;
	}
	activateListeners(html) {
	  super.activateListeners(html);
		html.find("#trash").click(this._onClickTrash.bind(this));
		html.find(".modifierbucket").click(this._onClick.bind(this));
		let e = html.find("#globalmodifier");
		if (!!e[0])
			this.displayElement = e[0];
		e = html.find("#modttt");
		if (!!e[0])
			this.tooltipElement = e[0];
	}
	
	async _onHover(event) {
		event.preventDefault();
		let element = event.currentTarget;
	}
		
	async _onClickTrash(event) {
		event.preventDefault();
		this.clear();
	}
	
	async _onClick(event) {
		event.preventDefault();
		this.showMods(true);
	}


	displayMod(mod) {
		let n = mod.toString();
		if (n[0] != '-' && n[0] != '+') n = "+" + n;
		return n;
	}
	
	makeModifier(mod, reason) {
		return { "mod": this.displayMod(mod), "desc": reason };
	}
	
	addModifier(mod, reason) {
		let oldmod = this.modifierList.find(m => m.desc == reason);
		if (!!oldmod) {
			let m = parseInt(oldmod.mod) + mod;
			oldmod.mod = this.displayMod(m);
		} else {
			this.modifierList.push(this.makeModifier(mod, reason));
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
		this.showMods();
	}
	
	showMods(inChat = false) {
		let content = "<div style='font-size:130%'>No modifiers to next roll</div>";
		if (this.modifierList.length > 0) {
			let clr = "#ff7f00";
			content = "<div style='font-size:130%'>Current Modifiers:<br><br>\n";
			for (let m of this.modifierList) {
				let clr = "#ff7f00";
				clr = (m.mod[0] == "+") ? "lightgreen" : "#ff7f00";
				content += "<div style='color:" + clr + ";text-align: left;'>" + m.mod + " : " + m.desc + "</div>\n";
			}
			clr = "white";
			if (this.currentSum > 0) clr = "lightgreen;";
			if (this.currentSum < 0) clr = "#ff7f00";
			content += "<br><div style='color:" + clr + "'>Total: " + this.displaySum + "</div></div>";
		}
		if (inChat) {
			let c = content.replace(/<br><br>/g,"<br>").replace(/<div.*'>/g,"").replace(/<\/div>/g,"<br>");		// Just get rid of CSS crap ;-)
			let messageData = {
		  	content: c,		
		  	type: CONST.CHAT_MESSAGE_TYPES.OOC,
		 	};
		CONFIG.ChatMessage.entityClass.create(messageData, {}); 
		}
		this.displayElement.textContent = this.displaySum;
		let st = "line-height: 40px;text-shadow: 2px 2px black";
		if (this.currentSum < 0) st += ";color:#ff7f00";
		if (this.currentSum > 0) st += ";color:lightgreen";
		this.displayElement.style = st;
		this.tooltipElement.innerHTML = content;
	}
}
