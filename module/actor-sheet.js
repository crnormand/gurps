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
    const sheetData = super.getData();
		sheetData.config = CONFIG.GURPS;
				
    return sheetData;
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
		console.log("GCS File Import Event:");
		console.log(event);
	    new Dialog({
	      title: `Import GCS export data (FG XML) for: ${this.actor.name}`,
	      content: await renderTemplate("systems/gurps/templates/import-gcs-v1-data.html", {entity: "Actor", name: '"' + this.actor.name + '"'}),
	      buttons: {
	        import: {
	          icon: '<i class="fas fa-file-import"></i>',
	          label: "Import",
	          callback: html => {
	            const form = html.find("form")[0];
	            if ( !form.data.files.length ) return ui.notifications.error("You did not upload a data file!");
	            readTextFromFile(form.data.files[0]).then(text => this.actor.importFromGCSv1(text));
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

	// Return the i18n string for this data path (note en.json must match up to the data paths).
	// special case, drop ".value" from end of path (and append "NAME")
	i18n(path, suffix) {
		let i = path.indexOf(".value");
		if (i >= 0) {
			path = path.substr(0, i) + "NAME";	// used for the attributes
		}
		
		path = path.replace(/\./g, "");	// remove periods
		return game.i18n.localize("GURPS." + path);
	}

	resolve(path, obj=self, separator='.') {
	    var properties = Array.isArray(path) ? path : path.split(separator)
	    return properties.reduce((prev, curr) => prev && prev[curr], obj)
	}

	async _onClickRoll(event) {
		event.preventDefault();
		let element = event.currentTarget;
/*		console.log("Event:");
		console.log(event);
		console.log("Element:");
		console.log(element);
		console.log("Path:" + element.dataset.path);
		console.log(element.textContent);
		console.log(this);
		console.log(r);
*/
		  // Is Dice So Nice enabled ?
	  let niceDice = false;
	  try { niceDice = game.settings.get('dice-so-nice', 'settings').enabled; } catch {}
	
		let mods = "";
		let thing = "";
		if (!!element.dataset.path) {
			thing = this.i18n(element.dataset.path);
		}
		if (!!element.dataset.name) {
			thing = element.dataset.name;
		}
		let target = parseInt(element.innerText);	

		let roll = new Roll("1d6 + 1d6 + 1d6" + mods);
	  roll.roll();

		let results = (roll.total <= target) ? "<span style='color:green'><b>Success!</b></span>  " : "<span style='color:red'><i>Failure</i></span>  ";
		results += "<b>" + roll.total + "</b> {" + roll.results.filter(d => d != "+") + "}";
		let content = "Roll vs " + thing + " [" + target + "]<br>" + results;
		const speaker = { alias: this.actor.name, _id: this.actor._id }
    let messageData = {
			user: game.user._id,
	    speaker: speaker,
	    content: content,
	    type: CONST.CHAT_MESSAGE_TYPES.OOC,
	    roll: roll
		};

	  CONFIG.ChatMessage.entityClass.create(messageData, {})
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

    return super._updateObject(event, formData);
  }
}

export class GurpsActorSheetGCS extends GurpsActorSheet {
	  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["gurps", "sheet", "actor"],
  	  template: "systems/gurps/templates/actor-sheet-gcs.html",
      width: 730,
      height: 800,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

}
