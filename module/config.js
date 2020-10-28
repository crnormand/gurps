export const GURPS = {};

GURPS.attributes = {
  "ST": "GURPS.ST",
  "DX": "GURPS.DX",
  "IQ": "GURPS.IQ",
  "HT": "GURPS.HT",
  "Will": "GURPS.WILL",
  "Per": "GURPS.PER"
};

GURPS.attributeNames = {
  "ST": "GURPS.ST.NAME",
  "DX": "GURPS.DX.NAME",
  "IQ": "GURPS.IQ.NAME",
  "HT": "GURPS.HT.NAME",
  "Will": "GURPS.WILL.NAME",
  "Per": "GURPS.PER.NAME"
};

GURPS.skillTypes = {
		"DX/E": "GURPS.Skill.DXE",
		"DX/A": "GURPS.Skill.DXA",
		"DX/H": "GURPS.Skill.DXH",
		"DX/VH": "GURPS.Skill.DXVH",

		"IQ/E": "GURPS.Skill.IQE",
		"IQ/A": "GURPS.Skill.IQA",
		"IQ/H": "GURPS.Skill.IQH",
		"IQ/VH": "GURPS.Skill.IQVH",

		"HT/E": "GURPS.Skill.HTE",
		"HT/A": "GURPS.Skill.HTA",
		"HT/H": "GURPS.Skill.HTH",
		"HT/VH": "GURPS.Skill.HTVH",

		"Will/E": "GURPS.Skill.WillE",
		"Will/A": "GURPS.Skill.WillA",
		"Will/H": "GURPS.Skill.WillH",
		"Will/VH": "GURPS.Skill.WillVH",

		"Per/E": "GURPS.Skill.PerE",
		"Per/A": "GURPS.Skill.PerA",
		"Per/H": "GURPS.Skill.PerH",
		"Per/VH": "GURPS.Skill.PerVH"
}

function xmlTextToJson(text) {
	var xml = new DOMParser().parseFromString(text, 'application/xml');
	return xmlToJson(xml);
}

function xmlToJson(xml) {
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};

function xmlToJsonNew(xml) {
  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) {
    // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) {
    // text
    obj = xml.nodeValue;
  }

  // do children
  // If all text nodes inside, get concatenated text from them.
  var textNodes = [].slice.call(xml.childNodes).filter(function(node) {
    return node.nodeType === 3;
  });
  if (xml.hasChildNodes() && xml.childNodes.length === textNodes.length) {
    obj = [].slice.call(xml.childNodes).reduce(function(text, node) {
      return text + node.nodeValue;
    }, "");
  } else if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof obj[nodeName] == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof obj[nodeName].push == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}


function objToString(obj, ndeep) {
  if(obj == null){ return String(obj); }
  switch(typeof obj){
    case "string": return '"'+obj+'"';
    case "function": return obj.name || obj.toString();
    case "object":
      var indent = Array(ndeep||1).join('\t'), isArray = Array.isArray(obj);
      return '{['[+isArray] + Object.keys(obj).map(function(key){
           return '\n\t' + indent + key + ': ' + objToString(obj[key], (ndeep||1)+1);
         }).join(',') + '\n' + indent + '}]'[+isArray];
    default: return obj.toString();
  }
}

function trim(s) {
	return s.replace(/^\s*$(?:\r\n?|\n)/gm,"");         // /^\s*[\r\n]/gm
}

function parselink(str) {
	return {
		"test": "null",
		"text": "<span class='gurpslink'>" + str + "</span>"
	}	
}

function gurpslink(str) {
	let found = -1;
	let output = "";
	for (let i = 0; i < str.length; i++)
	{
		if (str[i] == "[")
			found = ++i;
		if (str[i] == "]" && found >= 0) {
			output += str.substring(0, found);
			let action = this.parselink(str.substring(found, i));
			output += action.text;
			str = str.substr(i);
			i = 0;
		}
	}
	output += str;
	return output;
}

function onPdf(event) {
	let element = event.currentTarget;
	let t = element.innerText.trim();
	let i = t.indexOf(":");
	let book = "";
	let page = 0;
	if (i > 0) {
		book = t.substring(0, i).trim();
		page = parseInt(t.substr(i+1));
	} else {
		book = t.replace(/[0-9]*/g, "").trim();
		page = parseInt(t.replace(/[a-zA-Z]*/g, ""));
	}
	if (ui.PDFoundry) {
  	ui.PDFoundry.openPDFByCode(book, { page });
  } else {
    ui.notifications.warn('PDFoundry must be installed to use links.');
  }
}

	// Return the i18n string for this data path (note en.json must match up to the data paths).
	// special case, drop ".value" from end of path (and append "NAME")
function i18n(path, suffix) {
		let i = path.indexOf(".value");
		if (i >= 0) {
			path = path.substr(0, i) + "NAME";	// used for the attributes
		}
		
		path = path.replace(/\./g, "");	// remove periods
		return game.i18n.localize("GURPS." + path);
	}

function resolve(path, obj=self, separator='.') {
	    var properties = Array.isArray(path) ? path : path.split(separator)
	    return properties.reduce((prev, curr) => prev && prev[curr], obj)
	}


function onRoll(event, actor) {
		let element = event.currentTarget;
		  // Is Dice So Nice enabled ?
	  let niceDice = false;
	  try { niceDice = game.settings.get('dice-so-nice', 'settings').enabled; } catch {}
	
		let content = "";
		let dmgtype = "";
		let rollMods = "";
		let damageMods = "";
		
		let thing = "";
		let roll = new Roll("1d6 + 1d6 + 1d6 " + rollMods);
		
		if ("path" in element.dataset) {
			thing = this.i18n(element.dataset.path);
		}
		if ("name" in element.dataset) {
			thing = element.dataset.name.replace(/\(\)$/g, "");
		}
		if ("damage" in element.dataset) {
			let d = element.innerText;
			let i = d.indexOf(" ");
			if (i > 0) {
				dmgtype = d.substr(i+1);
				d = d.substring(0, i);
				let w = d.replace(/d([^6])/g, "d6$1");
				d= w.replace(/d$/g, "d6");
			}
			roll = new Roll(d + damageMods);
		}
		
		roll.roll();
		let rtotal = roll.total;
		if (rtotal < 0) rtotal = 0;
		if (!!thing) {
			let target = parseInt(element.innerText);	
			if (!target) return;
			let rdesc = "<b>" + rtotal + "</b>" + " <small>{ ";
			for (let i = 0; i < 6; i=i+2) 
				rdesc += roll.results[i] + " ";
			rdesc += "}</small>";
			let results = (roll.total <= target) ? "<span style='color:green'><b>Success!</b></span>  " : "<span style='color:red'><i>Failure</i></span>  ";
			content = "Roll vs " + thing + " [" + target + "]<br>" + results + rdesc;
		} else {
			content = "Does <b>" + rtotal + "</b> points of '" + dmgtype + "' damage";
		}
		
		const speaker = { alias: actor.name, _id: actor._id }
    let messageData = {
			user: game.user._id,
	    speaker: speaker,
	    content: content,
	    type: CONST.CHAT_MESSAGE_TYPES.OOC,
	    roll: roll
		};

		if (niceDice) {
			game.dice3d.showForRoll(roll).then((displayed) => { 
				CONFIG.ChatMessage.entityClass.create(messageData, {})});
		} else {
			messageData.sound = CONFIG.sounds.dice;
			CONFIG.ChatMessage.entityClass.create(messageData, {});
		}
	}
	
function onGurpslink(event, actor) {
	let element = event.currentTarget;
}


GURPS.xmlTextToJson = xmlTextToJson;
GURPS.objToString = objToString;
GURPS.trim = trim;
GURPS.gurpslink = gurpslink;
GURPS.parselink = parselink;
GURPS.i18n=i18n;
GURPS.resolve=resolve;
GURPS.onRoll=onRoll;
GURPS.onPdf=onPdf;
GURPS.onGurpslink=onGurpslink;