import { GURPS } from "./gurps.js";
import { isNiceDiceEnabled } from '../lib/utilities.mjs'

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
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /* -------------------------------------------- */

	flt(str) {
		return !!str ? parseFloat(str): 0;
	}
	
	sum(dict, type) {
		if (!dict) return 0.0;
		let sum = 0;
		for(let k in dict) {
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
			othercost: this.sum(eqt.other, "cost") };
    return sheetData;
  }

  /* -------------------------------------------- */

  decode(obj, path, all) {
    let p = path.split(".");
    let end = p.length;
    if (!all) end = end - 1;
    for (let i = 0; i < end; i++) {
      let q = p[i];
      obj = obj[q];
    }
    return obj;
  }


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

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    new ContextMenu(html, ".gcs-edit-name", [
      {
        name: "Edit",
        icon: "<i class='fas fa-edit'></i>",
        callback: element => {
          let path = element[0].dataset.path;
          let nm = this.decode(this.actor.data, path, true);
          const template = "<div class='form-group' style='display:flex; flex-direction:column'><h1>Edit Name</h1><input id='tempinput' type='text' value='" + nm + "'></div>"
          new Dialog({
            title: "Edit Name",
            content: template,
            buttons: {
              "ok": {
                label: "Done",
                callback: async (html) => {
                  let v = html.find("#tempinput")[0].value;
                  let o = this.decode(this.actor.data, path, false);
                  let p = path.split(".");
                  o[p[p.length - 1]] = v
                }
              }
            }
          }).render(true);
        }
      }
    ]);

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _onDrop(event) {
    let dragData = JSON.parse(event.dataTransfer.getData("text/plain"));

    if (dragData.type === 'damageItem') {
      renderTemplate('systems/gurps/templates/damage-location.html').then(dlg => {
        new Dialog({
          title: 'Apply Damage',
          content: dlg,
          buttons: {
            cancel: {
              label: 'Cancel',
              callback: (dlg) => {
                console.log('cancel')
              }
            },
            apply: {
              label: 'Apply',
              callback: (dlg) => {
                var location = dlg.find('input[name="hitlocation"]:checked')[0]
                console.log(location.value)
                this.applyDamage(location.value, dragData.payload)
              }
            }
          },
          default: 'apply'
        }).render(true)
      })
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
    console.log(hitLocationTable)
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

      renderTemplate('systems/gurps/templates/random-hitloc.html', contentData).then(html => {
        const speaker = { alias: this.actor.name, _id: this.actor._id }
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
        CONFIG.ChatMessage.entityClass.create(messageData);

        this.applyDamageToSpecificLocation(contentData.location, damage)
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
    let woundingModifier = GURPS.woundModifiers[damage.damageType]
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

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    const sheet = this.actor.getFlag("core", "sheetClass")

    // Token Configuration
    const canConfigure = game.user.isGM || this.actor.owner;
    if (this.options.editable && canConfigure) {
      buttons = [
        {
          label: (sheet === "gurps.GurpsActorCombatSheet")
            ? "Full View"
            : "Combat View",
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
      ].concat(buttons);
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
    const newSheet = (original === "gurps.GurpsActorCombatSheet")
      ? "gurps.GurpsActorSheetGCS"
      : "gurps.GurpsActorCombatSheet"

    await this.actor.sheet.close()

    // Update the Entity-specific override
    await this.actor.setFlag("core", "sheetClass", newSheet)

    // Re-draw the updated sheet
    const updated = this.actor.getFlag("core", "sheetClass")
    console.log("updated: " + updated)
    this.actor.sheet.render(true)
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
