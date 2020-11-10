import { SYSTEM_NAME, SETTING_NAME } from '../lib/ranges.js'

export class ModifierBucket extends Application {

	SHOWING = false;
	modifierStack = {
		modifierList: [],  // { "mod": +/-N, "desc": "" }
		currentSum: 0,
		displaySum: "+0",
		plus: false,
		minus: false
	};
	ModifierBucketElement = null;
	tooltipElement = null;
	tempRangeMod = null;

	addTempRangeMod() {
		// Only allow 1 measured range, for the moment.
		let d = "for range";
		this.modifierStack.modifierList = this.modifierStack.modifierList.filter(m => m.desc != d);
		if (this.tempRangeMod == 0) {
			this.sum();
			this.updateBucket();
		} else {
			this.addModifier(this.tempRangeMod, d);
		}
	}

	setTempRangeMod(mod) {
		this.tempRangeMod = mod;
	}

	getData(options) {
		const data = super.getData(options);
		data.gmod = this;
		data.stack = this.modifierStack;
		data.meleemods = game.GURPS.MeleeMods.split("\n");
		data.rangedmods = game.GURPS.RangedMods.split("\n");
		data.defensemods = game.GURPS.DefenseMods.split("\n");
		data.speedrangemods = ["Speed / Range"].concat(game.GURPS.rangeObject.modifiers);
		data.actorname = (!!game.GURPS.LastActor) ? game.GURPS.LastActor.name : "No active character!";
		data.othermods = game.GURPS.OtherMods.split("\n");
		data.cansend = game.user?.isGM || game.user?.isRole("TRUSTED") || game.user?.isRole("ASSISTANT");
		data.users = game.users?.filter(u => u._id != game.user._id) || [];
		data.taskdificulties = game.GURPS.TaskDifficultyModifiers;
		data.lightingmods = game.GURPS.LightingModifiers;
		data.eqtqualitymods = game.GURPS.EqtQualifyModifiers;
		data.rofmods = game.GURPS.RateOfFireModifiers;
		data.posturemods = game.GURPS.makeSelect(game.GURPS.PostureStatusModifiers);
		data.covermods = game.GURPS.makeSelect(game.GURPS.CoverHitlocModifiers);
		data.sizemods = game.GURPS.SizeModifiers;
		data.currentmods = [];

		if (!!game.GURPS.LastActor) {
			let melee = [];
			let ranged = [];
			let defense = [];
			let gen = [];
			let effects = game.GURPS.LastActor.temporaryEffects;
			for (let e of effects) {
				let type = e.data.flags.core.statusId;
				let m = game.GURPS.ModifiersForStatus[type];
				if (!!m) {
					melee = melee.concat(m.melee)
					ranged = ranged.concat(m.ranged)
					defense = defense.concat(m.defense)
					gen = gen.concat(m.gen)
				}
			}
			if (gen.length > 0) {
				data.currentmods.push(game.GURPS.horiz("General"));
				gen.forEach(e => data.currentmods.push(e));
			}
			if (melee.length > 0) {
				data.currentmods.push(game.GURPS.horiz("Melee"));
				melee.forEach(e => data.currentmods.push(e));
			}
			if (ranged.length > 0) {
				data.currentmods.push(game.GURPS.horiz("Ranged"));
				ranged.forEach(e => data.currentmods.push(e));
			}
			if (defense.length > 0) {
				data.currentmods.push(game.GURPS.horiz("Defense"));
				defense.forEach(e => data.currentmods.push(e));
			}
		}
    return data;
	}

	_onleave(ev) {
		this.tooltipElement.style.setProperty("visibility", "hidden");
		this.SHOWING = false;
	}

	_onenter(ev) {
		this.tooltipElement.style.setProperty("visibility", "visible");
		this.SHOWING = true;
	}


	activateListeners(html) {
		super.activateListeners(html);
		html.find("#trash").click(this._onClickTrash.bind(this));
		let e = html.find("#globalmodifier");
		e.click(this._onClick.bind(this));
		e.contextmenu(this.onRightClick.bind(this));
		e.each((i, li) => { li.addEventListener('mouseenter', ev => this._onenter(ev), false) });
		if (!!e[0])
			this.displayElement = e[0];

		e = html.find("#modttt");
		e.each((i, li) => { li.addEventListener('mouseleave', ev => this._onleave(ev), false) });
		e.each((i, li) => { li.addEventListener('mouseenter', ev => this._onenter(ev), false) });
		if (!!e[0])
			this.tooltipElement = e[0];
		html.find(".removemod").click(this._onClickRemoveMod.bind(this));
		if (this.SHOWING) {
			this.tooltipElement.style.setProperty("visibility", "visible");
		} else {
			this.tooltipElement.style.setProperty("visibility", "hidden");
		}

		html.find(".rollable").click(this._onClickRoll.bind(this));
		html.find(".pdflink").click(this._onClickPdf.bind(this));
		html.find(".gurpslink").click(this._onClickGurpslink.bind(this));
		html.find(".gmod").click(this._onClickGmod.bind(this));
		html.find(".glinkmod").click(this._onClickGmod.bind(this));
		html.find(".glinkmodplus").click(this._onClickGmod.bind(this));
		html.find(".glinkmodminus").click(this._onClickGmod.bind(this));

		html.find(".gmbutton").click(this._onGMbutton.bind(this));
		html.find("#modmanualentry").change(this._onManualEntry.bind(this));
		html.find("#modtaskdifficulty").change(this._onTaskDifficulty.bind(this));
		html.find("#modlighting").change(this._onLighting.bind(this));
		html.find("#modspeedrange").change(this._onList.bind(this));
		html.find("#modeqtquality").change(this._onList.bind(this));
		html.find("#modrof").change(this._onList.bind(this));
		html.find("#modposture").change(this._onList.bind(this));
		html.find("#modcover").change(this._onList.bind(this));
		html.find("#modsize").change(this._onList.bind(this));
	}

	async _onManualEntry(envent) {
		event.preventDefault();
		let element = event.currentTarget;
		let v = element.value;
		let parsed = game.GURPS.parselink(element.value, game.GURPS.LastActor);
		if (!!parsed.action && parsed.action.type === "modifier") {
			this.addModifier(parsed.action.mod, parsed.action.desc);
		} else
			this.refresh();
	}
	
	async _onList(event) {
		this._onSimpleList(event, "");
	}
	
	async _onTaskDifficulty(event) {
    this._onSimpleList(event, "Difficulty: ");
	}

	async _onLighting(event) {
    this._onSimpleList(event, "Lighting: ");
	}
	
	async _onSimpleList(event, prefix) {
    event.preventDefault();
		let element = event.currentTarget;
		let v = element.value;
		let i = v.indexOf(" ");
		this.SHOWING = true;  					// Firefox seems to need this reset when showing a pulldown
		this.addModifier(v.substring(0,i), prefix + v.substr(i+1));
	}

	
	async _onGMbutton(event) {
		event.preventDefault();
		let element = event.currentTarget;
		let id = element.dataset.id;

		let u = game.users.get(id);
		await u.setFlag("gurps", "modifierstack", game.GURPS.ModifierBucket.modifierStack);
		await u.setFlag("gurps", "modifierchanged", Date.now());
		this.showOthers();
	}

	async _onClickPdf(event) {
		event.preventDefault();
		game.GURPS.onPdf(event);
	}

	async _onClickRoll(event) {
		event.preventDefault();
		game.GURPS.onRoll(event, this.actor);
	}

	async _onClickGurpslink(event) {
		event.preventDefault();
		game.GURPS.onGurpslink(event, game.GURPS.LastActor);
	}

	async _onClickGmod(event) {
		let element = event.currentTarget;
		event.preventDefault();
		let desc = element.dataset.name;
		game.GURPS.onGurpslink(event, game.GURPS.LastActor, desc);
	}

	async _onClickTrash(event) {
		event.preventDefault();
		this.clear();
	}

	async _onClickRemoveMod(event) {
		event.preventDefault();
		let element = event.currentTarget;
		let index = element.dataset.index;
		this.modifierStack.modifierList.splice(index, 1);
		this.sum();
		this.render(true);
	}

	async _onClick(event) {
		event.preventDefault();

		// If not the GM, just broadcast our mods to the chat	
		if (!game.user.isGM) {
			this.showMods(true);
			return;
		}

		this.showOthers();
	}

	async showOthers() {
		let users = game.users.filter(u => u._id != game.user._id);
		let content = "";
		let d = "";
		for (let u of users) {
			content += d;
			d = "<hr>";
			let stack = await u.getFlag("gurps", "modifierstack");
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
		let c = `Melee:
${game.GURPS.MeleeMods}

Ranged:
${game.GURPS.RangedMods}

Defense:
${game.GURPS.DefenseMods}

Other:
${game.GURPS.OtherMods}`;

		let output = "";
		for (let l of c.split("\n"))
			output += "<br>" + l;

		let messageData = {
			content: output,
			type: CONST.CHAT_MESSAGE_TYPES.OOC,
		};
		CONFIG.ChatMessage.entityClass.create(messageData, {});
	}

	// Public method.   Used by GURPS to create a temporary modifer for an action.
	makeModifier(mod, reason) {
		let m = GURPS.displayMod(mod);
		return { "mod": m, "desc": reason, "plus": (m[0] == "+") };
	}

	sum() {
		let stack = this.modifierStack;
		stack.currentSum = 0;
		for (let m of stack.modifierList) {
			stack.currentSum += parseInt(m.mod);
		}
		stack.displaySum = GURPS.displayMod(stack.currentSum);
		stack.plus = stack.currentSum > 0;
		stack.minus = stack.currentSum < 0;
	}

	displaySum() {
		return this.modifierStack.displaySum;
	}

	currentSum() {
		return this.modifierStack.currentSum;
	}

	async addModifier(mod, reason) {
		let stack = this.modifierStack;
		let oldmod = stack.modifierList.find(m => m.desc == reason);
		if (!!oldmod) {
			let m = parseInt(oldmod.mod) + parseInt(mod);
			oldmod.mod = GURPS.displayMod(m);
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
		let content = name + "No modifiers";
		if (modst.modifierList.length > 0) {
			content = name + "total: " + modst.displaySum;
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

	refresh() {
		this.render(true);
	}

	async showMods(inChat) {
		if (inChat) {
			let messageData = {
				content: this.chatString(stack),
				type: CONST.CHAT_MESSAGE_TYPES.OOC,
			};
			CONFIG.ChatMessage.entityClass.create(messageData, {});
		}
		this.refresh();
	}
}
