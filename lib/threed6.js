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
		let action = {
				type: "roll",
				formula: "3d6",
				desc: ""
		};
		GURPS.performAction(action, GURPS.LastActor || game.user, event);
	}

 	async _onRightClick(event) {
		event.preventDefault();
		let action = {
				type: "roll",
				formula: "1d6",
				desc: ""
		};
		GURPS.performAction(action, GURPS.LastActor || game.user, event);
	}
}