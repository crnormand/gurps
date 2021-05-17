'use strict'
import { Melee, Ranged, Skill, Spell, Advantage } from './actor.js'
import { digitsAndDecimalOnly, digitsOnly } from '../lib/jquery-helper.js'
import { objectToArray, arrayToObject } from '../lib/utilities.js'

export class GurpsItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['sheet', 'item'],
      template: 'systems/gurps/templates/item-sheet.html',
      width: 620,
      height: 'auto',
      resizable: false,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.content', initial: 'melee-tab' }],
    })
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData()
    data.data.eqt.f_count = this.item.data.data.eqt.count // hack for Furnace module
    data.name = this.item.name

    return data
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    this.html = html
    super.activateListeners(html)

    html.find('.digits-only').inputFilter(value => digitsOnly.test(value))
    html.find('.decimal-digits-only').inputFilter(value => digitsAndDecimalOnly.test(value))
    html.find('#itemname').change(ev =>
      this.item.update({
        'data.eqt.name': ev.currentTarget.value,
        name: ev.currentTarget.value,
      })
    )
    html.find('.count').change(ev => this.item.update({ 'data.eqt.count': parseInt(ev.currentTarget.value) }))

    html.find('#item4').click(ev => {
      this.item.update({
        'data.equipped': true,
        'data.bonuses': `DX+10
S:Fast*+20
iq+30
PER+1
HT-8
A:Rapier+99`,
      })
    })

    html.find('#add-melee').click(ev => {
      ev.preventDefault()
      let m = new Melee()
      m.name = this.item.name
      let melee = this.item.data.data.melee || {}
      GURPS.put(melee, m)
      this.item.update({ 'data.melee': melee })
    })

    html.find('.delete.button').click(this._deleteKey.bind(this))

    html.find('#add-ranged').click(ev => {
      ev.preventDefault()
      let r = new Ranged()
      r.name = this.item.name
      r.legalityclass = 'lc'
      let list = this.item.data.data.ranged || {}
      GURPS.put(list, r)
      this.item.update({ 'data.ranged': list })
    })

    html.find('#item3').click(ev => {
      ev.preventDefault()
      let r = new Skill()
      r.name = 'Skill for ' + this.item.name
      r.otf = 'IQ-4|Traps-2'
      r.level = 11
      r.relativelevel = 'IQ-4'
      let list = this.item.data.data.skills
      GURPS.put(list, r)
      this.item.update({ 'data.skills': list })
    })
  }

  async _deleteKey(ev) {
    let key = ev.currentTarget.getAttribute('name')
    let path = ev.currentTarget.getAttribute('data-path')
    let temp = path.split('.').reduce(function (a, b) {
      return a && a[b]
    }, this.item.data)

    // make a copy
    let feature = { ...temp }

    // remove the key
    delete feature[`${key}`]

    // reorder the keys
    feature = arrayToObject(objectToArray(feature), 5)

    // delete
    let toDelete = path.substr(0, path.lastIndexOf('.')) + '.-=' + path.substr(path.lastIndexOf('.') + 1)
    let update = { [toDelete]: null }
    await this.item.update(update)

    // update
    update = { [path]: feature }
    await this.item.update(update)
    this.render(false)
  }

  close() {
    super.close()
    if (!!this.object.editingActor) this.object.editingActor.updateItem(this.object)
  }
}
