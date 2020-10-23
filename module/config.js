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

GURPS.xmlTextToJson = xmlTextToJson;
GURPS.objToString = objToString;
GURPS.trim=trim;
