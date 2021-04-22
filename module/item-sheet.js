'use strict'
import { Melee } from './actor.js'


export class GurpsItemSheet extends ItemSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["gurps", "sheet", "item"],
			template: "systems/gurps/templates/item-sheet.html",
			width: 620,
			height: 200,
		});
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.data.eqt.f_count = data.data.eqt.count
    data.name = data.item.name
     return data;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    this.html = html
    super.activateListeners(html);

    html.find('#item1').click(ev => {
      ev.preventDefault()
      let m = new Melee('Test Melee Weapon 1', 14, '2d cut')
      m.mode = 'swing'
      m.weight = '99 lbs'
      m.techlevel = 'tl99'
      m.cost = '99'
      m.reach = '99'
      m.parry = '9'
      m.block = '8'
      let melee = this.object.data.data.melee
      GURPS.put(melee, m)
      this.object.update({ "data.melee" : melee })
    })

    html.find('#save').click(ev => {
      ev.preventDefault()
      this.save()
    })

  }

  save() {
    //this.object.update({ "name": obj.name })
    this.close()
  }

}
