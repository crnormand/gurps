import { parselink } from '../lib/parselink.js'

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
    
    
    html.on("drop", function(event) {
        event.preventDefault();  
        event.stopPropagation();
        let dragData = JSON.parse(event.originalEvent?.dataTransfer?.getData('text/plain'))
        if (!!dragData && !!dragData.actor && !!dragData.otf) {
          let action = parselink(dragData.otf)
          action.action.blindroll = true
          GURPS.performAction(action.action, game.actors.get(dragData.actor))
        }
    });
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