import { GURPS } from "./gurps.js";
import { isNiceDiceEnabled } from '../lib/utilities.js'
import { Melee, Reaction, Ranged, Advantage, Skill, Spell, Equipment, Note } from './actor.js';
import parselink from '../lib/parselink.js';
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class GurpsActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "sheet", "actor"],
      template: "systems/gurps/templates/actor-sheet-gcs.html",
      width: 800,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
			scrollY: [".gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipment #other_equipment #notes"], 
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /* -------------------------------------------- */

  flt(str) {
    return !!str ? parseFloat(str) : 0;
  }

  sum(dict, type) {
    if (!dict) return 0.0;
    let sum = 0;
    for (let k in dict) {
      let e = dict[k];
      let c = this.flt(e.count);
      let t = this.flt(e[type])
      sum += c * t;
      sum += this.sum(e.contains, type);
    }
    return sum;
  }

  /** @override */
  getData() {
    const sheetData = super.getData();
    sheetData.ranges = game.GURPS.rangeObject.ranges;
    game.GURPS.SetLastActor(this.actor);
    let eqt = this.actor.data.data.equipment || {};
    sheetData.eqtsummary = {
      eqtcost: this.sum(eqt.carried, "cost"),
      eqtlbs: this.sum(eqt.carried, "weight"),
      othercost: this.sum(eqt.other, "cost")
    };
    return sheetData;
  }

  /* -------------------------------------------- */


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".gurpsactorsheet").each((i, li) => { li.addEventListener('mousedown', ev => this._onfocus(ev), false) });
    html.find(".gurpsactorsheet").each((i, li) => { li.addEventListener('focus', ev => this._onfocus(ev), false) });

    html.find(".rollable").click(this._onClickRoll.bind(this));
    html.find(".pdflink").click(this._onClickPdf.bind(this));
    html.find(".gurpslink").click(this._onClickGurpslink.bind(this));
    html.find(".gmod").click(this._onClickGmod.bind(this));
    html.find(".glinkmod").click(this._onClickGmod.bind(this));
    html.find(".glinkmodplus").click(this._onClickGmod.bind(this));
    html.find(".glinkmodminus").click(this._onClickGmod.bind(this));

   html.find(".eqtdraggable").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", ev => {
					return ev.dataTransfer.setData("text/plain", JSON.stringify({ "type": "equipment", "key": ev.currentTarget.dataset.key }))
        })
    });

  }


  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    let dragData = JSON.parse(event.dataTransfer.getData("text/plain"));

    if (dragData.type === 'damageItem') {
      this.actor.handleDamageDrop(dragData.payload)
    }

		if (dragData.type === 'equipment') {
			let element = event.target;
			let targetkey = element.dataset.key;
			if (!!targetkey) {
				let srckey = dragData.key;
				
				if (srckey.includes(targetkey) || targetkey.includes(srckey)) {
					ui.notifications.error("Unable to drag and drop withing the same hierarchy.   Try moving it elsewhere first.");
					return;
				}
				let object = GURPS.decode(this.actor.data, srckey);
				// Because we may be modifing the same list, we have to check, are we in the same list
				// and if so, apply the operation that occurs later in the list, first (to keep the indexes the same)
				let srca = srckey.split(".");
				srca.splice(0, 3);
				let tara = targetkey.split(".");
				tara.splice(0, 3);
				let max = Math.min(srca.length, tara.length);
				let isSrcFirst = false;
				for (let i = 0; i < max; i++) {
				  if (parseInt(srca[i]) < parseInt(tara[i])) isSrcFirst = true;
				}
				if (targetkey.endsWith(".other") || targetkey.endsWith(".carried")) {
					let target = GURPS.decode(this.actor.data, targetkey);
					if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey);
					GURPS.put(target, object);
					await this.actor.update({ [targetkey] : target } );
					if (isSrcFirst) await GURPS.removeKey(this.actor, srckey);
				} else {
				let d = new Dialog({
					title: object.name,
					content: "<p>Where do you want to drop this?</p>",
					buttons: {
					 one: {
					  icon: '<i class="fas fa-level-up-alt"></i>',
					  label: "Before",
					  callback: async () => {
						  if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey);
							await GURPS.insertBeforeKey(this.actor, targetkey, object);
							if (isSrcFirst) await GURPS.removeKey(this.actor, srckey);
						}
					 },
					 two: {
					  icon: '<i class="fas fa-sign-in-alt"></i>',
					  label: "In",
					  callback: async () => {
						  if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey);
							await GURPS.insertBeforeKey(this.actor, targetkey + ".contains." + GURPS.genkey(0), object);
							if (isSrcFirst) await GURPS.removeKey(this.actor, srckey);
						}
					 }
					},
					default: "one",
					});
					d.render(true);
				}
			}
		}
  }

  // Converts the GURPS.hitlocationRolls properties into a map keyed by roll value.
  // Locations that map to multiple rolls (such as Skull: 3-4) will be expanded to
  // one entry per roll value: { 3: "Skull", 4: "Skull" } for example.
  get hitLocationTable() {
    let hitLocationTable = {}
    const excludes = ['Arm', 'Arms', 'Leg', 'Legs', 'Hands']

    for (const [key, value] of Object.entries(GURPS.hitlocationRolls)) {
      // exclude any value with no rolls AND any value that is is the exclusion list
      if (value.roll !== undefined && value.roll !== '-' && !excludes.includes(key)) {

        // value will either be a single int value, like '6', or a range like '7-8'
        let roll = value.roll
        let index = roll.indexOf('-')

        // single value
        if (index === -1) {
          hitLocationTable[parseInt(roll)] = key
        } else {
          // range
          let start = parseInt(roll.slice(0, index))
          let end = parseInt(roll.slice(index + 1))
          for (let i = start; i <= end; i++) {
            hitLocationTable[i] = key
          }
        }
      }
    }
    return hitLocationTable
  }

  /*
   * Apply damage
   */
  applyDamage(location, damage) {
    if (location === 'Random') {

      let roll3d = new Roll('3d6')
      roll3d.roll()
      let total = roll3d.total

      let contentData = {
        dice: '3d',
        value: total,
        location: this.hitLocationTable[total]
      }

      let self = this

      game.dice3d.showForRoll(roll3d)
        .then(display => renderTemplate('systems/gurps/templates/random-hitloc.html', contentData))
        .then(html => {
          const speaker = { alias: self.actor.name, _id: self.actor._id }
          let messageData = {
            user: game.user._id,
            speaker: speaker,
            content: html,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            roll: roll3d
          }
          if (!isNiceDiceEnabled()) {
            messageData.sound = CONFIG.sounds.dice
          }
          game.dice3d.messageHookDisabled = true
          return CONFIG.ChatMessage.entityClass.create(messageData)
        })
        .then(entity => {
          game.dice3d.messageHookDisabled = false
          self.applyDamageToSpecificLocation(contentData.location, damage)
        })
    } // Random
    else if (location === 'Large-Area') {
      console.log('implement Large-Area Injury')

      // find the location with the lowest DR
      let lowestDR = Number.POSITIVE_INFINITY
      let torsoDR = null
      for (const [key, value] of Object.entries(this.actor.data.data.hitlocations)) {
        let theDR = parseInt(value.dr)
        if (theDR < lowestDR) {
          lowestDR = theDR
        }
        if (value.where === 'Torso') {
          torsoDR = theDR
        }
      }
      console.log(`lowest DR = ${lowestDR}, torsoDR = ${torsoDR}`)

      let effectiveDR = Math.ceil((lowestDR + torsoDR) / 2)

      console.log(effectiveDR)

      this.applyDamageToSpecificLocationWithDR(location, damage, effectiveDR)
    }
    else {
      // get DR for that location
      let hitlocation = null
      for (const [key, value] of Object.entries(this.actor.data.data.hitlocations)) {
        if (value.where === location)
          hitlocation = value
      }
      let dr = parseInt(hitlocation.dr)

      this.applyDamageToSpecificLocationWithDR(location, damage, dr)
    }
  }

  applyDamageToSpecificLocation(location, damage) {
    // get DR for that location
    let hitlocation = null
    for (const [key, value] of Object.entries(this.actor.data.data.hitlocations)) {
      if (value.where === location)
        hitlocation = value
    }
    let dr = parseInt(hitlocation.dr)
    this.applyDamageToSpecificLocationWithDR(location, damage, dr)
  }

  // Location is set to a specific hit location
  applyDamageToSpecificLocationWithDR(location, damage, dr) {
    let current = this.actor.data.data.HP.value
    let attacker = game.actors.get(damage.attacker)

    let basicDamage = damage.damage
    let penetratingDamage = Math.max(basicDamage - dr, 0)
    let woundingModifier = GURPS.woundModifiers[damage.damageType].multiplier
    let injury = Math.floor(penetratingDamage * woundingModifier)

    let contentData = {
      steps: [
        `${attacker.data.name} inflicts ${basicDamage} points ${damage.damageType} to the ${location}.`,
        `DR ${dr} leaves ${penetratingDamage} points penetrating damage.`,
        `${penetratingDamage} ×${woundingModifier} (for ${damage.damageType}) = ${injury} points of injury.`
      ],
      attacker: attacker.data.name,
      defender: this.actor.data.name,
      basicDamage: basicDamage,
      damageType: damage.damageType,
      location: location,
      injury: injury,
      current: current,
      newHP: current - injury
    }

    this.actor.update({ "data.HP.value": current - injury })

    renderTemplate('systems/gurps/templates/apply-damage.html', contentData).then(html => {
      const speaker = { alias: this.actor.name, _id: this.actor._id }
      let messageData = {
        user: game.user._id,
        speaker: speaker,
        content: html,
        type: CONST.CHAT_MESSAGE_TYPES.OOC
      }

      if (!isNiceDiceEnabled()) {
        messageData.sound = CONFIG.sounds.dice
      }
      CONFIG.ChatMessage.entityClass.create(messageData);
    })
  }

  _onfocus(ev) {
    game.GURPS.SetLastActor(this.actor);
  }

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

	get title() {
		const t = this.actor.name;
		const sheet = this.actor.getFlag("core", "sheetClass");
		return (sheet === "gurps.GurpsActorEditorSheet") ? "**** Editing: " + t + " ****": t;
	}

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    const sheet = this.actor.getFlag("core", "sheetClass");
		const isFull = sheet === undefined || sheet === "gurps.GurpsActorSheetGCS";
		const isEditor = sheet === "gurps.GurpsActorEditorSheet";

    // Token Configuration
    const canConfigure = game.user.isGM || this.actor.owner;
    if (this.options.editable && canConfigure) {
      let b = [
        {
          label: isFull ? "Combat View" : "Full View",
          class: "toggle",
          icon: "fas fa-exchange-alt",
          onclick: ev => this._onToggleSheet(ev)
        },
        {
          label: "Import",
          class: "import",
          icon: "fas fa-file-import",
          onclick: ev => this._onFileImport(ev)
        }
      ];
			if (!isEditor) {
				b.push(         
					{
	          label: "Editor",
	          class: "edit",
	          icon: "fas fa-edit",
	          onclick: ev => this._onOpenEditor(ev)
	        } );
			}
			buttons = b.concat(buttons);
    }
    return buttons
  }

  async _onFileImport(event) {
    event.preventDefault();
    let element = event.currentTarget;
    new Dialog({
      title: `Import XML data for: ${this.actor.name}`,
      content: await renderTemplate("systems/gurps/templates/import-gcs-v1-data.html", { name: '"' + this.actor.name + '"' }),
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import",
          callback: html => {
            const form = html.find("form")[0];
            let files = form.data.files;
            let file = null;
            if (!files.length) {
              return ui.notifications.error("You did not upload a data file!");
            } else {
              file = files[0];
              readTextFromFile(file).then(text => this.actor.importFromGCSv1(text, file.name, file.path));
            }
          }
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "import"
    }, {
      width: 400
    }).render(true);
  }

  async _onToggleSheet(event) {
    event.preventDefault()

    const original = this.actor.getFlag("core", "sheetClass")
    console.log("original: " + original)
		let newSheet = "gurps.GurpsActorCombatSheet"
    if (original != "gurps.GurpsActorSheetGCS") newSheet = "gurps.GurpsActorSheetGCS";

    await this.actor.sheet.close()

    // Update the Entity-specific override
    await this.actor.setFlag("core", "sheetClass", newSheet)

    // Re-draw the updated sheet
    const updated = this.actor.getFlag("core", "sheetClass")
    console.log("updated: " + updated)
    this.actor.sheet.render(true)
  }

	async _onOpenEditor(event) {
    event.preventDefault();
    await this.actor.sheet.close();
    await this.actor.setFlag("core", "sheetClass", "gurps.GurpsActorEditorSheet");
    this.actor.sheet.render(true)
	}

  async _onClickPdf(event) {
    game.GURPS.handleOnPdf(event);
  }

  async _onClickRoll(event) {
    event.preventDefault();
    game.GURPS.onRoll(event, this.actor);
  }

  async _onClickGurpslink(event) {
    event.preventDefault();
    game.GURPS.onGurpslink(event, this.actor);
  }

  async _onClickGmod(event) {
    let element = event.currentTarget;
    event.preventDefault();
    let desc = element.dataset.name;
    game.GURPS.onGurpslink(event, this.actor, desc);
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    return super._updateObject(event, formData);
  }
}

export class GurpsActorCombatSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "sheet", "actor"],
      template: "systems/gurps/templates/combat-sheet.html",
      width: 550,
      height: 275,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }
}

export class GurpsActorEditorSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "gurpsactorsheet", "sheet", "actor"],
      template: "systems/gurps/templates/actor-sheet-gcs-editor.html",
			scrollY: [".gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipment #other_equipment #notes"], 
      width: 800,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

	makeAddDeleteMenu(html, cssclass, obj) {
		new ContextMenu(html, cssclass, this.addDeleteMenu(obj));
	}
	
	addDeleteMenu(obj) {
		return [
			{
				name: "Add Before",
				icon: "<i class='fas fa-edit'></i>",
				callback: e => {
					GURPS.insertBeforeKey(this.actor, e[0].dataset.key, duplicate(obj));
				}
			},
			{
				name: "Delete",
				icon: "<i class='fas fa-trash'></i>",
				callback: e => {
					GURPS.removeKey(this.actor, e[0].dataset.key);
				}
			},
			{
				name: "Add at the end",
				icon: "<i class='fas fa-edit'></i>",
				callback: e => {
					let p = e[0].dataset.key;
					let i = p.lastIndexOf(".");
					let objpath = p.substring(0, i);
					let o = GURPS.decode(this.actor.data, objpath);
					GURPS.put(o, duplicate(obj));
					this.actor.update({ [objpath] : o });
				}
			}
		];
	}
	
	headerMenu(name, obj, path) {
		return [ {
				name: "Add " + name + " at the end",
				icon: "<i class='fas fa-edit'></i>",
				callback: e => {
					let o = GURPS.decode(this.actor.data, path);
					GURPS.put(o, duplicate(obj));
					this.actor.update({ [path] : o });
				}
			} 
		];
	}
		

	makeHeaderMenu(html, cssclass, name, obj, path) {
		new ContextMenu(html, cssclass, this.headerMenu(name, obj, path));
	}

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".enc").click(this._onClickEnc.bind(this));
    html.find(".changeequip").click(this._onClickEquip.bind(this));

    this.makeHeaderMenu(html, ".reacthead", "Reaction", new Reaction("+0", "from ..."), "data.reactions");
		this.makeAddDeleteMenu(html, ".reactmenu", new Reaction("+0", "from ..."));

    this.makeHeaderMenu(html, ".meleehead", "Melee Attack", new Melee("New Attack"), "data.melee");
		this.makeAddDeleteMenu(html, ".meleemenu", new Melee("New Attack"));

    this.makeHeaderMenu(html, ".rangedhead", "Ranged Attack", new Ranged("New Attack"), "data.ranged");
		this.makeAddDeleteMenu(html, ".rangedmenu", new Ranged("New Attack"));

 		let opts = this.headerMenu("Advantage", new Advantage("New Advantage"), "data.ads").concat(
			this.headerMenu("Disadvantage", new Advantage("New Disadvantage"), "data.disads"));
		new ContextMenu(html, ".adshead", opts);
		this.makeAddDeleteMenu(html, ".adsmenu", new Advantage("New Advantage"));
		this.makeAddDeleteMenu(html, ".disadsmenu", new Advantage("New Disadvantage"));

    this.makeHeaderMenu(html, ".skillhead", "Skill", new Skill("New Skill"), "data.skills");
		this.makeAddDeleteMenu(html, ".skillmenu", new Skill("New Skill"));

    this.makeHeaderMenu(html, ".spellhead", "Spell", new Spell("New Spell"), "data.spells");
		this.makeAddDeleteMenu(html, ".spellmenu", new Spell("New Spell"));

    this.makeHeaderMenu(html, ".notehead", "Note", new Note("New Note"), "data.notes");
		this.makeAddDeleteMenu(html, ".notemenu", new Note("New Note"));
		
	  this.makeHeaderMenu(html, ".carhead", "Carried Equipment", new Equipment("New Equipment"), "data.equipment.carried");
    this.makeHeaderMenu(html, ".othhead", "Other Equipment", new Equipment("New Equipment"), "data.equipment.other");

		opts = this.addDeleteMenu(new Equipment("New Equipment"));
		opts.push( {
				name: "Add In (new Equipment will be contained by this)",
				icon: "<i class='fas fa-edit'></i>",
				callback: e => {
					let k = e[0].dataset.key + ".contains";
					let o = GURPS.decode(this.actor.data, k ) || {};
					GURPS.put(o, duplicate(new Equipment("New Equipment")));
					this.actor.update({ [k] : o });
				}
			});
		new ContextMenu(html, ".carmenu", opts);
		new ContextMenu(html, ".othmenu", opts);
	}
		
	async _onClickEquip(ev) {
		ev.preventDefault();
		let element = ev.currentTarget;
		let key = element.dataset.key;
		let eqt = GURPS.decode(this.actor.data, key);
		eqt.equipped = !eqt.equipped;
		await this.actor.update({ [key] : eqt });
	}
	
	async _onClickEnc(ev) {
		ev.preventDefault();
		let element = ev.currentTarget;
		let key = element.dataset.key;
		let encs = this.actor.data.data.encumbrance;
		if (encs[key].current) return;  // already selected
		for (let enckey in encs) {
			let enc = encs[enckey];
			let t = "data.encumbrance." + enckey + ".current";
			if (enc.current) {
				await this.actor.update({ [t] : false });
			}
			if (key === enckey) {
				await this.actor.update({ [t] : true });
			}
		} 
	}
}

export class GurpsActorSimplifiedSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "sheet", "actor"],
      template: "systems/gurps/templates/simplified.html",
      width: 820,
      height: 900,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  getData() {
    const data = super.getData();
		for (const e of Object.values(this.actor.data.data.encumbrance)) {
			if (e.current) data.dodge = e.dodge;
		}
		for (const e of Object.values(this.actor.data.data.hitlocations)) {
			if (e.penalty == 0) data.defense = e.dr;
		}
		return data;
	}

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".rollableicon").click(this._onClickRollableIcon.bind(this));

	}
	
	async _onClickRollableIcon(ev) {
		ev.preventDefault();
		let element = ev.currentTarget;
		let val = element.dataset.value;
		let parsed = parselink(val);
		GURPS.performAction(parsed.action, this.actor);
	}
}
