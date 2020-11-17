export class ThreeD6 extends Application {
	constructor(options = {}) {
		super(options)
	}
	
	getData(options) {
		const data = super.getData(options);
		return data;
	}
	
	activateListeners(html) {
		super.activateListeners(html);
		html.find("#threed6").click(this._onClick.bind(this));
		html.find("#threed6").contextmenu(this._onRightClick.bind(this));
	}
	
	refresh() {
		this.render(true);
	}

 	async _onClick(event) {
		event.preventDefault();
		GURPS.doRoll((!!GURPS.LastActor) ? GURPS.LastActor: game.user, "3d6", null, "", "");
	}

 	async _onRightClick(event) {
		event.preventDefault();
		GURPS.doRoll((!!GURPS.LastActor) ? GURPS.LastActor: game.user, "1d6", null, "", "");
	}
}