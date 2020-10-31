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
		sheetData.config = game.GURPS;
				
    return sheetData;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

		html.find(".rollable").click(this._onClickRoll.bind(this));
		html.find(".pdflink").click(this._onClickPdf.bind(this));
		html.find(".gurpslink").click(this._onClickGurpslink.bind(this));
		html.find(".gmod").click(this._onClickGmod.bind(this));
		html.find(".glinkmod").click(this._onClickGmod.bind(this));
	
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
	      title: `Import GCS data (FG XML) for: ${this.actor.name}`,
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

export class GurpsActorSheetGCS extends GurpsActorSheet {
	  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["gurps", "sheet", "actor"],
  	  template: "systems/gurps/templates/actor-sheet-gcs.html",
      width: 800,
      height: 800,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

}
