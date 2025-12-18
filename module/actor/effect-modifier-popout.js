import * as Settings from '../../lib/miscellaneous-settings.js'
import { parselink } from '../../lib/parselink.js'
import { recurselist, sanitize } from '../../lib/utilities.js'
import { Length } from '../data/common/length.js'
import GurpsWiring from '../gurps-wiring.js'
import { TokenActions } from '../token-actions.js'
import { gurpslink } from '../utilities/gurpslink.js'
import Maneuvers from './maneuver.js'

export const calculateRange = (token1, token2) => {
  if (!token1 || !token2) return undefined
  if (token1 === token2) return undefined

  // TODO: Ruler shouldn't be needed here, we should be able to get the
  // SSRT value without invoking it.
  const ruler = new CONFIG.Canvas.rulerClass(game.user)

  let dist = canvas.grid.measurePath([token1.document, token2.document]).distance

  if (game.release.generation === 12) {
    const verticalDistance = Math.abs(token1.document.elevation - token2.document.elevation)
    dist = Math.sqrt(Math.pow(dist, 2) + Math.pow(verticalDistance, 2)) - 1
  }

  const yards = Length.from(dist, canvas.scene.grid.units).to(Length.Unit.Yard).value
  return {
    yards: Math.ceil(dist),
    modifier: ruler.yardsToRangePenalty(yards),
  }
}

export const getRangedModifier = (source, target) => {
  const taggedModifiersSetting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
  const rangedTag = taggedModifiersSetting.allRangedRolls.split(',')[0]
  const baseTags = `#${rangedTag}`
  let rangeModifier
  let mod = calculateRange(source, target)
  if (mod && mod.modifier !== 0) {
    rangeModifier = game.i18n.format('GURPS.rangeToTarget', {
      modifier: mod.modifier,
      name: target.actor?.name,
      distance: mod.yards,
      unit: canvas.scene.grid.units,
    })
    rangeModifier += ` ${baseTags} @combatmod`
  }
  return rangeModifier
}

export const getSizeModifier = (source, target) => {
  const taggedModifiersSetting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
  const meleeTag = taggedModifiersSetting.allMeleeRolls.split(',')[0]
  const baseTags = `#${meleeTag}`
  let sizeModifier
  if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE)) {
    const attackerSM = foundry.utils.getProperty(source.actor, 'system.traits.sizemod') || 0
    const targetSM = foundry.utils.getProperty(target.actor, 'system.traits.sizemod') || 0
    const sizeDiff = targetSM - attackerSM
    if (sizeDiff !== 0) {
      const smText = `${sizeDiff >= 0 ? '+' : ''}${sizeDiff}`
      sizeModifier = game.i18n.format('GURPS.modifiersSizeDifference', {
        sm: smText,
        sourceSM: attackerSM,
        targetSM: targetSM,
      })
      sizeModifier += ` ${baseTags} @sizemod`
    }
  }
  return sizeModifier
}

export class EffectModifierPopout extends Application {
  constructor(token, callback, options = {}) {
    super(options)
    this._token = token
    this._callback = callback
  }

  /** @override */
  static get defaultOptions() {
    let x = $('#sidebar')
    let sidebarLeft = x.parent().position().left
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/actor/effect-modifier-popout.hbs',
      classes: ['sidebar-popout effect-modifiers-app'],
      popOut: true,
      top: 0,
      width: 550,
      left: sidebarLeft - 555,
      height: 'auto',
      minimizable: true,
      jQuery: true,
      resizable: true,
      title: game.i18n.localize('GURPS.effectModifierPopout', 'Effect Modifiers'),
    })
  }

  /** @override */
  getData(options) {
    if (!this._token?.actor) return
    let selfMods = []
    selfMods = this.convertModifiers(this._token.actor.system.conditions.self.modifiers)
    selfMods.push(...this.convertModifiers(this._token.actor.system.conditions.usermods))
    selfMods.sort((a, b) => {
      if (a.itemName === b.itemName) {
        return a.desc.localeCompare(b.desc)
      }
      return a.itemName.localeCompare(b.itemName)
    })
    const targetModifiers = this._token
      ? this.convertModifiers(this._token.actor.system.conditions.target.modifiers)
      : []
    return foundry.utils.mergeObject(super.getData(options), {
      selected: this.selectedToken,
      selfmodifiers: selfMods,
      targetmodifiers: targetModifiers,
      targets: this.targets,
    })
  }

  get targets() {
    let results = []
    for (const target of Array.from(game.user.targets)) {
      let result = {}
      result.name = target.name

      result.targetmodifiers = target.actor
        ? this.convertModifiers(target.actor.system.conditions.target.modifiers)
        : []

      const smModifier = getSizeModifier(this.getToken(), target)
      if (smModifier) {
        result.targetmodifiers = [...result.targetmodifiers, ...this.convertModifiers([smModifier])]
      }

      const rangeModifier = getRangedModifier(this.getToken(), target)
      if (rangeModifier) {
        const data = this.convertModifiers([rangeModifier])
        result.targetmodifiers = [...result.targetmodifiers, ...data]
      }

      // Sort the target modifiers by itemID.
      result.targetmodifiers.sort((a, b) => {
        return a.itemId.localeCompare(b.itemId)
      })

      results.push(result)
    }

    return results
  }

  /**
   * convertModifiers takes a list of modifier strings (e.g., “+2 Aim @itemId #tag”) and turns each into a structured
   * object used by the UI. For each entry it:
   *
   * Parses tags (#...) via getTags.
   *
   * Extracts the item reference after @. If it’s a system path (system.*), it pulls data from the actor; if it’s a
   * special ref:
   *  - man:<id> → finds the maneuver and uses its localized name/type.
   *  - eft:<id> → resolves an active effect from the actor.
   *
   * Otherwise, it treats the ref as an item ID on the actor.
   *
   * Determines itemName (from the resolved object or the raw ref) and itemType (maneuver, active-effect,
   * conditional/reaction/system type, or notfound fallback).
   *
   * Builds a localized description (getDescription strips off tags/refs) and a gurpslink link for display.
   *
   * Returns an array of objects: { link, desc, itemName, itemType, itemId, tags }.
   *
   * If the input isn’t an array, it returns an empty array.
   *
   * @param {*} list
   * @returns
   */
  convertModifiers(list) {
    return Array.isArray(list)
      ? list.map(it => {
          const tags = this.getTags(it)
          let itemReference = it.match(/@(\S+)/)?.[1] || 'custom'
          let obj = {}

          if (itemReference.includes('system.')) {
            if (itemReference.includes('.conditionalmods.')) {
              obj.name = game.i18n.localize('GURPS.conditionalMods')
            } else if (itemReference.includes('.reactions.')) {
              obj.name = game.i18n.localize('GURPS.reactionMods')
            } else {
              obj = foundry.utils.getProperty(this._token.actor, itemReference)
            }
          } else if (itemReference.match(/\w{3}:/)) {
            const refType = itemReference.match(/(\w{3}):/)[1]
            const refValue = itemReference.match(/\w{3}:(\S+)/)[1]

            switch (refType) {
              case 'man':
                const maneuver = Maneuvers.getManeuver(refValue)
                obj.name = game.i18n.localize(maneuver.label)
                obj.type = 'maneuver'
                break
              case 'eft':
                const effect = this._token?.actor.effects.get(refValue)
                obj.name = effect?.name || game.i18n.localize('GURPS.ActiveEffect')
                obj.type = 'active-effect'
                break
            }
          } else {
            obj = this._token?.actor.items.get(itemReference) || {}
          }
          const itemName = obj?.name || itemReference
          const itemType = obj?.type
            ? obj.type
            : it.includes('#maneuver')
              ? 'maneuver'
              : itemReference.includes('system.')
                ? itemReference.split('.')[1]
                : 'notfound'
          const desc = this.getDescription(it, itemReference)
          return {
            link: gurpslink(`[${game.i18n.localize(desc)}]`),
            desc: game.i18n.localize(desc),
            itemName,
            itemType,
            itemId: itemReference,
            tags,
          }
        })
      : []
  }

  get selectedToken() {
    return this._token?.name ?? game.i18n.localize('GURPS.effectModNoTokenSelected')
  }

  getToken() {
    return this._token
  }

  async setToken(value) {
    this._token = value
    await this.render(false)
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)

    GurpsWiring.hookupGurps(html)

    html.find('a.gurpslink').on('contextmenu', ev => this.onRightClick(ev))
    html.find('.gurpslink').on('contextmenu', ev => this.onRightClick(ev))
    html.find('.glinkmod').on('contextmenu', ev => this.onRightClick(ev))
    html.find('.glinkmodplus').on('contextmenu', ev => this.onRightClick(ev))
    html.find('.glinkmodminus').on('contextmenu', ev => this.onRightClick(ev))
    html.find('.gmod').on('contextmenu', ev => this.onRightClick(ev))

    html.closest('div.effect-modifiers-app').on('drop', ev => this.handleDrop(ev))
    html.find('.modifier-list').on('drop', ev => this.handleDrop(ev))
    html
      .closest('div.effect-modifiers-app')
      .find('.window-title')
      .text(game.i18n.localize('GURPS.effectModifierPopout'))
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons()
    buttons.unshift({
      class: 'trash',
      icon: 'fas fa-trash',
      onclick: async ev => this.clearUserMods(ev),
    })
    buttons.unshift({
      class: 'add',
      icon: 'fas fa-plus',
      onclick: ev => this.addUserMod(ev),
    })
    buttons.unshift({
      class: 'refresh',
      icon: 'fas fa-sync',
      onclick: async ev => this.refreshUserMods(ev),
    })
    return buttons
  }

  async refreshUserMods(event) {
    const actor = this.getToken()?.actor
    if (actor) {
      const userMods = foundry.utils.getProperty(actor, 'system.conditions.usermods') || []
      const customMods = userMods.filter(it => it.includes('@custom'))
      const itemMods = actor.applyItemModEffects({})
      let sheetMods = []

      const taggedSettings = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      if (taggedSettings.checkConditionals) {
        const conditionalMods = foundry.utils.getProperty(actor, 'system.conditionalmods') || {}
        recurselist(conditionalMods, (e, _k, _d) => {
          const mod = parseInt(e.modifier) || 0
          const signal = mod > 0 ? '+' : '-'
          const source = `system.conditionalmods.${_k}`
          if (mod !== 0) sheetMods.push(`${signal}${Math.abs(mod)} ${e.situation} @${source}`)
        })
      }
      if (taggedSettings.checkReactions) {
        const reactionMods = foundry.utils.getProperty(actor, 'system.reactions') || {}
        recurselist(reactionMods, (e, _k, _d) => {
          const mod = parseInt(e.modifier) || 0
          const signal = mod > 0 ? '+' : '-'
          const source = `system.reactions.${_k}`
          if (mod !== 0) sheetMods.push(`${signal}${Math.abs(mod)} ${e.situation} @${source}`)
        })
      }
      const newMods = [...itemMods['system.conditions.usermods'], ...customMods, ...sheetMods]
      await actor.internalUpdate({ 'system.conditions.usermods': newMods })
      // Check if combat
      if (!!game.combat?.isActive) {
        const actions = await TokenActions.fromToken(this.getToken())
        await actions.addModifiers()
      }
      await this.render(true)
      ui.notifications.info(game.i18n.localize('GURPS.userModsRefreshed'))
    }
  }

  async clearUserMods(event) {
    const actor = this.getToken()?.actor
    // Add a Confirm dialog
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('GURPS.confirmClearUserMods') },
      content: game.i18n.localize('GURPS.confirmClearHintUserMods'),
    })

    if (proceed) {
      if (actor) {
        await actor.update({ 'system.conditions.usermods': [] })
        await this.render(true)
      }
    }
  }

  async addUserMod(event) {
    if (this.getToken()) {
      setTimeout(() => $.find('#GURPS-user-mod-input')[0].focus(), 200)
      const input = await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize('GURPS.addUserMod') },
        content: `<input type='text' id='GURPS-user-mod-input' name='input' style='text-align: left;' placeholder="${game.i18n.localize('GURPS.userModInputPlaceholder')}">`,
        ok: {
          label: 'Add (or press Enter)',
          callback: (event, button, dialog) => button.form.elements.input.value,
        },
      })

      if (input) {
        // Because the '@' separator is a reserved character, we will replace it with space
        let mod = input.replace('@', ' ')
        if (!!mod) {
          let action = parselink(mod)
          if (action.action?.type === 'modifier') this._addUserMod(mod)
          else ui.notifications.warn(game.i18n.localize('GURPS.chatUnrecognizedFormat'))
        }
      }
    } else ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
  }

  getDescription(text, itemRef) {
    const regex = /^(.*?)(?=[#@])/
    const desc = text.match(regex)?.[1]
    return !!desc ? desc.trim() : text
  }

  getTags(text) {
    const tags = text.match(/#(\S+)/g)?.map(it => it.slice(1))
    return !!tags ? tags : []
  }

  onRightClick(event) {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let text = sanitize(el.innerHTML)
    const itemId = $(el).closest('.me-link').data().itemId
    const itemType = $(el).closest('.me-link').data().type
    if (!!itemId && itemId.includes('system.') && itemType !== 'maneuver') {
      this._token.actor.sheet?.render(true)
      return
    }
    if (!!itemId && itemId !== 'custom' && itemType !== 'maneuver' && itemType !== 'active-effect') {
      const item = this._token.actor.items.get(itemId)
      if (item) {
        item.sheet.render(true)
      }
      return
    }
    if (!!itemId && itemType === 'active-effect') {
      const effectId = itemId.split(':')[1]
      const effect = this._token.actor.effects.get(effectId)
      if (effect) {
        effect.sheet.render(true)
      }
      return
    }
    let t = this.getToken()
    if (t && t.actor) {
      let umods = t.actor.system.conditions.usermods
      if (umods) {
        let m = umods.filter(i => !sanitize(i).includes(this.getDescription(text)))
        if (umods.length !== m.length) t.actor.update({ 'system.conditions.usermods': m }).then(() => this.render(true))
      }
    }
  }

  handleDrop(ev) {
    ev.preventDefault()
    ev.stopImmediatePropagation()
    if (!!ev.originalEvent) ev = ev.originalEvent
    let dragData = JSON.parse(ev.dataTransfer.getData('text/plain'))
    let add = ''
    if (!!dragData.otf) {
      let action = parselink(dragData.otf)
      if (action.action?.type == 'modifier' || action.action?.type == 'damage') add = dragData.otf
    }
    if (!!dragData.bucket) {
      let sep = ''
      dragData.bucket.forEach(otf => {
        add += sep + otf.trim()
        sep = ' & '
      })
    }
    if (add.length == 0) return
    this._addUserMod(add)
  }

  _addUserMod(mod) {
    let t = this.getToken()
    if (t && t.actor) {
      mod += ' (' + game.i18n.localize('GURPS.equipmentUserCreated') + ')'
      let m = t.actor.system.conditions.usermods ? [...t.actor.system.conditions.usermods] : []
      m.push(`${mod} @custom`)
      t.actor.update({ 'system.conditions.usermods': m }).then(() => this.render(true))
    } else ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
  }

  /** @override */
  async close(options) {
    this._callback.close(options)
  }

  async closeApp(options) {
    super.close(options)
  }
}

/**
 * Cleans up tags to be used in the settings
 * @param {string} tags
 * @returns {string[]}
 */
export const cleanTags = tags =>
  (tags || '')
    .split(',')
    .map(it => it.trim())
    .filter(it => !!it)
    .map(it => it.toLowerCase())
    .map(it => it.replace(/\W/g, ''))

export class TaggedModifierSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize('GURPS.settingUseTaggedModifiers'),
      id: 'use-tagged-modifiers',
      template: 'systems/gurps/templates/tagged-modifier-settings.hbs',
      width: 500,
      closeOnSubmit: true,
      tabs: [{ navSelector: '.gurps-sheet-tabs', contentSelector: '.content', initial: 'all-rolls-tab' }],
    })
  }

  getData() {
    return {
      ...game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS),
    }
  }

  async _updateObject(event, formData) {
    const cleanData = Object.keys(formData).reduce((acc, key) => {
      if (typeof formData[key] === 'string') {
        if (key.toLowerCase().includes('combat')) {
          acc[key] = cleanTags(formData[key])[0]
        } else {
          acc[key] = cleanTags(formData[key]).join(', ')
        }
      } else {
        acc[key] = formData[key]
      }
      return acc
    }, {})
    await game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS, cleanData)
  }
}
