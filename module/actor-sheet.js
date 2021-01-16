import { GURPS } from "./gurps.js";
import { isNiceDiceEnabled } from '../lib/utilities.js'
import { Melee, Reaction, Ranged, Advantage, Skill, Spell, Equipment, Note } from './actor.js';
import { HitLocation } from '../module/hitlocation/hitlocation.js'
import parselink from '../lib/parselink.js';
import * as CI from "./injury/domain/ConditionalInjury.js";
import * as settings from '../lib/miscellaneous-settings.js'

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class GurpsActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "sheet", "actor"],
      template: "systems/gurps/templates/actor-sheet-gcs.html",
      width: 800,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      scrollY: [".gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipment #other_equipment #notes"],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /* -------------------------------------------- */

  async close(options = {}) {
    await super.close(options);
    game.GURPS.ClearLastActor(this.actor);
  }

  flt(str) {
    return !!str ? parseFloat(str) : 0;
  }

  sum(dict, type) {
    if (!dict) return 0.0;
    let sum = 0;
    for (let k in dict) {
      let e = dict[k];
      let c = this.flt(e.count);
      let t = this.flt(e[type])
      sum += c * t;
      sum += this.sum(e.contains, type);
    }
    return parseInt(sum * 100) / 100;
  }

  /** @override */
  getData() {
    const sheetData = super.getData();
    sheetData.ranges = game.GURPS.rangeObject.ranges;
    sheetData.useCI = game.GURPS.ConditionalInjury.isInUse();
    sheetData.conditionalEffectsTable = game.GURPS.ConditionalInjury.conditionalEffectsTable();
    game.GURPS.SetLastActor(this.actor);
    let eqt = this.actor.data.data.equipment || {};
    sheetData.eqtsummary = {
      eqtcost: this.sum(eqt.carried, "cost"),
      eqtlbs: this.sum(eqt.carried, "weight"),
      othercost: this.sum(eqt.other, "cost")
    };
    return sheetData;
  }

  /* -------------------------------------------- */


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".gurpsactorsheet").click(ev => { this._onfocus(ev) });
    html.parent(".window-content").siblings(".window-header").click(ev => { this._onfocus(ev) });

    html.find(".rollable").click(this._onClickRoll.bind(this));
    GURPS.hookupGurps(html);
    html.find(".gurpslink").contextmenu(this._onRightClickGurpslink.bind(this));
    html.find(".glinkmod").contextmenu(this._onRightClickGurpslink.bind(this));
    html.find("[data-otf]").contextmenu(this._onRightClickOtf.bind(this));
    html.find(".gmod").contextmenu(this._onRightClickGmod.bind(this));
    html.find(".pdflink").contextmenu(this._onRightClickPdf.bind(this));


    html.find(".dblclksort").dblclick(this._onDblclickSort.bind(this));
    html.find(".enc").click(this._onClickEnc.bind(this));

    html.find(".eqtdraggable").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", ev => {
        return ev.dataTransfer.setData("text/plain", JSON.stringify({ "type": "equipment", "key": ev.currentTarget.dataset.key }))
      })
    });

    html.find(".adsdraggable").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", ev => {
        return ev.dataTransfer.setData("text/plain", JSON.stringify({ "type": "advantage", "key": ev.currentTarget.dataset.key }))
      })
    });

    html.find(".skldraggable").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", ev => {
        return ev.dataTransfer.setData("text/plain", JSON.stringify({ "type": "skill", "key": ev.currentTarget.dataset.key }))
      })
    });

    html.find(".spldraggable").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", ev => {
        return ev.dataTransfer.setData("text/plain", JSON.stringify({ "type": "spell", "key": ev.currentTarget.dataset.key }))
      })
    });

    html.find('button[data-operation="resource-inc"]').click(async ev => {
      ev.preventDefault();
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      let tracker = getProperty(this.actor.data.data, path)
      let value = tracker.value + (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = tracker.max

      let json = `{ "data.${path}.value": ${value} }`
      this.actor.update(JSON.parse(json))
    })

    html.find('button[data-operation="resource-dec"]').click(ev => {
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      let tracker = getProperty(this.actor.data.data, path)
      let value = tracker.value - (ev.shiftKey ? 5 : 1)
      if (isNaN(value)) value = tracker.max

      let json = `{ "data.${path}.value": ${value} }`
      this.actor.update(JSON.parse(json))
    })

    html.find('button[data-operation="resource-reset"]').click(ev => {
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')

      let tracker = getProperty(this.actor.data.data, path)
      let value = tracker.max

      let json = `{ "data.${path}.value": ${value} }`
      this.actor.update(JSON.parse(json))
    })

    html.find('.tracked-resource .header.with-editor').click(async ev => {
      let parent = $(ev.currentTarget).closest('[data-gurps-resource]')
      let path = parent.attr('data-gurps-resource')
      let tracker = getProperty(this.actor.data.data, path)

      let dlgHtml = await
        renderTemplate('systems/gurps/templates/resource-editor-popup.html', tracker)

      let options = {
        width: 130,
        popOut: true,
        minimizable: false,
        jQuery: true
      }

      let d = new Dialog({
        title: 'Resource Editor',
        content: dlgHtml,
        buttons: {
          one: {
            label: "Update",
            callback: async (html) => {
              let name = html.find('.name input').val()
              let current = parseInt(html.find('.current').val())
              let minimum = parseInt(html.find('.minimum').val())
              let maximum = parseInt(html.find('.maximum').val())

              let update = {}
              if (!!name) update[`data.${path}.name`] = name
              if (!!current) update[`data.${path}.value`] = current
              if (!!minimum) update[`data.${path}.min`] = minimum
              if (!!maximum) update[`data.${path}.max`] = maximum

              this.actor.update(update)
            }
          }
        },
        default: "one",
      },
        options);
      d.render(true);
    })

    // START CONDITIONAL INJURY

    const formatCIEmpty = val => val === null ? "" : val;

    const updateActorWithChangedSeverity = changedSeverity => {
      console.log('updateActorWithChangedSeverity');
      this.actor.update({
        "data.conditionalinjury.injury.severity": formatCIEmpty(changedSeverity),
        "data.conditionalinjury.injury.daystoheal": formatCIEmpty(CI.daysToHealForSeverity(changedSeverity)),
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
      console.log('updateActorWithChangedDaysToHeal');
      this.actor.update({
        "data.conditionalinjury.injury.severity": formatCIEmpty(CI.severityForDaysToHeal(changedDaysToHeal)),
        "data.conditionalinjury.injury.daystoheal": formatCIEmpty(changedDaysToHeal),
      })
    }

    html.find('button[data-operation="ci-days-inc"]').click(async ev => {
      ev.preventDefault()
      updateActorWithChangedDaysToHeal(CI.incrementDaysToHeal(this.actor.data.data.conditionalinjury.injury.daystoheal, (ev.shiftKey ? 5 : 1)))
    })

    html.find('button[data-operation="ci-days-dec"]').click(ev => {
      ev.preventDefault()
      updateActorWithChangedDaysToHeal(CI.decrementDaysToHeal(this.actor.data.data.conditionalinjury.injury.daystoheal, (ev.shiftKey ? 5 : 1)))
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
  }


  async _onDblclickSort(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let key = element.dataset.key;
    let self = this;

    let d = new Dialog({
      title: "Sort list",
      buttons: {
        one: {
          icon: '<i class="fas fa-sort-alpha-up"></i>',
          label: "Ascending",
          callback: async () => {
            let i = key.lastIndexOf(".");
            let parentpath = key.substring(0, i);
            let objkey = key.substr(i + 1);
            let object = GURPS.decode(this.actor.data, key);
            let t = parentpath + ".-=" + objkey;
            await self.actor.update({ [t]: null });		// Delete the whole object
            let sortedobj = {};
            let index = 0;
            Object.values(object).sort((a, b) => a.name.localeCompare(b.name)).forEach(o => game.GURPS.put(sortedobj, o, index++));
            await self.actor.update({ [key]: sortedobj });
          }
        },
        two: {
          icon: '<i class="fas fa-sort-alpha-down"></i>',
          label: "Descending",
          callback: async () => {
            let i = key.lastIndexOf(".");
            let parentpath = key.substring(0, i);
            let objkey = key.substr(i + 1);
            let object = GURPS.decode(this.actor.data, key);
            let t = parentpath + ".-=" + objkey;
            await self.actor.update({ [t]: null });		// Delete the whole object
            let sortedobj = {};
            let index = 0;
            Object.values(object).sort((a, b) => b.name.localeCompare(a.name)).forEach(o => game.GURPS.put(sortedobj, o, index++));
            await self.actor.update({ [key]: sortedobj });
          }
        }
      },
      default: "one",
    });
    d.render(true);
  }


  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    let dragData = JSON.parse(event.dataTransfer.getData("text/plain"));

    if (dragData.type === 'damageItem') {
      this.actor.handleDamageDrop(dragData.payload)
    }

    this.handleDragFor(event, dragData, "advantage", "adsdraggable");
    this.handleDragFor(event, dragData, "skill", "skldraggable");
    this.handleDragFor(event, dragData, "spell", "spldraggable");

    if (dragData.type === 'equipment') {
      let element = event.target;
      let classes = $(element).attr('class') || "";
      if (!classes.includes('eqtdraggable') && !classes.includes('eqtdragtarget')) return;
      let targetkey = element.dataset.key;
      if (!!targetkey) {
        let srckey = dragData.key;

        if (srckey.includes(targetkey) || targetkey.includes(srckey)) {
          ui.notifications.error("Unable to drag and drop withing the same hierarchy.   Try moving it elsewhere first.");
          return;
        }
        let object = GURPS.decode(this.actor.data, srckey);
        // Because we may be modifing the same list, we have to check the order of the keys and
        // apply the operation that occurs later in the list, first (to keep the indexes the same)
        let srca = srckey.split(".");
        srca.splice(0, 3);
        let tara = targetkey.split(".");
        tara.splice(0, 3);
        let max = Math.min(srca.length, tara.length);
        let isSrcFirst = false;
        for (let i = 0; i < max; i++) {
          if (parseInt(srca[i]) < parseInt(tara[i])) isSrcFirst = true;
        }
        if (targetkey.endsWith(".other") || targetkey.endsWith(".carried")) {
          let target = GURPS.decode(this.actor.data, targetkey);
          if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey);
          GURPS.put(target, object);
          await this.actor.update({ [targetkey]: target });
          if (isSrcFirst) await GURPS.removeKey(this.actor, srckey);
        } else {
          let d = new Dialog({
            title: object.name,
            content: "<p>Where do you want to drop this?</p>",
            buttons: {
              one: {
                icon: '<i class="fas fa-level-up-alt"></i>',
                label: "Before",
                callback: async () => {
                  if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey);
                  await GURPS.insertBeforeKey(this.actor, targetkey, object);
                  if (isSrcFirst) await GURPS.removeKey(this.actor, srckey);
                }
              },
              two: {
                icon: '<i class="fas fa-sign-in-alt"></i>',
                label: "In",
                callback: async () => {
                  if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey);
                  await GURPS.insertBeforeKey(this.actor, targetkey + ".contains." + GURPS.genkey(0), object);
                  if (isSrcFirst) await GURPS.removeKey(this.actor, srckey);
                }
              }
            },
            default: "one",
          });
          d.render(true);
        }
      }
    }
  }


  async handleDragFor(event, dragData, type, cls) {
    if (dragData.type === type) {
      let element = event.target;
      let classes = $(element).attr('class') || "";
      if (!classes.includes(cls)) return;
      let targetkey = element.dataset.key;
      if (!!targetkey) {
        let srckey = dragData.key;
        if (srckey.includes(targetkey) || targetkey.includes(srckey)) {
          ui.notifications.error("Unable to drag and drop withing the same hierarchy.   Try moving it elsewhere first.");
          return;
        }
        let object = GURPS.decode(this.actor.data, srckey);
        // Because we may be modifing the same list, we have to check the order of the keys and
        // apply the operation that occurs later in the list, first (to keep the indexes the same)
        let srca = srckey.split(".");
        srca.splice(0, 3);
        let tara = targetkey.split(".");
        tara.splice(0, 3);
        let max = Math.min(srca.length, tara.length);
        let isSrcFirst = false;
        for (let i = 0; i < max; i++) {
          if (parseInt(srca[i]) < parseInt(tara[i])) isSrcFirst = true;
        }
        if (!isSrcFirst) await GURPS.removeKey(this.actor, srckey);
        await GURPS.insertBeforeKey(this.actor, targetkey, object);
        if (isSrcFirst) await GURPS.removeKey(this.actor, srckey);
      }
    }

  }


  _onfocus(ev) {
    ev.preventDefault();
    game.GURPS.SetLastActor(this.actor);
  }

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  get title() {
    const t = this.actor.name;
    const sheet = this.actor.getFlag("core", "sheetClass");
    return (sheet === "gurps.GurpsActorEditorSheet") ? "**** Editing: " + t + " ****" : t;
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    const sheet = this.actor.getFlag("core", "sheetClass");
    const isFull = sheet === undefined || sheet === "gurps.GurpsActorSheet";
    const isEditor = sheet === "gurps.GurpsActorEditorSheet";

    // Token Configuration
    const canConfigure = game.user.isGM || this.actor.owner;
    if (this.options.editable && canConfigure) {
      let b = [
        {
          label: isFull ? "Combat View" : "Full View",
          class: "toggle",
          icon: "fas fa-exchange-alt",
          onclick: ev => this._onToggleSheet(ev)
        },
        {
          label: "Import",
          class: "import",
          icon: "fas fa-file-import",
          onclick: ev => this._onFileImport(ev)
        }
      ];
      if (!isEditor) {
        b.push(
          {
            label: "Editor",
            class: "edit",
            icon: "fas fa-edit",
            onclick: ev => this._onOpenEditor(ev)
          });
      }
      buttons = b.concat(buttons);
    }
    return buttons
  }

  async _onFileImport(event) {
    event.preventDefault();
    let element = event.currentTarget;
    new Dialog({
      title: `Import character data for: ${this.actor.name}`,
      content: await renderTemplate("systems/gurps/templates/import-gcs-v1-data.html", { name: '"' + this.actor.name + '"' }),
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import",
          callback: html => {
            const form = html.find("form")[0];
            let files = form.data.files;
            let file = null;
            if (!files.length) {
              return ui.notifications.error("You did not upload a data file!");
            } else {
              file = files[0];
              readTextFromFile(file).then(text => this.actor.importFromGCSv1(text, file.name, file.path));
            }
          }
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "import"
    }, {
      width: 400
    }).render(true);
  }

  async _onToggleSheet(event) {
    event.preventDefault()
    let newSheet = "gurps.GurpsActorCombatSheet"

    const original = this.actor.getFlag("core", "sheetClass") || Object.values(CONFIG.Actor.sheetClasses["character"]).filter(s => s.default)[0].id;
    console.log("original: " + original)

    if (original != "gurps.GurpsActorSheet") newSheet = "gurps.GurpsActorSheet";
    if (event.shiftKey)   // Hold down the shift key for Simplified
      newSheet = "gurps.GurpsActorSimplifiedSheet";
    if (game.keyboard.isCtrl(event))   // Hold down the Ctrl key (Command on Mac) for Simplified
      newSheet = "gurps.GurpsActorNpcSheet";

    await this.actor.sheet.close()

    // Update the Entity-specific override
    await this.actor.setFlag("core", "sheetClass", newSheet)

    // Re-draw the updated sheet
    const updated = this.actor.getFlag("core", "sheetClass")
    console.log("updated: " + updated)
    this.actor.sheet.render(true)
  }

  async _onOpenEditor(event) {
    event.preventDefault();
    await this.actor.sheet.close();
    await this.actor.setFlag("core", "sheetClass", "gurps.GurpsActorEditorSheet");
    this.actor.sheet.render(true)
  }

  async _onRightClickGurpslink(event) {
    event.preventDefault();
    let el = event.currentTarget;
    let action = el.dataset.action;
    if (!!action) {
      action = JSON.parse(atob(action));
      this.whisperOtfToOwner(action.orig, event, (action.hasOwnProperty("blindroll") && !action.blindroll));  // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
    }
  }

  async _onRightClickPdf(event) {
    event.preventDefault();
    let el = event.currentTarget;
    this.whisperOtfToOwner("PDF:" + el.innerText, event);
  }

  async _onRightClickGmod(event) {
    event.preventDefault();
    let el = event.currentTarget;
    let n = el.dataset.name;
    let t = el.innerText;
    this.whisperOtfToOwner(t + " " + n, event);
  }

  async _onRightClickOtf(event) {
    event.preventDefault();
    let el = event.currentTarget;
    this.whisperOtfToOwner(event.currentTarget.dataset.otf, event, !el.dataset.hasOwnProperty("damage"));    // Can't blind roll damages (yet)
  }

  async whisperOtfToOwner(otf, event, canblind) {
    if (!game.user.isGM) return;
    if (!!otf) {
      otf = otf.replace(/ \(\)/g, "");  // sent as "name (mode)", and mode is empty (only necessary for attacks)
      let users = this.actor.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true).filter(u => !u.isGM);
      let botf = "[!" + otf + "]"
      otf = "[" + otf + "]";
      let buttons = {};
      buttons.one = {
        icon: '<i class="fas fa-users"></i>',
        label: "To Everyone",
        callback: () => this.sendOtfMessage(otf, false)
      }
      if (canblind)
        buttons.two = {
          icon: '<i class="fas fa-users-slash"></i>',
          label: "Blindroll to Everyone",
          callback: () => this.sendOtfMessage(botf, true)
        };
      if (users.length > 0) {
        let nms = users.map(u => u.name).join(' ');
        buttons.three = {
          icon: '<i class="fas fa-user"></i>',
          label: "Whisper to " + nms,
          callback: () => this.sendOtfMessage(otf, false, users)
        }
        if (canblind)
          buttons.four = {
            icon: '<i class="fas fa-user-slash"></i>',
            label: "Whisper Blindroll to " + nms,
            callback: () => this.sendOtfMessage(botf, true, users)
          }
      }

      let d = new Dialog({
        title: "GM 'Send Formula'",
        content: `<div style='text-align:center'>How would you like to send the formula:<br><br><div style='font-weight:700'>${otf}<br>&nbsp;</div>`,
        buttons: buttons,
        default: "four"
      });
      d.render(true);
    }
  }

  sendOtfMessage(content, blindroll, users) {
    let msgData = {
      content: content,
      user: game.user._id,
      blind: blindroll
    }
    if (!!users) {
      msgData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
      msgData.whisper = users.map(it => it._id);
    } else {
      msgData.type = CONST.CHAT_MESSAGE_TYPES.OOC;
    }
    ChatMessage.create(msgData);
  }

  async _onClickRoll(event) {
    game.GURPS.handleRoll(event, this.actor);
  }

  async _onClickEnc(ev) {
    ev.preventDefault();
    let element = ev.currentTarget;
    let key = element.dataset.key;
    let encs = this.actor.data.data.encumbrance;
    if (encs[key].current) return;  // already selected
    for (let enckey in encs) {
      let enc = encs[enckey];
      let t = "data.encumbrance." + enckey + ".current";
      if (enc.current) {
        await this.actor.update({ [t]: false });
      }
      if (key === enckey) {
        await this.actor.update({ [t]: true });
      }
    }
  }


  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    return super._updateObject(event, formData);
  }
}

export class GurpsActorCombatSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "sheet", "actor"],
      template: "systems/gurps/templates/combat-sheet.html",
      width: 600,
      height: 275,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }
}

export class GurpsActorEditorSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "gurpsactorsheet", "sheet", "actor"],
      template: "systems/gurps/templates/actor-sheet-gcs-editor.html",
      scrollY: [".gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipment #other_equipment #notes"],
      width: 800,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  makeAddDeleteMenu(html, cssclass, obj) {
    new ContextMenu(html, cssclass, this.addDeleteMenu(obj));
  }

  addDeleteMenu(obj) {
    return [
      {
        name: "Add Before",
        icon: "<i class='fas fa-edit'></i>",
        callback: e => {
          GURPS.insertBeforeKey(this.actor, e[0].dataset.key, duplicate(obj));
        }
      },
      {
        name: "Delete",
        icon: "<i class='fas fa-trash'></i>",
        callback: e => {
          GURPS.removeKey(this.actor, e[0].dataset.key);
        }
      },
      {
        name: "Add at the end",
        icon: "<i class='fas fa-edit'></i>",
        callback: e => {
          let p = e[0].dataset.key;
          let i = p.lastIndexOf(".");
          let objpath = p.substring(0, i);
          let o = GURPS.decode(this.actor.data, objpath);
          GURPS.put(o, duplicate(obj));
          this.actor.update({ [objpath]: o });
        }
      }
    ];
  }

  headerMenu(name, obj, path) {
    return [{
      name: "Add " + name + " at the end",
      icon: "<i class='fas fa-edit'></i>",
      callback: e => {
        let o = GURPS.decode(this.actor.data, path);
        GURPS.put(o, duplicate(obj));
        this.actor.update({ [path]: o });
      }
    }
    ];
  }

  makeHeaderMenu(html, cssclass, name, obj, path) {
    new ContextMenu(html, cssclass, this.headerMenu(name, obj, path));
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".changeequip").click(this._onClickEquip.bind(this));
    html.find("#ignoreinputbodyplan").click(this._onClickBodyPlan.bind(this));
    
    this.makeHeaderMenu(html, ".hlhead", "Hit Location", new HitLocation("???"), "data.hitlocations");
    this.makeAddDeleteMenu(html, ".hlmenu", new HitLocation("???"));

    this.makeHeaderMenu(html, ".reacthead", "Reaction", new Reaction("+0", "from ..."), "data.reactions");
    this.makeAddDeleteMenu(html, ".reactmenu", new Reaction("+0", "from ..."));

    this.makeHeaderMenu(html, ".meleehead", "Melee Attack", new Melee("New Attack"), "data.melee");
    this.makeAddDeleteMenu(html, ".meleemenu", new Melee("New Attack"));

    this.makeHeaderMenu(html, ".rangedhead", "Ranged Attack", new Ranged("New Attack"), "data.ranged");
    this.makeAddDeleteMenu(html, ".rangedmenu", new Ranged("New Attack"));

    this.makeHeaderMenu(html, ".adshead", "Advantage/Disadvantage/Quirk/Perk", new Advantage("New Advantage/Disadvantage/Quirk/Perk"), "data.ads");
    this.makeAddDeleteMenu(html, ".adsmenu", new Advantage("New Advantage"));

    this.makeHeaderMenu(html, ".skillhead", "Skill", new Skill("New Skill"), "data.skills");
    this.makeAddDeleteMenu(html, ".skillmenu", new Skill("New Skill"));

    this.makeHeaderMenu(html, ".spellhead", "Spell", new Spell("New Spell"), "data.spells");
    this.makeAddDeleteMenu(html, ".spellmenu", new Spell("New Spell"));

    this.makeHeaderMenu(html, ".notehead", "Note", new Note("New Note"), "data.notes");
    this.makeAddDeleteMenu(html, ".notemenu", new Note("New Note"));

    this.makeHeaderMenu(html, ".carhead", "Carried Equipment", new Equipment("New Equipment"), "data.equipment.carried");
    this.makeHeaderMenu(html, ".othhead", "Other Equipment", new Equipment("New Equipment"), "data.equipment.other");

    let opts = this.addDeleteMenu(new Equipment("New Equipment"));
    opts.push({
      name: "Add In (new Equipment will be contained by this)",
      icon: "<i class='fas fa-edit'></i>",
      callback: e => {
        let k = e[0].dataset.key + ".contains";
        let o = GURPS.decode(this.actor.data, k) || {};
        GURPS.put(o, duplicate(new Equipment("New Equipment")));
        this.actor.update({ [k]: o });
      }
    });
    new ContextMenu(html, ".carmenu", opts);
    new ContextMenu(html, ".othmenu", opts);
  }
  
  
  async _onClickBodyPlan(ev) {
    ev.preventDefault();
    let element = ev.currentTarget;
    let ignore = element.checked
    await this.actor.update({ "data.additionalresources.ignoreinputbodyplan": ignore });
  }

  async _onClickEquip(ev) {
    ev.preventDefault();
    let element = ev.currentTarget;
    let key = element.dataset.key;
    let eqt = GURPS.decode(this.actor.data, key);
    eqt.equipped = !eqt.equipped;
    await this.actor.update({ [key]: eqt });
  }
}

export class GurpsActorSimplifiedSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["gurps", "sheet", "actor"],
      template: "systems/gurps/templates/simplified.html",
      width: 820,
      height: 900,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  getData() {
    const data = super.getData();
    data.dodge = this.actor.getCurrentDodge();
    data.defense = this.actor.getTorsoDr();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".rollableicon").click(this._onClickRollableIcon.bind(this));

  }

  async _onClickRollableIcon(ev) {
    ev.preventDefault();
    let element = ev.currentTarget;
    let val = element.dataset.value;
    let parsed = parselink(val);
    GURPS.performAction(parsed.action, this.actor, ev);
  }
}

export class GurpsActorNpcSheet extends GurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["npc-sheet", "sheet", "actor"],
      template: "systems/gurps/templates/npc-sheet.html",
      width: 650,
      height: 450,
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  getData() {
    const data = super.getData();
    data.dodge = this.actor.getCurrentDodge();
    data.defense = this.actor.getTorsoDr();
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".rollableicon").click(this._onClickRollableIcon.bind(this));

  }

  async _onClickRollableIcon(ev) {
    ev.preventDefault();
    let element = ev.currentTarget;
    let val = element.dataset.value;
    let parsed = parselink(val);
    GURPS.performAction(parsed.action, this.actor, ev);
  }
}

let _getProperty = function (object, key) {
  let target = object;

  // Convert the key to an object reference if it contains dot notation
  if (key.indexOf('.') !== -1) {
    let parts = key.split('.');
    key = parts.pop();
    target = parts.reduce((o, i) => {
      if (!o.hasOwnProperty(i)) o[i] = {};
      return o[i];
    }, object);
  }
  return target;
}
