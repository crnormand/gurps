'use strict'
import { Melee, Ranged, Skill, Spell, Advantage } from './actor.js'
import { digitsAndDecimalOnly, digitsOnly } from '../lib/jquery-helper.js'
import { recurselist } from '../lib/utilities.js'

export class GurpsItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['sheet', 'item'],
      template: 'systems/gurps/templates/item-sheet.html',
      width: 680,
      height: 'auto',
      resizable: false,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.content', initial: 'melee-tab' }],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const sheetData = super.getData()
    sheetData.data = sheetData.data.data
    sheetData.data.eqt.f_count = this.item.data.data.eqt.count // hack for Furnace module
    sheetData.name = this.item.name
    console.log(sheetData)
    return sheetData
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    this.html = html
    super.activateListeners(html)

    html.find('.digits-only').inputFilter(value => digitsOnly.test(value))
    html.find('.decimal-digits-only').inputFilter(value => digitsAndDecimalOnly.test(value))
    html.find('#itemname').change(ev => {
      let nm = ev.currentTarget.value
      let commit = {
        'data.eqt.name': nm,
        name: nm
      }
      recurselist(this.item.data.data.melee, (e, k, d) => {
        commit = {...commit, ...{ ['data.melee.' + k + ".name"]: nm }}
      })
      recurselist(this.item.data.data.ranged, (e, k, d) => {
        commit = {...commit, ...{ ['data.melee.' + k + ".name"]: nm }}
      })
      this.item.update(commit)
    })
//    html.find('#quantity').change(ev => this.item.update({ 'data.eqt.count': parseInt(ev.currentTarget.value) }))

    html.find('#add-melee').click(ev => {
      ev.preventDefault()
      let m = new Melee()
      m.name = this.item.name
      this._addToList('melee', m)
    })

    html.find('.delete.button').click(this._deleteKey.bind(this))

    html.find('#add-ranged').click(ev => {
      ev.preventDefault()
      let r = new Ranged()
      r.name = this.item.name
      r.legalityclass = 'lc'
      this._addToList('ranged', r)
    })

    html.find('#add-skill').click(ev => {
      ev.preventDefault()
      let r = new Skill()
      r.rsl = '-'
      this._addToList('skills', r)
    })

    html.find('#add-spell').click(ev => {
      ev.preventDefault()
      let r = new Spell()
      this._addToList('spells', r)
    })

    html.find('#add-ads').click(ev => {
      ev.preventDefault()
      let r = new Advantage()
      this._addToList('ads', r)
    })
  }

  async _deleteKey(ev) {
    let key = ev.currentTarget.getAttribute('name')
    let path = ev.currentTarget.getAttribute('data-path')
    GURPS.removeKey(this.item, path + '.' + key)
  }

  async _onDrop(event) {
    let dragData = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (!['melee', 'ranged', 'skills', 'spells', 'ads', 'equipment'].includes(dragData.type)) return
    let srcActor = game.actors.get(dragData.actorid)
    let srcData = getProperty(srcActor.data, dragData.key)
    if (dragData.type == 'equipment') {
      this.item.update({
        name: srcData.name,
        'data.eqt': srcData,
      })
      return
    }
    this._addToList(dragData.type, srcData)
  }

  _addToList(key, data) {
    let list = this.item.data.data[key] || {}
    GURPS.put(list, data)
    this.item.update({ ['data.' + key]: list })
  }

  close() {
    super.close()
    this.item.update({"data.eqt.name": this.item.name})
    if (!!this.object.editingActor) this.object.editingActor.updateItem(this.object)
  }
}
