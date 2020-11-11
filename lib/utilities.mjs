'use strict'

export function displayMod(mod) {
  if (!mod) mod = "0";
  let n = mod.toString();
  if (n[0] != '-' && n[0] != '+') n = "+" + n;
  return n;
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
  let groups = [];

  // The title line. Since we don't allow the select's to change, the first element in the select acts as its title.
  let ans = { title: array[0], groups: groups };

  let current = [];
  for (let i = 1; i < array.length; i++) {
    let line = array[i];
    if (line[0] == "*") {
      current = [];
      groups.push({ group: line.substr(1), options: current });
    } else {
      current.push(line);
    }
  }
  return ans;
}

// Trick to make a nice break between items, instead of "---"
export function horiz(text, size = 10) {
  let s = "<span style='text-decoration:line-through'>";
  let line = s;
  for (let i = 0; i < size; i++)
    line += "&nbsp;";
  line += "</span>";
  line += " " + text + " ";
  line += s;
  for (let i = 0; i < size; i++)
    line += "&nbsp;";
  line += "</span>";
  return line;
}

