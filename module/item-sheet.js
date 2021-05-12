'use strict'
import { Melee, Ranged, Skill, Spell, Advantage } from './actor.js'


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
    data.data.eqt.f_count = this.item.data.data.eqt.count   // hack for Furnace module
    data.name = this.item.name
     return data;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    this.html = html
    super.activateListeners(html);
    
    html.find('#itemname').change(ev =>
      this.item.update({ 
        "data.eqt.name": ev.currentTarget.value,
        "name": ev.currentTarget.value }))
    html.find('.count').change(ev => 
      this.item.update({ "data.eqt.count": parseInt(ev.currentTarget.value) }))

    html.find('#item1').click(ev => {
      ev.preventDefault()
      let m = new Melee()
      m.name  = this.item.name
      m.level = 14
      m.damage = '2d cut'
      m.mode = 'swing'
      m.otf = 'DX-1'
      m.weight = 99
      m.techlevel = 'tl99'
      m.cost = 99
      m.reach = '99'
      m.parry = '9'
      m.block = '8'
      let melee = this.item.data.data.melee
      GURPS.put(melee, m)
      this.item.update({ "data.melee" : melee })
    })
    html.find('#item2').click(ev => {
      ev.preventDefault()
      let r = new Ranged()
      r.name = this.item.name
      r.otf = 'DX-2'
      r.type = 'DX/E'
      r.bulk = 1
      r.legalityclass = "lc"
      r.ammo = ""
      r.mode = ""
      r.level = 13
      r.damage = "1d+1 imp"
      r.acc = 3
      r.rof = 1
      r.shots = ""
      r.rcl = ""
      let list = this.item.data.data.ranged
      GURPS.put(list, r)
      this.item.update({ "data.ranged" : list })
    })
    html.find('#item3').click(ev => {
      ev.preventDefault()
      let r = new Skill()
      r.name = "Skill for " + this.item.name
      r.otf = 'IQ-4|Traps-2'
      r.level = 11
      r.relativelevel = "IQ-4"
      let list = this.item.data.data.skills
      GURPS.put(list, r)
      this.item.update({ "data.skills" : list })
    })
  }
}
