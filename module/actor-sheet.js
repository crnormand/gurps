/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class GurpsActorSheet extends ActorSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["gurps", "sheet", "actor"],
  	  template: "systems/gurps/templates/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
		data.config = CONFIG.GURPS;
		
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

		html.find(".rollable").click(this._onClickRoll.bind(this));
		
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

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

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    const canConfigure = game.user.isGM || (this.actor.owner && game.user.can("TOKEN_CONFIGURE"));
    if (this.options.editable && canConfigure) {
      buttons = [
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
		console.log("File Import Event:");
		console.log(event);
	    new Dialog({
	      title: `Import Data for: ${this.actor.name}`,
	      content: await renderTemplate("templates/apps/import-data.html", {entity: "Actor", name: '"' + this.actor.name + '"'}),
	      buttons: {
	        import: {
	          icon: '<i class="fas fa-file-import"></i>',
	          label: "Import",
	          callback: html => {
	            const form = html.find("form")[0];
	            if ( !form.data.files.length ) return ui.notifications.error("You did not upload a data file!");
	            readTextFromFile(form.data.files[0]).then(text => this.importFromGCS(text));
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

	importFromGCS(xml) {
		this.actor.importFromGCS(xml);
	}



  /* -------------------------------------------- */

	async _onClickRoll(event) {
		event.preventDefault();
		let element = event.currentTarget;
		console.log("Event:");
		console.log(event);
		console.log("Element:");
		console.log(element);
		console.log(element.dataset.type);
		console.log(element.textContent);
		let r = new Roll("3d6");
		console.log(this);
		console.log(r);

		  // Is Dice So Nice enabled ?
	  let niceDice = false;
	  try {
	    niceDice = game.settings.get('dice-so-nice', 'settings').enabled;      
	  } catch {
	    console.log("Dice-so-nice! not enabled");
	  }
	
	  // show 3d Dice so Nice if enabled
	  if (niceDice) {
	    game.dice3d.showForRoll(r).then((displayed) => {
	      let messageData = {
			    speaker: ChatMessage.getSpeaker(),
			    content: r.result,
			    type: CONST.CHAT_MESSAGE_TYPES.OOC,
			    roll: r
				};
	
	  		CONFIG.ChatMessage.entityClass.create(messageData, {})
	    });
	  } else {
	    r.roll();
	      let messageData = {
			    speaker: ChatMessage.getSpeaker(),
			    content: r.result,
			    type: CONST.CHAT_MESSAGE_TYPES.OOC,
			    roll: r
				};
	
	  		CONFIG.ChatMessage.entityClass.create(messageData, {})
	  }
	}


  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});
    
    // Remove attributes which are no longer used
    for ( let k of Object.keys(this.object.data.data.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {_id: this.object._id, "data.attributes": attributes});
    
    // Update the Actor
    return this.object.update(formData);
  }
}
