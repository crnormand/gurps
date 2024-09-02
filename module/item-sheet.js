'use strict'
import { _Base, Melee, Skill, Spell, Advantage, Ranged } from './actor/actor-components.js'
import { digitsAndDecimalOnly, digitsOnly } from '../lib/jquery-helper.js'
import { recurselist } from '../lib/utilities.js'
import * as Settings from '../lib/miscellaneous-settings.js'

export class GurpsItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['sheet', 'item'],
      template: 'systems/gurps/templates/item-sheet.html',
      width: 680,
      height: 'auto',
      resizable: false,
      tabs: [{ navSelector: '.gurps-sheet-tabs', contentSelector: '.content', initial: 'melee-tab' }],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const sheetData = super.getData()
    sheetData.data = this.item.system
    sheetData.system = this.item.system
    sheetData.data.eqt.f_count = this.item.system.eqt.count // hack for Furnace module
    sheetData.name = this.item.name
    if (!this.item.system.globalid && !this.item.parent)
      this.item.update({ 'system.globalid': this.item.id, _id: this.item.id })
    return sheetData
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    this.html = html
    super.activateListeners(html)

    html.find('.digits-only').inputFilter(value => digitsOnly.test(value))
    html.find('.decimal-digits-only').inputFilter(value => digitsAndDecimalOnly.test(value))
    html.find('#itemname').change(async ev => {
      let nm = ev.currentTarget.value
      let commit = {
        'system.eqt.name': nm,
        name: nm,
      }
      recurselist(this.item.system.melee, (e, k, d) => {
        commit = { ...commit, ...{ ['system.melee.' + k + '.name']: nm } }
      })
      recurselist(this.item.system.ranged, (e, k, d) => {
        commit = { ...commit, ...{ ['system.ranged.' + k + '.name']: nm } }
      })
      await this.item.update(commit)
    })
    //    html.find('#quantity').change(ev => this.item.update({ 'system.eqt.count': parseInt(ev.currentTarget.value) }))

    html.find('#add-melee').click(async ev => {
      ev.preventDefault()
      let m = new Melee()
      m.name = this.item.name
      await this._addToList('melee', m)
    })

    html.find('.delete.button').click(this._deleteKey.bind(this))

    html.find('#add-ranged').click(async ev => {
      ev.preventDefault()
      let r = new Ranged()
      r.name = this.item.name
      r.legalityclass = 'lc'
      await this._addToList('ranged', r)
    })

    html.find('#add-skill').click(async ev => {
      ev.preventDefault()
      let r = new Skill()
      r.rsl = '-'
      await this._addToList('skills', r)
    })

    html.find('#add-spell').click(async ev => {
      ev.preventDefault()
      let r = new Spell()
      await this._addToList('spells', r)
    })

    html.find('#add-ads').click(async ev => {
      ev.preventDefault()
      let r = new Advantage()
      await this._addToList('ads', r)
    })

    html.find('textarea').on('drop', this.dropFoundryLinks)
    html.find('input').on('drop', this.dropFoundryLinks)

    html.find('.itemdraggable').each((_, li) => {
      li.setAttribute('draggable', true)
      li.addEventListener('dragstart', ev => {
        let img = new Image()
        img.src = this.item.img
        const w = 50
        const h = 50
        const preview = DragDrop.createDragImage(img, w, h)
        ev.dataTransfer.setDragImage(preview, 0, 0)
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            type: 'Item',
            id: this.item.id,
            uuid: this.item.uuid,
            pack: this.item.pack,
            itemData: this.item.system,
          })
        )
      })
    })
  }

  dropFoundryLinks(ev) {
    if (!!ev.originalEvent) ev = ev.originalEvent
    let dragData = JSON.parse(ev.dataTransfer.getData('text/plain'))
    var n
    if (dragData.type == 'JournalEntry') {
      n = game.journal.get(dragData.id).name
    }
    if (dragData.type == 'Actor') {
      n = game.actors.get(dragData.id).name
    }
    if (dragData.type == 'RollTable') {
      n = game.tables.get(dragData.id).name
    }
    if (dragData.type == 'Item') {
      n = game.items.get(dragData.id).name
    }
    if (!!n) {
      let add = ` [${dragData.type}[${dragData.id}]` + '{' + n + '}]'
      $(ev.currentTarget).val($(ev.currentTarget).val() + add)
    }
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
    let srcData = foundry.utils.getProperty(srcActor, dragData.key)
    srcData.contains = {} // don't include any contained/collapsed items from source
    srcData.collapsed = {}
    if (dragData.type == 'equipment') {
      this.item.update({
        name: srcData.name,
        'system.eqt': srcData,
      })
      return
    }
    await this._addToList(dragData.type, srcData)
  }

  async _addToList(key, data) {
    let list = this.item.system[key] || {}
    GURPS.put(list, data)
    await this.item.update({ ['system.' + key]: list })
  }

  async close() {
    await super.close()
    // When editing a Compendium Item, Actor does not exist, so we need to update the Item directly
    if (!!this.item.editingActor) {
      const equipKey = this.item.editingActor._findEqtkeyForId('itemid', this.item.id)
      const equip = foundry.utils.getProperty(this.item.editingActor, equipKey)
      if (!(await this.item.editingActor._sanityCheckItemSettings(equip))) return
      await this.item.update({ 'system.eqt.name': this.item.name })
      if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
        await this.item.editingActor.updateItem(this.object)
      } else {
        await this.item.editingActor._updateItemFromForm(this.item)
      }
    } else {
      await this.item.update({
        name: this.item.name,
        img: this.item.img,
        system: this.item.system,
      })
    }
  }
}
