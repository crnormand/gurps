'use strict'

export function displayMod(mod) {
  if (!mod) mod = "0";
  let n = mod.toString();
  if (n[0] != '-' && n[0] != '+') n = "+" + n;
  return n;
}

export function makeSelect(array) {
  let groups = [];
  let ans = { title: array[0], groups: groups };  // The title line.   Since we don't allow the select's to change, the first element in the select acts as its title.

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