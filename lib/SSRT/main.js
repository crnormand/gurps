/*

	Stolen (with permission) from 
		https://gitlab.com/gurps-foundry/ssrt-lib and 
		https://gitlab.com/gurps-foundry/size-speed-range

	Thank you @Exxar
*/


import { getRulerSegmentLabel } from './ruler.js';
import { isMessageSRLookup, isMessageSMLookup, ssrtLookup } from './ssrt-lookup.js';

Hooks.on('chatMessage', (log, content, data) => {
    if (isMessageSRLookup(content) || isMessageSMLookup(content)) {
        ChatMessage.create({ content: ssrtLookup(content), user: game.user._id, type: CONST.CHAT_MESSAGE_TYPES.OTHER });
        return false;
    }
});

Hooks.on('ready', () => {
    Ruler.prototype._getSegmentLabel = getRulerSegmentLabel;
		Ruler.prototype._endMeasurementOrig=Ruler.prototype._endMeasurement;
		
		Ruler.prototype._endMeasurement = function ()  {
			this._endMeasurementOrig();
			game.GURPS.ModifierBucket.addTempRangeMod();
		}
});
