export class ModifierBucket extends Application {
	
	modifierStack = {
		modifierList: [],  // { "mod": +/-N, "desc": "" }
		currentSum: 0,
		displaySum: "+0"
	};
	displayElement = null;
	tooltipElement = null;	
	tempRangeMod = null;
	
	addTempRangeMod() {
		if (this.tempRangeMod != 0)
			this.addModifier(this.tempRangeMod, "for range");
	}
	
	setTempRangeMod(mod) {
		this.tempRangeMod = mod;
	}

  getData(options) {
    const data = super.getData(options);
		data.gmod = this;
		data.mlist = this.modifierStack;
    return data;
	}
	
	activateListeners(html) {
	  super.activateListeners(html);
		html.find("#trash").click(this._onClickTrash.bind(this));
		let e = html.find("#globalmodifier");
		e.click(this._onClick.bind(this));
		e.contextmenu(this.onRightClick.bind(this));
		if (!!e[0])
			this.displayElement = e[0];
		e = html.find("#modttt");
		if (!!e[0])
			this.tooltipElement = e[0];
	}
	
	async _onClickTrash(event) {
		event.preventDefault();
		this.clear();
	}
	
	async _onClick(event) {
		event.preventDefault();
			
		// If not the GM, just broadcast our mods to the chat	
		if (!game.user.isGM) {
			this.showMods(true);
			return;
		}
		let users = game.users.filter(u => u._id != game.user._id);
		let content = "";
		let d = "";
		for (let u of users) {
			content += d;
			d = "<hr>";
			let stack = u.getFlag("gurps", "modifierstack");
			if (!!stack)
				content += this.chatString(stack, u.name + ", ");
			else 
				content += u.name + ", No modifiers";
		}
		let chatData = {
    	user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
     	content: content,
			whisper: [game.user._id]
		}
		CONFIG.ChatMessage.entityClass.create(chatData, {}); 
	}
	
	// If the GM right clicks on the modifier bucket, it will pop up a list of users, and set their stack	
	async onRightClick(event) {
		event.preventDefault();
		if (!game.user.isGM) return;
		let users = game.users.filter(u => u._id != game.user._id);
		
		let dialogData = {
      title: "Update Player's Modifier Bucket", 
      content: "Send your Modifier Bucket:<br><br><div style='background-color:black;color:white'>" + this.htmlForMods() + "</div><br><br>To which player:<br>",
			buttons: {}
    }
		let buttons = dialogData.buttons;
		for (let u of users) {
			let b = {
				label: u.name,
				icon: '<i class="fas fa-user"></i>',
				callback: () => { 
					u.setFlag("gurps", "modifierstack", game.GURPS.ModifierBucket.modifierStack);
					u.setFlag("gurps", "modifierchanged", Date.now());
				}
			}
			buttons[u.name] = b;
		}
		new Dialog(dialogData).render(true);
	}
	
	displayMod(mod) {
		let n = mod.toString();
		if (n[0] != '-' && n[0] != '+') n = "+" + n;
		return n;
	}

	// Public method.   Used by GURPS to create a temporary modifer for an action.
	makeModifier(mod, reason) {
		return { "mod": this.displayMod(mod), "desc": reason };
	}
	
	sum() {
		let stack = this.modifierStack;
		stack.currentSum = 0;
		for (let m of stack.modifierList) {
			stack.currentSum += parseInt(m.mod);
		}
		stack.displaySum = this.displayMod(stack.currentSum);
	}

	displaySum() {
		return this.modifierStack.displaySum;
	}
	
	currentSum() {
		return this.modifierStack.currentSum;
	}
	
	addModifier(mod, reason) {
		let stack = this.modifierStack;
		let oldmod = stack.modifierList.find(m => m.desc == reason);
		if (!!oldmod) {
			let m = parseInt(oldmod.mod) + mod;
			oldmod.mod = this.displayMod(m);
		} else {
			stack.modifierList.push(this.makeModifier(mod, reason));
		}
		this.sum();
		this.updateBucket();
	}
	
	async applyMods(targetmods) {
		let stack = this.modifierStack;
		let answer = (!!targetmods) ? targetmods : [];
		answer = answer.concat(stack.modifierList);
		this.clear();
  	return answer;
	}
	
	async clear() {
		await game.user.setFlag("gurps", "modifierstack", null);
		this.modifierStack = {
			modifierList: [],  // { "mod": +/-N, "desc": "" }
			currentSum: 0,
			displaySum: "+0"
		}
		this.updateBucket();
	}
	
	async updateBucket() {
		this.showMods(false);		
		game.user.setFlag("gurps", "modifierstack", this.modifierStack);
	}
	
	async updateDisplay(changed) {
		this.modifierStack = game.user.getFlag("gurps", "modifierstack");
		this.sum();
		this.showMods(false);		
	}
	
	chatString(modst, name = "") {
		let content =  name + "No modifiers";
		if (modst.modifierList.length > 0) {
			content = name + "total: " +  modst.displaySum;
			for (let m of modst.modifierList) {
				content += "<br> &nbsp;" + m.mod + " : " + m.desc;
			}
		}
		return content;
	}
	
	htmlForMods() {
		let stack = this.modifierStack;
		let content = "<div style='font-size:130%'>No modifiers</div>";
		if (stack.modifierList.length > 0) {
			let clr = "#ff7f00";
			content = "<div style='font-size:130%'>Current Modifiers:<br><br>\n";
			for (let m of stack.modifierList) {
				let clr = "#ff7f00";
				clr = (m.mod[0] == "+") ? "lightgreen" : "#ff7f00";
				content += "<div style='color:" + clr + ";text-align: left;'>" + m.mod + " : " + m.desc + "</div>\n";
			}
			clr = "white";
			if (this.currentSum > 0) clr = "lightgreen;";
			if (this.currentSum < 0) clr = "#ff7f00";
			content += "<br><div style='color:" + clr + "'>Total: " + this.displaySum() + "</div></div>";
		}	
		return content;
	}
	
	async showMods(inChat) {
		if (inChat) {
			let messageData = {
		  	content: this.chatString(stack),		
		  	type: CONST.CHAT_MESSAGE_TYPES.OOC,
		 	};
			CONFIG.ChatMessage.entityClass.create(messageData, {}); 
		}
		this.displayElement.textContent = this.displaySum();
		let st = "line-height: 40px;text-shadow: 2px 2px black";
		if (this.currentSum() < 0) st += ";color:#ff7f00";
		if (this.currentSum() > 0) st += ";color:lightgreen";
		this.displayElement.style = st;
		this.tooltipElement.innerHTML = this.htmlForMods(); // await renderTemplate("systems/gurps/templates/modifier-bucket-tooltip.html", { test: "test me" });
	}
}
