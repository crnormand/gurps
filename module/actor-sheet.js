import { atou, generateUniqueId, i18n } from '../lib/utilities.js'
import { Melee, Reaction, Ranged, Advantage, Skill, Spell, Equipment, Note } from './actor.js'
import { HitLocation, hitlocationDictionary } from '../module/hitlocation/hitlocation.js'
import { parselink } from '../lib/parselink.js'
import * as CI from './injury/domain/ConditionalInjury.js'
import * as settings from '../lib/miscellaneous-settings.js'
import { ResourceTrackerEditor } from './actor/resource-tracker-editor.js'
import { ResourceTrackerManager } from './actor/resource-tracker-manager.js'
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class GurpsActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor'],
      template: 'systems/gurps/templates/actor-sheet-gcs.html',
      width: 800,
      height: 800,
      tabs: [{ navSelector: '.gurps-sheet-tabs', contentSelector: '.sheet-body', initial: 'description' }],
      scrollY: [
        '.gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipment #other_equipment #notes',
      ],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  /* -------------------------------------------- */

  async close(options = {}) {
    await super.close(options)
    game.GURPS.ClearLastActor(this.actor)
  }

  // Hack to keep sheet from flashing during multiple DB updates
  async _render(...args) {
    if (!!this.object?.ignoreRender) return
    super._render(...args)
  }

  update(data, options) {
    super.update(data, options)
    console.log(data)
  }

  /** @override */
  getData() {
    const sheetData = super.getData()
    sheetData.olddata = sheetData.data
    sheetData.data = sheetData.data.data
    sheetData.ranges = game.GURPS.rangeObject.ranges
    sheetData.useCI = game.GURPS.ConditionalInjury.isInUse()
    sheetData.conditionalEffectsTable = game.GURPS.ConditionalInjury.conditionalEffectsTable()
    game.GURPS.SetLastActor(this.actor)
    sheetData.eqtsummary = this.actor.data.data.eqtsummary
    sheetData.navigateVisible = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_SHEET_NAVIGATION)
    return sheetData
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('.gurpsactorsheet').click(ev => {
      this._onfocus(ev)
    })
    html
      .parent('.window-content')
      .siblings('.window-header')
      .click(ev => {
        this._onfocus(ev)
      })

    html.find('.navigation-link').click(this._onNavigate.bind(this))
    html.find('.rollable').click(this._onClickRoll.bind(this))
    GURPS.hookupGurps(html)
    html.find('.gurpslink').contextmenu(this._onRightClickGurpslink.bind(this))
    html.find('.glinkmod').contextmenu(this._onRightClickGurpslink.bind(this))
    html.find('.glinkmodplus').contextmenu(this._onRightClickGurpslink.bind(this))
    html.find('.glinkmodminus').contextmenu(this._onRightClickGurpslink.bind(this))
    html.find('[data-otf]').contextmenu(this._onRightClickOtf.bind(this))
    html.find('.gmod').contextmenu(this._onRightClickGmod.bind(this))
    html.find('.pdflink').contextmenu(this._onRightClickPdf.bind(this))

    html.find('[data-otf]').each((_, li) => {
      li.setAttribute('draggable', true)
      li.addEventListener('dragstart', ev => {
        let display = ''
        if (!!ev.currentTarget.dataset.action) display = ev.currentTarget.innerText
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            otf: li.getAttribute('data-otf'),
            actor: this.actor.id,
            displayname: display,
          })
        )
      })
    })

    const canConfigure = game.user.isGM || this.actor.isOwner
    if (!canConfigure) return // Only allow "owners to be able to edit the sheet, but anyone can roll from the sheet

    html.find('.dblclksort').dblclick(this._onDblclickSort.bind(this))
    html.find('.enc').click(this._onClickEnc.bind(this))

    let makelistdrag = (cls, type) => {
      html.find(cls).each((i, li) => {
        li.setAttribute('draggable', true)
        li.addEventListener('dragstart', ev => {
          let oldd = ev.dataTransfer.getData('text/plain')
          let eqtkey = ev.currentTarget.dataset.key
          let eqt = getProperty(this.actor.data, eqtkey) // FYI, may not actually be Equipment
          if (!eqt) return
          if (!!eqt.eqtkey) {
            eqtkey = eqt.eqtkey
            eqt = GURPS.decode(this.actor.data, eqtkey) // Features added by equipment will point to the equipment
            type = 'equipment'
          }
          var itemData
          if (!!eqt.itemid) {
            itemData = this.actor.items.get(eqt.itemid) // We have to get it now, as the source of the drag, since the target may not be owned by us
            let img = new Image()
            img.src = itemData.img
            const w = 50
            const h = 50
            const preview = DragDrop.createDragImage(img, w, h)
            ev.dataTransfer.setDragImage(preview, 0, 0)
          }
          let newd = {
            actorid: this.actor.id, // may not be useful if this is an unlinked token
            actor: this.actor, // so send the actor,
            isLinked: !this.actor.isToken,
            type: type,
            key: eqtkey,
            itemid: eqt.itemid,
            itemData: itemData,
          }
          if (!!oldd) mergeObject(newd, JSON.parse(oldd)) // May need to merge in OTF drag info
          return ev.dataTransfer.setData('text/plain', JSON.stringify(newd))
        })
      })
    }

    makelistdrag('.eqtdraggable', 'equipment')
    makelistdrag('.adsdraggable', 'ads')
    makelistdrag('.skldraggable', 'skills')
    makelistdrag('.spldraggable', 'spells')
    makelistdrag('.notedraggable', 'note')

    makelistdrag('.meleedraggable', 'melee')
    makelistdrag('.rangeddraggable', 'ranged')

    html.find('input[name="data.HP.value"]').keypress(ev => {
      if (ev.which === 13) ev.preventDefault()
    })

    html.find('input[name="data.FP.value"]').keypress(ev => {
      if (ev.which === 13) ev.preventDefault()
    })

    html.find('input[name*="data.additionalresources.tracker."]').keypress(ev => {
      if (ev.which === 13) ev.preventDefault()
    })

    html.find('button[data-operation="resource-inc"]').click(async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      let tracker = getProperty(this.actor.data.data, path)
      let value = (tracker.value || 0) + (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = tracker.max || 0

      let json = `{ "data.${path}.value": ${value} }`
      this.actor.update(JSON.parse(json))
    })

    html.find('button[data-operation="resource-dec"]').click(ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      let tracker = getProperty(this.actor.data.data, path)
      let value = (tracker.value || 0) - (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = tracker.max || 0

      let json = `{ "data.${path}.value": ${value} }`
      this.actor.update(JSON.parse(json))
    })

    html.find('button[data-operation="resource-reset"]').click(ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      let tracker = getProperty(this.actor.data.data, path)
      let value = !!tracker.isDamageTracker ? tracker.min || 0 : tracker.max || 0

      let json = `{ "data.${path}.value": ${value} }`
      this.actor.update(JSON.parse(json))
    })

    html.find('.tracked-resource .header.with-editor').click(this.editTracker.bind(this))

    // START CONDITIONAL INJURY

    const formatCIEmpty = val => (val === null ? '' : val)

    const updateActorWithChangedSeverity = changedSeverity => {
      console.log('updateActorWithChangedSeverity')
      this.actor.update({
        'data.conditionalinjury.injury.severity': formatCIEmpty(changedSeverity),
        'data.conditionalinjury.injury.daystoheal': formatCIEmpty(CI.daysToHealForSeverity(changedSeverity)),
      })
    }

    html.find('button[data-operation="ci-severity-inc"]').click(async ev => {
      ev.preventDefault()
      updateActorWithChangedSeverity(CI.incrementSeverity(this.actor.data.data.conditionalinjury.injury.severity))
    })

    html.find('button[data-operation="ci-severity-dec"]').click(ev => {
      ev.preventDefault()
      updateActorWithChangedSeverity(CI.decrementSeverity(this.actor.data.data.conditionalinjury.injury.severity))
    })

    const updateActorWithChangedDaysToHeal = changedDaysToHeal => {
      console.log('updateActorWithChangedDaysToHeal')
      this.actor.update({
        'data.conditionalinjury.injury.severity': formatCIEmpty(CI.severityForDaysToHeal(changedDaysToHeal)),
        'data.conditionalinjury.injury.daystoheal': formatCIEmpty(changedDaysToHeal),
      })
    }

    html.find('button[data-operation="ci-days-inc"]').click(async ev => {
      ev.preventDefault()
      updateActorWithChangedDaysToHeal(
        CI.incrementDaysToHeal(this.actor.data.data.conditionalinjury.injury.daystoheal, ev.shiftKey ? 5 : 1)
      )
    })

    html.find('button[data-operation="ci-days-dec"]').click(ev => {
      ev.preventDefault()
      updateActorWithChangedDaysToHeal(
        CI.decrementDaysToHeal(this.actor.data.data.conditionalinjury.injury.daystoheal, ev.shiftKey ? 5 : 1)
      )
    })

    html.find('button[data-operation="ci-reset"]').click(ev => {
      ev.preventDefault()
      updateActorWithChangedSeverity(null)
    })

    html.find('input[data-operation="ci-severity-set"]').change(ev => {
      ev.preventDefault()
      console.log('change severity', ev.target.value)
      updateActorWithChangedSeverity(CI.setSeverity(ev.target.value))
    })

    // TODO after this event resolves, the severity field briefly flashes with the correct value but then reverts to what was there before the change
    html.find('input[data-operation="ci-days-set"]').change(ev => {
      ev.preventDefault()
      console.log('change days', ev.target.value)
      updateActorWithChangedDaysToHeal(CI.setDaysToHeal(ev.target.value))
    })

    // END CONDITIONAL INJURY

    if (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_ENHANCED_INPUT)) {
      // spinner input popup button-ribbon
      html.find('.spinner details summary input').focus(ev => {
        let details = ev.currentTarget.closest('details')

        if (!details.open) {
          let parent = ev.currentTarget.closest('[data-gurps-resource]')
          let path = $(parent).attr('data-gurps-resource')
          let tracker = getProperty(this.actor.data.data, path)

          let restoreButton = $(details).find('button.restore')
          restoreButton.attr('data-value', `${tracker.value}`)
          restoreButton.text(tracker.value)
        }
        details.open = true
        console.log('open')
      })

      // Update the actor's data, set the restore button to the new value,
      // and close the popup.
      html.find('.spinner details summary input').focusout(ev => {
        // set the restore button to the new value of the input field
        let details = ev.currentTarget.closest('details')
        let input = $(details).find('input')
        let newValue = input.val()

        let restoreButton = $(details).find('button.restore')
        restoreButton.attr('data-value', newValue)
        restoreButton.text(newValue)

        // update the actor's data to newValue
        let parent = ev.currentTarget.closest('[data-gurps-resource]')
        let path = $(parent).attr('data-gurps-resource')
        let value = parseInt(newValue)
        let json = `{ "data.${path}.value": ${value} }`
        this.actor.update(JSON.parse(json))

        details.open = false
        console.log('close')
      })

      html.find('.spinner details .popup > *').mousedown(ev => {
        ev.preventDefault()
      })

      html.find('.tooltip-manager').mouseover(ev => {
        ev.preventDefault()

        let target = $(ev.currentTarget)
        if (target.hasNoChildren) {
          return
        }

        let tooltip = target.children('.tooltippic')
        if (tooltip) {
          // tooltip placement according to parent placement
          let top = target.offset().top - tooltip.height() * 0.85
          let left = target.offset().left + target.width() * 0.8
          tooltip.css({ top: top, left: left, visibility: 'visible' })
        }
      })

      html.find('.tooltip-manager').mouseout(ev => {
        ev.preventDefault()
        let target = $(ev.currentTarget)
        if (target.hasNoChildren) {
          return
        }

        let tooltip = target.children('.tooltippic')
        if (tooltip) {
          tooltip.css({ visibility: 'hidden' })
        }
      })

      // update the text input field, but do not update the actor's data
      html.find('button[data-operation="resource-update"]').click(ev => {
        let dataValue = $(ev.currentTarget).attr('data-value')
        let details = $(ev.currentTarget).closest('details')
        let input = $(details).find('input')
        let value = parseInt(input.val())

        if (dataValue.charAt(0) === '-' || dataValue.charAt(0) === '+') {
          value += parseInt(dataValue)
        } else {
          value = parseInt(dataValue)
        }

        if (!isNaN(value)) {
          input.val(value)
        }
      })
    } // end enhanced input

    // Equipment
    html.find('.changeequip').click(this._onClickEquip.bind(this))
    html.find('.addequipmenticon').click(async ev => {
      let parent = $(ev.currentTarget).closest('.header')
      let path = parent.attr('data-key')
      let actor = this.actor
      let eqtlist = duplicate(getProperty(actor.data, path))
      let eqt = new Equipment('', true)
      eqt.uuid = generateUniqueId()
      eqt.carried = path.includes('carried')
      let dlgHtml = await renderTemplate('systems/gurps/templates/equipment-editor-popup.html', eqt)

      let options = {
        // NOTE:  This code is duplicated below.  Haven't refactored yet
        width: 530,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }

      let d = new Dialog(
        {
          title: 'Equipment Editor',
          content: dlgHtml,
          buttons: {
            one: {
              label: 'Create',
              callback: async html => {
                ;['name', 'uses', 'maxuses', 'techlevel', 'notes', 'pageref'].forEach(
                  a => (eqt[a] = html.find(`.${a}`).val())
                )
                ;['count', 'cost', 'weight'].forEach(a => (eqt[a] = parseFloat(html.find(`.${a}`).val())))
                let u = html.find('.save') // Should only find in Note (or equipment)
                if (!!u) eqt.save = u.is(':checked')
                Equipment.calc(eqt)
                GURPS.put(eqtlist, eqt)
                actor.update({ [path]: eqtlist })
              },
            },
          },
          default: 'one',
        },
        options
      )
      d.render(true)
    })

    // Simple trick, move 'contains' items into 'collapsed' and back.   The html doesn't show 'collapsed'
    html.find('.expandcollapseicon').click(async ev => {
      let actor = this.actor
      let element = ev.currentTarget
      let parent = $(element).closest('[data-key]')
      let path = parent.attr('data-key')
      actor.toggleExpand(path)
    })

    html.find('.dblclkedit').dblclick(async ev => {
      let element = ev.currentTarget
      let path = element.dataset.key
      let actor = this.actor
      let obj = duplicate(getProperty(actor.data, path)) // must dup so difference can be detected when updated
      if (!!obj.itemid) {
        let item = this.actor.items.get(obj.itemid)
        item.editingActor = this.actor
        item.sheet.render(true)
        return
      }
      if (path.includes('equipment')) this.editEquipment(actor, path, obj)
      if (path.includes('melee')) this.editMelee(actor, path, obj)
      if (path.includes('ranged')) this.editRanged(actor, path, obj)
      if (path.includes('ads')) this.editAds(actor, path, obj)
      if (path.includes('skills')) this.editSkills(actor, path, obj)
      if (path.includes('spells')) this.editSpells(actor, path, obj)
      if (path.includes('notes')) this.editNotes(actor, path, obj)
    })

    let opts = this.addDeleteMenu(new Equipment('New Equipment', true))
    /*    opts.push({
      name: 'Add In',
      icon: "<i class='fas fa-sign-in-alt'></i>",
      callback: e => {
        let k = e[0].dataset.key + '.contains'
        let o = GURPS.decode(this.actor.data, k) || {}
        GURPS.put(o, duplicate(new Equipment('New Equipment', true)))
        this.actor.update({ [k]: o })
      },
    })
*/
    opts.push({
      name: 'Edit',
      icon: "<i class='fas fa-edit'></i>",
      callback: e => {
        let path = e[0].dataset.key
        let o = duplicate(GURPS.decode(this.actor.data, path))
        this.editEquipment(this.actor, path, o)
      },
    })
    opts.push({
      icon: '<i class="fas fa-sort-alpha-up"></i>',
      name: 'Sort Contents (Ascending)',
      callback: async data => {
        let parentpath = data[0].dataset.key
        let objkey = 'contains'
        let key = parentpath + '.' + objkey
        let list = getProperty(this.actor.data, key)
        if (!Object.keys(list).length) {
          ui.notifications.info('Nothing to sort')
          return
        }
        let t = parentpath + '.-=' + objkey
        await this.actor.update({ [t]: null }) // Delete the whole object
        let sortedobj = {}
        let index = 0
        Object.values(list)
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(o => game.GURPS.put(sortedobj, o, index++))
        await this.actor.update({ [key]: sortedobj })
      },
    })
    opts.push({
      icon: '<i class="fas fa-sort-alpha-down"></i>',
      name: 'Sort Contents (Descending)',
      callback: async data => {
        let parentpath = data[0].dataset.key
        let objkey = 'contains'
        let key = parentpath + '.' + objkey
        let list = getProperty(this.actor.data, key)
        if (!Object.keys(list).length) {
          ui.notifications.info('Nothing to sort')
          return
        }
        let t = parentpath + '.-=' + objkey
        await this.actor.update({ [t]: null }) // Delete the whole object
        let sortedobj = {}
        let index = 0
        Object.values(list)
          .sort((a, b) => b.name.localeCompare(a.name))
          .forEach(o => game.GURPS.put(sortedobj, o, index++))
        await this.actor.update({ [key]: sortedobj })
      },
    })
    let mcar = Array.from(opts)
    mcar.push({
      name: "Move to 'Other Equipment'",
      icon: "<i class='fas fa-level-down-alt'></i>",
      callback: e => {
        let path = e[0].dataset.key
        this.actor.moveEquipment(path, 'data.equipment.other')
      },
    })
    new ContextMenu(html, '.equipmenucarried', mcar)

    opts.push({
      name: "Move to 'Equipment'",
      icon: "<i class='fas fa-level-up-alt'></i>",
      callback: e => {
        let path = e[0].dataset.key
        this.actor.moveEquipment(path, 'data.equipment.carried')
      },
    })
    new ContextMenu(html, '.equipmenuother', opts)

    html.find('button[data-operation="equipment-inc"]').click(async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-key]')
      let path = parent.attr('data-key')
      let eqt = getProperty(this.actor.data, path)
      let value = parseInt(eqt.count) + (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = 0
      await this.actor.updateEqtCount(path, value)
    })
    html.find('button[data-operation="equipment-dec"]').click(async ev => {
      ev.preventDefault()
      let parent = $(ev.currentTarget).closest('[data-key]')
      let path = parent.attr('data-key')
      let actor = this.actor
      let eqt = getProperty(actor.data, path)
      if (eqt.count == 0) {
        let agree = false
        await Dialog.confirm({
          title: 'Delete',
          content: `Do you want to delete "${eqt.name}" from the list?`,
          yes: () => (agree = true),
        })
        if (agree) actor.deleteEquipment(path)
      } else {
        let value = parseInt(eqt.count) - (ev.shiftKey ? 5 : 1)
        if (isNaN(value) || value < 0) value = 0
        await this.actor.updateEqtCount(path, value)
      }
    })

    html.find('.addnoteicon').click(async ev => {
      let parent = $(ev.currentTarget).closest('.header')
      let path = parent.attr('data-key')
      let actor = this.actor
      let list = duplicate(getProperty(actor.data, path))
      let obj = new Note('', true)
      let dlgHtml = await renderTemplate('systems/gurps/templates/note-editor-popup.html', obj)

      let d = new Dialog(
        {
          title: 'Note Editor',
          content: dlgHtml,
          buttons: {
            one: {
              label: 'Create',
              callback: async html => {
                ;['notes', 'pageref'].forEach(a => (obj[a] = html.find(`.${a}`).val()))
                let u = html.find('.save') // Should only find in Note (or equipment)
                if (!!u) obj.save = u.is(':checked')
                GURPS.put(list, obj)
                actor.update({ [path]: list })
              },
            },
          },
          default: 'one',
        },
        {
          width: 730,
          popOut: true,
          minimizable: false,
          jQuery: true,
        }
      )
      d.render(true)
    })

    opts = [
      {
        name: 'Edit',
        icon: "<i class='fas fa-edit'></i>",
        callback: e => {
          let path = e[0].dataset.key
          let o = duplicate(GURPS.decode(this.actor.data, path))
          this.editNotes(this.actor, path, o)
        },
      },
      {
        name: 'Delete',
        icon: "<i class='fas fa-trash'></i>",
        callback: e => {
          GURPS.removeKey(this.actor, e[0].dataset.key)
        },
      },
    ]
    new ContextMenu(html, '.notesmenu', opts)

    html.find('[data-onethird]').click(ev => {
      let el = ev.currentTarget
      let opt = el.dataset.onethird
      let b = !!this.actor.data.data.additionalresources[opt]
      this.actor.changeOneThirdStatus(opt, !b)
    })
    html.find('[data-onethird]').hover(
      function () {
        let opt = $(this).attr('data-onethird').substr(2)
        let msg = 'Disable&nbsp;' + opt
        if ($(this).hasClass('buttongrey')) msg = 'Enable&nbsp;' + opt
        $(this).append(
          $(
            `<div style='position: absolute;z-index: 1;top: 10px;left: 100%;padding: 5px;width=120px;color:#9f0000;background-color:lightgrey;border: 1px solid grey;border-radius:5px'>${msg}</div>`
          )
        )
      },
      function () {
        $(this).find('div').last().remove()
      }
    )

    html.find('#qnotes').dblclick(ex => {
      let n = this.actor.data.data.additionalresources.qnotes || ''
      n = n.replace(/<br>/g, '\n')
      let actor = this.actor
      new Dialog({
        title: 'Edit Quick Note',
        content: `Enter a Quick Note (a great place to put an On-the-Fly formula!):<br><br><textarea rows="4" id="i">${n}</textarea><br><br>Examples:
        <br>[+1 due to shield]<br>[Dodge +3 retreat]<br>[Dodge +2 Feverish Defense *Cost 1FP]`,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: 'Save',
            callback: html => {
              const i = html[0].querySelector('#i')
              actor.update({ 'data.additionalresources.qnotes': i.value.replace(/\n/g, '<br>') })
            },
          },
        },
        render: h => {
          $(h).find('textarea').on('drop', this.dropFoundryLinks)
          $(h).find('input').on('drop', this.dropFoundryLinks)
        },
      }).render(true)
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

  /**
   *
   * @param {*} ev
   */
  async editTracker(ev) {
    ev.preventDefault()

    let path = $(ev.currentTarget).closest('[data-gurps-resource]').attr('data-gurps-resource')
    let templates = ResourceTrackerManager.getAllTemplates()
    if (!templates || templates.length == 0) templates = null

    let selectTracker = async function (html) {
      let name = html.find('select option:selected').text().trim()
      let template = templates.find(template => template.tracker.name === name)
      await this.actor.applyTrackerTemplate(path, template)
    }

    // show dialog asking if they want to apply a standard tracker, or edit this tracker
    let buttons = {
      edit: {
        icon: '<i class="fas fa-edit"></i>',
        label: game.i18n.localize('GURPS.resourceEditTracker'),
        callback: () => ResourceTrackerEditor.editForActor(this.actor, path),
      },
      remove: {
        icon: '<i class="fas fa-trash"></i>',
        label: game.i18n.localize('GURPS.resourceDeleteTracker'),
        callback: async () => await this.actor.removeTracker(path),
      },
    }

    if (!!templates) {
      buttons.apply = {
        icon: '<i class="far fa-copy"></i>',
        label: game.i18n.localize('GURPS.resourceCopyTemplate'),
        callback: selectTracker.bind(this),
      }
    }

    let d = new Dialog(
      {
        title: game.i18n.localize('GURPS.resourceUpdateTrackerSlot'),
        content: await renderTemplate('systems/gurps/templates/actor/update-tracker.html', { templates: templates }),
        buttons: buttons,
        default: 'edit',
        templates: templates,
      },
      { width: 600 }
    )
    d.render(true)
  }

  async editEquipment(actor, path, obj) {
    // NOTE:  This code is duplicated above.  Haven't refactored yet
    obj.f_count = obj.count // Hack to get around The Furnace's "helpful" Handlebar helper {{count}}
    let dlgHtml = await renderTemplate('systems/gurps/templates/equipment-editor-popup.html', obj)

    let d = new Dialog(
      {
        title: 'Equipment Editor',
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Update',
            callback: async html => {
              ;['name', 'uses', 'maxuses', 'techlevel', 'notes', 'pageref'].forEach(
                a => (obj[a] = html.find(`.${a}`).val())
              )
              ;['count', 'cost', 'weight'].forEach(a => (obj[a] = parseFloat(html.find(`.${a}`).val())))
              let u = html.find('.save') // Should only find in Note (or equipment)
              if (!!u && obj.save != null) obj.save = u.is(':checked') // only set 'saved' if it was already defined
              let v = html.find('.ignoreImportQty') // Should only find in equipment
              if (!!v) obj.ignoreImportQty = v.is(':checked')
              await actor.update({ [path]: obj })
              await actor.updateParentOf(path, false)
            },
          },
        },
        render: h => {
          $(h).find('textarea').on('drop', this.dropFoundryLinks)
          $(h).find('input').on('drop', this.dropFoundryLinks)
        },
        default: 'one',
      },
      {
        width: 530,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }
    )
    d.render(true)
  }

  async editMelee(actor, path, obj) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/melee-editor-popup.html',
      'Melee Weapon Editor',
      [
        'name',
        'mode',
        'parry',
        'block',
        'damage',
        'reach',
        'st',
        'notes',
        'import',
        'checkotf',
        'duringotf',
        'passotf',
        'failotf',
      ],
      []
    )
  }

  async editRanged(actor, path, obj) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/ranged-editor-popup.html',
      'Ranged Weapon Editor',
      [
        'name',
        'mode',
        'range',
        'rof',
        'damage',
        'shots',
        'rcl',
        'st',
        'notes',
        'import',
        'checkotf',
        'duringotf',
        'passotf',
        'failotf',
      ],
      ['acc', 'bulk']
    )
  }

  async editAds(actor, path, obj) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/advantage-editor-popup.html',
      'Advantage / Disadvantage / Perk / Quirk Editor',
      ['name', 'notes'],
      ['points']
    )
  }

  async editSkills(actor, path, obj) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/skill-editor-popup.html',
      'Skill Editor',
      ['name', 'import', 'relativelevel', 'pageref', 'notes', 'checkotf', 'duringotf', 'passotf', 'failotf'],
      ['points']
    )
  }

  async editSpells(actor, path, obj) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/spell-editor-popup.html',
      'Spell Editor',
      [
        'name',
        'import',
        'difficulty',
        'pageref',
        'notes',
        'resist',
        'class',
        'cost',
        'maintain',
        'casttime',
        'duration',
        'college',
        'checkotf',
        'duringotf',
        'passotf',
        'failotf',
      ],
      ['points']
    )
  }

  async editNotes(actor, path, obj) {
    this.editItem(
      actor,
      path,
      obj,
      'systems/gurps/templates/note-editor-popup.html',
      'Note Editor',
      ['pageref', 'notes'],
      [],
      730
    )
  }

  async editItem(actor, path, obj, html, title, strprops, numprops, width = 560) {
    let dlgHtml = await renderTemplate(html, obj)
    let d = new Dialog(
      {
        title: title,
        content: dlgHtml,
        buttons: {
          one: {
            label: 'Update',
            callback: async html => {
              strprops.forEach(a => (obj[a] = html.find(`.${a}`).val()))
              numprops.forEach(a => (obj[a] = parseFloat(html.find(`.${a}`).val())))

              let u = html.find('.save') // Should only find in Note (or equipment)
              if (!!u) obj.save = u.is(':checked')
              actor.update({ [path]: obj })
            },
          },
        },
        render: h => {
          $(h).find('textarea').on('drop', this.dropFoundryLinks)
          $(h).find('input').on('drop', this.dropFoundryLinks)
        },
      },
      {
        width: width,
        popOut: true,
        minimizable: false,
        jQuery: true,
      }
    )
    d.render(true)
  }

  async _onDblclickSort(event) {
    event.preventDefault()
    let element = event.currentTarget
    let key = element.dataset.key
    let self = this

    let d = new Dialog({
      title: 'Sort list',
      buttons: {
        one: {
          icon: '<i class="fas fa-sort-alpha-up"></i>',
          label: 'Ascending',
          callback: async () => {
            let i = key.lastIndexOf('.')
            let parentpath = key.substring(0, i)
            let objkey = key.substr(i + 1)
            let object = GURPS.decode(this.actor.data, key)
            let t = parentpath + '.-=' + objkey
            await self.actor.update({ [t]: null }) // Delete the whole object
            let sortedobj = {}
            let index = 0
            Object.values(object)
              .sort((a, b) => a.name.localeCompare(b.name))
              .forEach(o => game.GURPS.put(sortedobj, o, index++))
            await self.actor.update({ [key]: sortedobj })
          },
        },
        two: {
          icon: '<i class="fas fa-sort-alpha-down"></i>',
          label: 'Descending',
          callback: async () => {
            let i = key.lastIndexOf('.')
            let parentpath = key.substring(0, i)
            let objkey = key.substr(i + 1)
            let object = GURPS.decode(this.actor.data, key)
            let t = parentpath + '.-=' + objkey
            await self.actor.update({ [t]: null }) // Delete the whole object
            let sortedobj = {}
            let index = 0
            Object.values(object)
              .sort((a, b) => b.name.localeCompare(a.name))
              .forEach(o => game.GURPS.put(sortedobj, o, index++))
            await self.actor.update({ [key]: sortedobj })
          },
        },
      },
      default: 'one',
    })
    d.render(true)
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    let dragData = JSON.parse(event.dataTransfer.getData('text/plain'))

    if (dragData.type === 'damageItem') this.actor.handleDamageDrop(dragData.payload)
    if (dragData.type === 'Item') this.actor.handleItemDrop(dragData)

    this.handleDragFor(event, dragData, 'ads', 'adsdraggable')
    this.handleDragFor(event, dragData, 'skills', 'skldraggable')
    this.handleDragFor(event, dragData, 'spells', 'spldraggable')
    this.handleDragFor(event, dragData, 'note', 'notedraggable')

    if (dragData.type === 'equipment') {
      if ((await this.actor.handleEquipmentDrop(dragData)) != false) return // handle external drag/drop
      // drag/drop in same character sheet
      let element = event.target
      let classes = $(element).attr('class') || ''
      if (!classes.includes('eqtdraggable') && !classes.includes('eqtdragtarget')) return
      let targetkey = element.dataset.key
      if (!!targetkey) {
        let srckey = dragData.key
        this.actor.moveEquipment(srckey, targetkey, event.shiftKey)
      }
    }
  }

  // Non-equipment list drags
  async handleDragFor(event, dragData, type, cls) {
    if (dragData.type === type) {
      let element = event.target
      let classes = $(element).attr('class') || ''
      if (!classes.includes(cls)) return
      let targetkey = element.dataset.key
      if (!!targetkey) {
        let srckey = dragData.key
        if (srckey.includes(targetkey) || targetkey.includes(srckey)) {
          ui.notifications.error('Unable to drag and drop withing the same hierarchy.   Try moving it elsewhere first.')
          return
        }
        let object = GURPS.decode(this.actor.data, srckey)
        // Because we may be modifing the same list, we have to check the order of the keys and
        // apply the operation that occurs later in the list, first (to keep the indexes the same)
        let srca = srckey.split('.')
        srca.splice(0, 2) // Remove data.xxxx
        let tara = targetkey.split('.')
        tara.splice(0, 2)
        let max = Math.min(srca.length, tara.length)
        let isSrcFirst = false
        for (let i = 0; i < max; i++) {
          if (parseInt(srca[i]) < parseInt(tara[i])) isSrcFirst = true
        }

        let d = new Dialog({
          title: object.name,
          content: '<p>Where do you want to drop this?</p>',
          buttons: {
            one: {
              icon: '<i class="fas fa-level-up-alt"></i>',
              label: 'Before',
              callback: async () => {
                if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey)
                await GURPS.insertBeforeKey(this.actor, targetkey, object)
                if (isSrcFirst) await GURPS.removeKey(this.actor, srckey)
              },
            },
            two: {
              icon: '<i class="fas fa-sign-in-alt"></i>',
              label: 'In',
              callback: async () => {
                if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey)
                let k = targetkey + '.contains.' + GURPS.genkey(0)
                await GURPS.insertBeforeKey(this.actor, k, object)
                if (isSrcFirst) await GURPS.removeKey(this.actor, srckey)
              },
            },
          },
          default: 'one',
        })
        d.render(true)
      }
    }
  }

  _onfocus(ev) {
    ev.preventDefault()
    game.GURPS.SetLastActor(this.actor)
  }

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options)
    const sheetBody = this.element.find('.sheet-body')
    const bodyHeight = position.height - 192
    sheetBody.css('height', bodyHeight)
    return position
  }

  get title() {
    const t = this.actor.name
    const sheet = this.actor.getFlag('core', 'sheetClass')
    return sheet === 'gurps.GurpsActorEditorSheet' ? '**** Editing: ' + t + ' ****' : t
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons()

    const sheet = this.actor.getFlag('core', 'sheetClass')
    const isFull = sheet === undefined || sheet === 'gurps.GurpsActorSheet'
    const isEditor = sheet === 'gurps.GurpsActorEditorSheet'

    // Token Configuration
    const canConfigure = game.user.isGM || this.actor.isOwner
    if (this.options.editable && canConfigure) {
      let b = [
        {
          label: isFull ? 'Tabbed View' : 'Full View',
          class: 'toggle',
          icon: 'fas fa-exchange-alt',
          onclick: ev => this._onToggleSheet(ev),
        },
      ]

      if (!game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BLOCK_IMPORT) || game.user.isTrusted)
        b.push({
          label: 'Import',
          class: 'import',
          icon: 'fas fa-file-import',
          onclick: ev => this._onFileImport(ev),
        })

      if (!isEditor) {
        b.push({
          label: 'Editor',
          class: 'edit',
          icon: 'fas fa-edit',
          onclick: ev => this._onOpenEditor(ev),
        })
      }
      buttons = b.concat(buttons)
    }
    return buttons
  }

  async _onFileImport(event) {
    event.preventDefault()
    this.actor.importCharacter()
  }

  async _onToggleSheet(event) {
    event.preventDefault()
    let newSheet = 'gurps.GurpsActorTabSheet'

    const original =
      this.actor.getFlag('core', 'sheetClass') ||
      Object.values(CONFIG.Actor.sheetClasses['character']).filter(s => s.default)[0].id
    console.log('original: ' + original)

    if (original != 'gurps.GurpsActorSheet') newSheet = 'gurps.GurpsActorSheet'
    if (event.shiftKey)
      // Hold down the shift key for Simplified
      newSheet = 'gurps.GurpsActorSimplifiedSheet'
    if (game.keyboard.isCtrl(event))
      // Hold down the Ctrl key (Command on Mac) for Simplified
      newSheet = 'gurps.GurpsActorNpcSheet'

    this.actor.openSheet(newSheet)
  }

  async _onOpenEditor(event) {
    event.preventDefault()
    this.actor.openSheet('gurps.GurpsActorEditorSheet')
  }

  async _onRightClickGurpslink(event) {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let action = el.dataset.action
    if (!!action) {
      action = JSON.parse(atou(action))
      if (action.type === 'damage' || action.type === 'deriveddamage') {
        GURPS.resolveDamageRoll(event, this.actor, action.orig, action.overridetxt, game.user.isGM, true)
      } else {
        GURPS.whisperOtfToOwner(action.orig, action.overridetxt, event, action, this.actor) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
      }
    }
  }

  async _onRightClickPdf(event) {
    event.preventDefault()
    let el = event.currentTarget
    GURPS.whisperOtfToOwner('PDF:' + el.innerText, null, event, false, this.actor)
  }

  async _onRightClickGmod(event) {
    event.preventDefault()
    let el = event.currentTarget
    let n = el.dataset.name
    let t = el.innerText
    GURPS.whisperOtfToOwner(t + ' ' + n, null, event, false, this.actor)
  }

  async _onRightClickOtf(event) {
    event.preventDefault()
    let el = event.currentTarget
    let isDamageRoll = el.dataset.hasOwnProperty('damage')
    let otf = event.currentTarget.dataset.otf

    if (isDamageRoll) {
      GURPS.resolveDamageRoll(event, this.actor, otf, null, game.user.isGM)
    } else {
      GURPS.whisperOtfToOwner(event.currentTarget.dataset.otf, null, event, !isDamageRoll, this.actor) // Can't blind roll damages (yet)
    }
  }

  async _onClickRoll(event, targets) {
    game.GURPS.handleRoll(event, this.actor, targets)
  }

  async _onNavigate(event) {
    let dataValue = $(event.currentTarget).attr('data-value')
    // if (dataValue == 'CLOSE') {
    //   game.settings.set(settings.SYSTEM_NAME, settings.SETTING_SHOW_SHEET_NAVIGATION, false)
    //   this.render()
    // } else {
    let windowContent = event.currentTarget.closest('.window-content')
    let target = windowContent.querySelector(`#${dataValue}`)

    // add the glowing class to target AND to event.currentTarget, then remove it
    $(target).addClass('glowing')
    $(event.currentTarget).addClass('glowing')

    // The '33' represents the hieght of the window title bar + a bit of margin
    // TODO: we should really look this up and use the actual values as found in the DOM.
    windowContent.scrollTop = target.offsetTop - 33

    setTimeout(function () {
      $(target).removeClass('glowing')
      $(event.currentTarget).removeClass('glowing')
    }, 2000)
    // }
  }

  async _onClickEnc(ev) {
    ev.preventDefault()
    if (!game.settings.get(settings.SYSTEM_NAME, settings.SETTING_AUTOMATIC_ENCUMBRANCE)) {
      let element = ev.currentTarget
      let key = element.dataset.key
      let encs = this.actor.data.data.encumbrance
      if (encs[key].current) return // already selected
      for (let enckey in encs) {
        let enc = encs[enckey]
        let t = 'data.encumbrance.' + enckey + '.current'
        if (key === enckey) {
          await this.actor.update({
            [t]: true,
            'data.currentmove': parseInt(enc.move),
            'data.currentdodge': parseInt(enc.dodge),
          })
        } else if (enc.current) {
          await this.actor.update({ [t]: false })
        }
      }
    } else {
      ui.notifications.warn(
        "You cannot manually change the Encumbrance level. The 'Automatically calculate Encumbrance Level' setting is turned on."
      )
    }
  }

  async _onClickEquip(ev) {
    ev.preventDefault()
    let element = ev.currentTarget
    let key = element.dataset.key
    let eqt = duplicate(GURPS.decode(this.actor.data, key))
    eqt.equipped = !eqt.equipped
    await this.actor.update({ [key]: eqt })
    await this.actor.updateItemAdditionsBasedOn(eqt, key)
    let p = this.actor.getEquippedParry()
    let b = this.actor.getEquippedBlock()
    await this.actor.update({
      'data.equippedparry': p,
      'data.equippedblock': b,
    })
    this.actor._forceRender()
  }

  addDeleteMenu(obj) {
    return [
      /*      {
        name: 'Add Before',
        icon: "<i class='fas fa-chevron-up'></i>",
        callback: e => {
          GURPS.insertBeforeKey(this.actor, e[0].dataset.key, duplicate(obj))
        },
      },
*/
      {
        name: 'Delete',
        icon: "<i class='fas fa-trash'></i>",
        callback: e => {
          let key = e[0].dataset.key
          if (key.includes('.equipment.')) this.actor.deleteEquipment(key)
          else GURPS.removeKey(this.actor, key)
        },
      },
      /*
      {
        name: 'Add at the end',
        icon: "<i class='fas fa-fast-forward'></i>",
        callback: e => {
          let p = e[0].dataset.key
          let i = p.lastIndexOf('.')
          let objpath = p.substring(0, i)
          let o = GURPS.decode(this.actor.data, objpath)
          GURPS.put(o, duplicate(obj))
          this.actor.update({ [objpath]: o })
        },
      },
*/
    ]
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    return super._updateObject(event, formData)
  }
}

export class GurpsActorTabSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor'],
      template: 'systems/gurps/templates/actor-tab-sheet.html',
      width: 860,
      height: 600,
      tabs: [{ navSelector: '.gurps-sheet-tabs', contentSelector: '.sheet-body', initial: 'description' }],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }
}

export class GurpsActorCombatSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor'],
      template: 'systems/gurps/templates/combat-sheet.html',
      width: 600,
      height: 275,
      tabs: [{ navSelector: '.gurps-sheet-tabs', contentSelector: '.sheet-body', initial: 'description' }],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }
}

export class GurpsActorEditorSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['gurps', 'gurpsactorsheet', 'sheet', 'actor'],
      template: 'systems/gurps/templates/actor-sheet-gcs-editor.html',
      scrollY: [
        '.gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipment #other_equipment #notes',
      ],
      width: 880,
      height: 800,
      tabs: [{ navSelector: '.gurps-sheet-tabs', contentSelector: '.sheet-body', initial: 'description' }],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  getData() {
    let d = this.actor.data.data
    if (d.HP.max == 0 && d.HP.value == 0 && (d.FP.max == 0) & (d.FP.value == 0)) {
      ui.notifications.error('You are editing an EMPTY Actor!')
      setTimeout(
        () =>
          Dialog.prompt({
            title: 'Empty Actor',
            content:
              'You are editing an EMPTY Actor!<br><br>Either use the <b>Import</b> button to enter data, or delete this Actor and use the <b>/mook</b> chat command to create NPCs.<br><br>Press Ok to open the Full View.',
            label: 'Ok',
            callback: async () => {
              this.actor.openSheet('gurps.GurpsActorSheet')
            },
          }),
        500
      )
    }
    return super.getData()
  }

  makeAddDeleteMenu(html, cssclass, obj) {
    new ContextMenu(html, cssclass, this.addDeleteMenu(obj))
  }

  headerMenu(name, obj, path) {
    return [
      {
        name: 'Add ' + name + ' at the end',
        icon: "<i class='fas fa-edit'></i>",
        callback: e => {
          let o = GURPS.decode(this.actor.data, path) || {}
          GURPS.put(o, duplicate(obj))
          this.actor.update({ [path]: o })
        },
      },
    ]
  }

  makeHeaderMenu(html, cssclass, name, obj, path) {
    new ContextMenu(html, cssclass, this.headerMenu(name, obj, path))
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find('textarea').on('drop', this.dropFoundryLinks)
    html.find('input').on('drop', this.dropFoundryLinks)


    html.find('#ignoreinputbodyplan').click(this._onClickBodyPlan.bind(this))

    html.find('#showflightmove').click(ev => {
      ev.preventDefault()
      let element = ev.currentTarget
      let show = element.checked
      this.actor.update({ 'data.additionalresources.showflightmove': show })
    })

    this.makeHeaderMenu(html, '.hlhead', 'Hit Location', new HitLocation('???'), 'data.hitlocations')
    this.makeAddDeleteMenu(html, '.hlmenu', new HitLocation('???'))

    this.makeHeaderMenu(html, '.reacthead', 'Reaction', new Reaction('+0', 'from ...'), 'data.reactions')
    this.makeAddDeleteMenu(html, '.reactmenu', new Reaction('+0', 'from ...'))

    this.makeHeaderMenu(html, '.meleehead', 'Melee Attack', new Melee('New Attack'), 'data.melee')
    this.makeAddDeleteMenu(html, '.meleemenu', new Melee('New Attack'))

    this.makeHeaderMenu(html, '.rangedhead', 'Ranged Attack', new Ranged('New Attack'), 'data.ranged')
    this.makeAddDeleteMenu(html, '.rangedmenu', new Ranged('New Attack'))

    this.makeHeaderMenu(
      html,
      '.adshead',
      'Advantage/Disadvantage/Quirk/Perk',
      new Advantage('New Advantage/Disadvantage/Quirk/Perk'),
      'data.ads'
    )
    this.makeAddDeleteMenu(html, '.adsmenu', new Advantage('New Advantage'))

    this.makeHeaderMenu(html, '.skillhead', 'Skill', new Skill('New Skill'), 'data.skills')
    this.makeAddDeleteMenu(html, '.skillmenu', new Skill('New Skill'))

    this.makeHeaderMenu(html, '.spellhead', 'Spell', new Spell('New Spell'), 'data.spells')
    this.makeAddDeleteMenu(html, '.spellmenu', new Spell('New Spell'))

    this.makeHeaderMenu(html, '.notehead', 'Note', new Note('New Note', true), 'data.notes')
    this.makeAddDeleteMenu(html, '.notemenu', new Note('New Note', true))

    this.makeHeaderMenu(
      html,
      '.carhead',
      'Carried Equipment',
      new Equipment('New Equipment', true),
      'data.equipment.carried'
    )
    this.makeHeaderMenu(
      html,
      '.othhead',
      'Other Equipment',
      new Equipment('New Equipment', true),
      'data.equipment.other'
    )

    html.find('#body-plan').change(async e => {
      let bodyplan = e.currentTarget.value
      if (bodyplan !== this.actor.data.data.additionalresources.bodyplan) {
        let hitlocationTable = hitlocationDictionary[bodyplan]
        if (!hitlocationTable) {
          ui.notifications.error(`Unsupported bodyplan value: ${bodyplan}`)
        } else {
          // Try to copy any DR values from hit locations that match
          let hitlocations = {}
          let oldlocations = this.actor.data.data.hitlocations || {}
          let count = 0
          for (let loc in hitlocationTable) {
            let hit = hitlocationTable[loc]
            let originalLoc = Object.values(oldlocations).filter(it => it.where === loc)
            let dr = originalLoc.length === 0 ? 0 : originalLoc[0]?.dr
            let it = new HitLocation(loc, dr, hit.penalty, hit.roll)
            game.GURPS.put(hitlocations, it, count++)
          }
          await this.actor.update({
            'data.-=hitlocations': null,
            'data.additionalresources.bodyplan': bodyplan,
          })
          await this.actor.update({ 'data.hitlocations': 0 }) // A hack. The delete above doesn't always get rid of the properties, so set it to Zero
          await this.actor.update({ 'data.hitlocations': hitlocations })
        }
      }
    })
  }

  async _onClickBodyPlan(ev) {
    ev.preventDefault()
    let element = ev.currentTarget
    let ignore = element.checked
    await this.actor.update({ 'data.additionalresources.ignoreinputbodyplan': ignore })
  }
}

export class GurpsActorSimplifiedSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor'],
      template: 'systems/gurps/templates/simplified.html',
      width: 820,
      height: 900,
      tabs: [{ navSelector: '.gurps-sheet-tabs', contentSelector: '.sheet-body', initial: 'description' }],
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  getData() {
    const data = super.getData()
    data.dodge = this.actor.getCurrentDodge()
    data.defense = this.actor.getTorsoDr()
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find('.rollableicon').click(this._onClickRollableIcon.bind(this))
  }

  async _onClickRollableIcon(ev) {
    ev.preventDefault()
    let element = ev.currentTarget
    let val = element.dataset.value
    let parsed = parselink(val)
    GURPS.performAction(parsed.action, this.actor, ev)
  }
}

export class GurpsActorNpcSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['npc-sheet', 'sheet', 'actor'],
      template: 'systems/gurps/templates/npc-sheet.html',
      width: 650,
      height: 450,
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
    })
  }

  getData() {
    const data = super.getData()
    data.currentdodge = this.actor.data.data.currentdodge
    data.currentmove = this.actor.data.data.currentmove
    data.defense = this.actor.getTorsoDr()
    let p = this.actor.getEquippedParry()
    //    let b = this.actor.getEquippedBlock();      // Don't have a good way to display block yet
    //    if (b > 0)
    //      data.parryblock = p + "/" + b;
    //    else
    data.parryblock = p

    return data
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find('.npc-sheet').click(ev => {
      this._onfocus(ev)
    })
    html.find('.rollableicon').click(this._onClickRollableIcon.bind(this))
  }

  async _onClickRollableIcon(ev) {
    ev.preventDefault()
    let element = ev.currentTarget
    let val = element.dataset.value
    let parsed = parselink(val)
    GURPS.performAction(parsed.action, this.actor, ev)
  }
}
export class GurpsActorNpcSheetCI extends GurpsActorNpcSheet {
    /** @override */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ['npc-sheet', 'sheet', 'actor'],
        template: 'systems/gurps/templates/npc-sheet-ci.html',
        width: 650,
        height: 450,
        dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
      })
    }
}

export class GurpsInventorySheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor'],
      template: 'systems/gurps/templates/inventory-sheet.html',
      width: 700,
      height: 400,
      tabs: [],
      scrollY: [],
      dragDrop: [{ dragSelector: 'item-list .item', dropSelector: null }],
    })
  }
}
