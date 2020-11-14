'use strict'

export function displayMod(mod) {
  if (!mod) mod = "0"
  let n = mod.toString()
  if (n[0] != '-' && n[0] != '+') n = "+" + n
  return n
}

/* For really big lists, use Select Optgroups.   

The first line is the "title", followed by Optgroup names, then options in 
that optgroup.

Use the function makeSelect() to convert an array of strings into a data 
structure that can be displayed with the following:

  data.posturemods = makeSelect(game.GURPS.CoverPostureModifiers);

  <select id="modposture">
    <option>{{posturemods.title}}</option>
    {{#each posturemods.groups}}
      <optgroup label="{{this.group}}">
      {{#each this.options}}
        <option value="{{this}}">{{this}}</option>
      {{/each}}
      </optgroup>
    {{/each}}
  </select>
*/
export function makeSelect(array) {
  let groups = []

  // The title line. Since we don't allow the select's to change, the first element in the select acts as its title.
  let ans = { title: array[0], groups: groups }

  let current = []
  for (let i = 1; i < array.length; i++) {
    let line = array[i]
    if (line[0] == "*") {
      current = []
      groups.push({ group: line.substr(1), options: current })
    } else {
      current.push(line)
    }
  }
  return ans
}

// Trick to make a nice break between items, instead of "---"
export function horiz(text, size = 10) {
  let s = "<span style='text-decoration:line-through'>"
  let line = s
  for (let i = 0; i < size; i++)
    line += "&nbsp;"
  line += "</span>"
  line += " " + text + " "
  line += s
  for (let i = 0; i < size; i++)
    line += "&nbsp;"
  line += "</span>"
  return line
}

/*
  Convert XML text into a JSON object
*/
export function xmlTextToJson(text) {
  var xml = new DOMParser().parseFromString(text, 'application/xml')
  return xmlToJson(xml)
}

/*
  Convert a DOMParsed version of the XML, return a JSON object.
*/
export function xmlToJson(xml) {

  // Create the return object
  var obj = {}

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {}
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j)
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue
  }

  // do children
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i)
      var nodeName = item.nodeName
      if (typeof (obj[nodeName]) == "undefined") {
        obj[nodeName] = xmlToJson(item)
      } else {
        if (typeof (obj[nodeName].push) == "undefined") {
          var old = obj[nodeName]
          obj[nodeName] = []
          obj[nodeName].push(old)
        }
        obj[nodeName].push(xmlToJson(item))
      }
    }
  }
  return obj
};

export function d6ify(str) {
  let w = str.replace(/d([^6])/g, "d6$1");		// Find 'd's without a 6 behind it, and add it.
  return w.replace(/d$/g, "d6"); 								// and do the same for the end of the line.
}

export function isNiceDiceEnabled() {
  // Is Dice So Nice enabled ?
  let niceDice = false
  try { niceDice = game.settings.get('dice-so-nice', 'settings').enabled } catch { }
  return niceDice
}