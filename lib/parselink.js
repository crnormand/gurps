/* Here is where we do all the work to try to parse the text inbetween [ ].
 Supported formats:
  +N <desc>
  -N <desc>
    add a modifier to the stack, using text as the description
  ST/IQ/DX[+-]N <desc>
    attribute roll with optional add/subtract
  CR: N <desc>
    Self control roll
  "Skill*" +/-N
    Roll vs skill (with option +/- mod)
  "ST12"
  "SW+1"/"THR-1"
  "PDF:B102"
  	
  "modifier", "attribute", "selfcontrol", "damage", "roll", "skill", "pdf"
*/
export default function parselink(str, htmldesc, clrdmods = false, knowntype) {
  if (str.length < 2)
    return { "text": str };

  // Modifiers
  if (str[0] === "+" || str[0] === "-") {
    let sign = str[0];
    let rest = str.substr(1);
    let parse = rest.replace(/^([0-9]+)+( .*)?/g, "$1~$2");
    if (parse != rest) {
      let a = parse.split("~");
      let desc = a[1].trim();
      if (!desc) desc = htmldesc || "";
      return {
        "text": gmspan(str, sign == "+", clrdmods),
        "action": {
          "type": "modifier",
          "mod": sign + a[0],
          "desc": desc
        }
      }
    }
  }

  // Attributes "ST+2 desc, Per"
  let parse = str.replace(/^(\w+)([+-]\d+)?(.*)$/g, "$1~$2~$3")
  let a = parse.split("~");
  let path = GURPS.attributepaths[a[0]];
  if (!!path) {
    return {
      "text": gspan(str),
      "action": {
        "type": "attribute",
        "attribute": a[0],
        "path": path,
        "desc": a[2].trim(),		// Action description, not modifier desc
        "mod": a[1]
      }
    }
  }

  // Special case where they are makeing a targeted roll, NOT using their own attributes.  ST26.  Does not support mod (no ST26+2)
  parse = str.replace(/^([a-zA-Z]+)(\d+)(.*)$/g, "$1~$2~$3")
  if (parse != str) {
    a = parse.split("~");
    path = GURPS.attributepaths[a[0]];
    if (!!path) {
      let n = parseInt(a[1]);
      if (n) {
        return {
          "text": gspan(str),
          "action": {
            "type": "attribute",
            "target": n,
            "desc": a[2].trim(),  // Action description, not modifier desc
            "path": path
          }
        }
      }
    }
  }

  // Self control roll CR: N
  let two = str.substr(0, 2);
  if (two === "CR" && str.length > 2 && str[2] === ":") {
    let rest = str.substr(3).trim();
    let num = rest.replace(/([0-9]+).*/g, "$1");
    let desc = rest.replace(/[0-9]+ *(.*)/g, "$1");
    return {
      "text": gspan(str),
      "action": {
        "type": "selfcontrol",
        "target": parseInt(num),
        "desc": desc
      }
    }
  }

  // Straight roll, no damage type. 4d, 2d-1, etc.   Allows "!" suffix to indicate minimum of 1.
  parse = str.replace(/^(\d+)d([-+]\d+)?( \(\d+\) )?(!)? ?(.*)$/g, "$1~$2~$3~$4~$5")
  if (parse != str) {
    let a = parse.split("~");
    let d = a[4].trim();
    let m = GURPS.woundModifiers[d];
    if (!m) {		// Not one of the recognized damage types
      return {
        "text": gspan(str),
        "action": {
          "type": "roll",
          "formula": a[0] + "d" + a[1] + a[2] + a[3],				// a[2] and a[3] should never happen together
          "desc": d			// Action description
        }
      }
    } else {	// Damage roll 1d+2 cut.   Not allowed an action desc
      return {
        "text": gspan(str),
        "action": {
          "type": "damage",
          "formula": a[0] + "d" + a[1] + a[2] + a[3],				// a[2] and a[3] should never happen together
          "damagetype": d
        }
      }
    }
  }


  // for PDF link
  parse = str.replace(/^PDF: */g, "");
  if (parse != str) {
    return { "text": "<span class='pdflink'>" + parse + "</span>", action: true };  // Just get rid of the "[PDF:" and allow the pdflink css class to do the work
  }


  // SW and THR damage
  parse = str.replace(/^(SW|THR)([-+]\d+)?(!)?( .*)?$/g, "$1~$2~$3~$4")
  if (parse != str) {
    let a = parse.split("~");
    let d = a[3].trim();
    let m = GURPS.woundModifiers[d];
    if (!!m) {
      return {
        "text": gspan(str),
        "action": {
          "type": "deriveddamage",
          "derivedformula": a[0],
          "formula": a[1] + a[2],
          "damagetype": d
        }
      }
    } else
      return {
        "text": gspan(str),
        "action": {
          "type": "derivedroll",
          "derivedformula": a[0],
          "formula": a[1] + a[2],
          "desc": d
        }
			}
  }


	// Simple, no-spaces, no quotes skill/spell name (with optional *)
	parse = str.replace(/^S:([^ "+-]+\*?)([-+]\d+)? ?(.*)/g, "$1~$2~$3");
  if (parse == str) {
		// Use quotes to capture skill/spell name (with as many * as they want to embed)
		parse = str.replace(/^S:"([^"]+)"([-+]\d+)? ?(.*)/g, "$1~$2~$3");
	}
	if (parse != str) {
    let a = parse.split("~");
    let n = a[0].trim();				// semi-regex pattern of skill/spell name (minus quotes)
    if (!!n) {
			let spantext = n;					// What we show in the highlighted span (yellow)
			let moddesc = "";
			let comment = a[2];
			if (!!a[1]) {							// If there is a +-mod, then the comment is the desc of the modifier
					spantext += a[1] + " " + a[2];
					moddesc = a[2];
					comment = "";
			}
			let action = {
          "type": "skill-spell",
          "name": n,
          "mod": a[1],
          "desc": moddesc
				};
      return {
        "text": gspan(spantext, "<b>S:</b>", action, comment),
        "action": action
      }
    }
  }

	// Simple, no-spaces, no quotes melee/ranged name (with optional *s)
	parse = str.replace(/^A:([^ "+-]+\*?)([-+]\d+)? ?(.*)/g, "$1~$2~$3");
  if (parse == str) {
		// Use quotes to capture skill/spell name (with optional *s)
		parse = str.replace(/^A:"([^"]+)"([-+]\d+)? ?(.*)/g, "$1~$2~$3");
	}
	if (parse != str) {
    let a = parse.split("~");
    let n = a[0].trim();				// semi-regex pattern of skill/spell name (minus quotes)
    if (!!n) {
			let spantext = n;					// What we show in the highlighted span (yellow)
			let moddesc = "";
			let comment = a[2];
			if (!!a[1]) {							// If there is a +-mod, then the comment is the desc of the modifier
					spantext += a[1] + " " + a[2];
					moddesc = a[2];
					comment = "";
			}
			let action = {
          "type": "attack",
          "name": n,
          "mod": a[1],
          "desc": moddesc
				};
      return {
        "text": gspan(spantext, "<b>A:</b>", action, comment),
        "action": action
      }
    }
  }

	if (str === "Dodge") {
		let action = {
      "type": "dodge"
		};
		return {
      "text": gspan(str, "", action),
      "action": action			
		}
	}

  return { "text": str };
}


function gmspan(str, plus, clrdmods) {
  if (clrdmods) {
    if (plus)
      return "<span class='glinkmodplus'>" + str + "</span>";
    else
      return "<span class='glinkmodminus'>" + str + "</span>";
  }
  return "<span class='glinkmod'>" + str + "</span>";
}

function gspan(str, prefix, action, comment) {
	let s = !!prefix ? prefix : "";
  s += "<span class='gurpslink'";
	if (!!action) s += " data-action='" + btoa(JSON.stringify(action)) + "'";
	s += ">" + str.trim() + "</span>";
	if (!!comment)
		s += " " + comment;
	return s;
}
