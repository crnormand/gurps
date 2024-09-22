import GurpsWiring from '../gurps-wiring.js'
import { i18n, i18n_f, sanitize } from '../../lib/utilities.js'
import { gurpslink } from '../../module/utilities/gurpslink.js'
import { parselink } from '../../lib/parselink.js'
import { RulerGURPS } from '../../lib/ranges.js'

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
      width: 400,
      left: sidebarLeft - 405,
      height: 'auto',
      minimizable: true,
      jQuery: true,
      resizable: true,
      title: i18n('GURPS.effectModifierPopout', 'Effect Modifiers'),
    })
  }

  /** @override */
  getData(options) {
    let selfMods = []
    if (this._token) {
      selfMods = this.convertModifiers(this._token.actor.system.conditions.self.modifiers)
      selfMods.push(...this.convertModifiers(this._token.actor.system.conditions.usermods))
    }
    return foundry.utils.mergeObject(super.getData(options), {
      selected: this.selectedToken,
      selfmodifiers: selfMods,
      targetmodifiers: this._token ? this.convertModifiers(this._token.actor.system.conditions.target.modifiers) : [],
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
      let mod = this.calculateRange(this.getToken(), target)
      if (mod && mod.modifier !== 0)
        result.targetmodifiers.push(
          gurpslink(`[${mod.modifier} range to target ${target.actor?.name} (${mod.yards} ${canvas.scene.grid.units})]`)
        )

      // Add the range to the target

      results.push(result)
    }
    return results
  }

  convertModifiers(list) {
    return list ? list.map(it => `[${i18n(it)}]`).map(it => gurpslink(it)) : []
  }

  get selectedToken() {
    return this._token?.name ?? i18n('GURPS.effectModNoTokenSelected')
  }

  calculateRange(token1, token2) {
    if (!token1 || !token2) return undefined
    if (token1 == token2) return undefined

    // const ruler = new Ruler() as Ruler & { totalDistance: number }
    const ruler = new RulerGURPS(game.user)
    ruler._state = Ruler.STATES.MEASURING
    ruler._addWaypoint({ x: token1.x, y: token1.y }, { snap: false })
    ruler.measure({ x: token2.x, y: token2.y }, { gridSpaces: true })
    const horizontalDistance = ruler.totalDistance
    const verticalDistance = Math.abs(token1.document.elevation - token2.document.elevation)
    ruler.clear()

    const dist = Math.sqrt(horizontalDistance ** 2 + verticalDistance ** 2) - 1
    const yards = ruler.convert_to_yards(dist, canvas.scene.grid.units)
    return {
      yards: Math.ceil(dist),
      modifier: ruler.yardsToSpeedRangePenalty(yards),
    }
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
      .text(i18n_f('GURPS.effectModifierPopout', { name: this.selectedToken }, 'Effect Modifiers: {name}'))
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons()
    buttons.unshift({
      class: 'trash',
      icon: 'fas fa-trash',
      onclick: ev => this.clearUserMods(ev),
    })
    buttons.unshift({
      class: 'add',
      icon: 'fas fa-plus',
      onclick: ev => this.addUserMod(ev),
    })
    return buttons
  }

  clearUserMods(event) {
    let t = this.getToken()
    if (t && t.actor) {
      let umods = t.actor.system.conditions.usermods
      if (umods) {
        t.actor.update({ 'system.conditions.usermods': [] }).then(() => this.render(true))
      }
    }
  }

  addUserMod(event) {
    if (this.getToken()) {
      setTimeout(() => $.find('#GURPS-user-mod-input')[0].focus(), 200)
      Dialog.prompt({
        title: 'Enter new modifier:',
        content: "<input type='text' id='GURPS-user-mod-input' style='text-align: left;' placeholder ='+1 bonus'>'",
        label: 'Add (or press Enter)',
        callback: html => {
          let mod = html.find('#GURPS-user-mod-input').val()
          if (!!mod) {
            let action = parselink(mod)
            if (action.action?.type == 'modifier') this._addUserMod(mod)
            else ui.notifications.warn(i18n('GURPS.chatUnrecognizedFormat'))
          }
        },
        rejectClose: false,
      })
    } else ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
  }

  onRightClick(event) {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let text = sanitize(el.innerHTML)
    let t = this.getToken()
    if (t && t.actor) {
      let umods = t.actor.system.conditions.usermods
      if (umods) {
        let m = umods.filter(i => sanitize(i) != text)
        if (umods.length != m.length) t.actor.update({ 'system.conditions.usermods': m }).then(() => this.render(true))
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
      mod += ' (' + i18n('GURPS.equipmentUserCreated') + ')'
      let m = t.actor.system.conditions.usermods ? [...t.actor.system.conditions.usermods] : []
      m.push(mod)
      t.actor.update({ 'system.conditions.usermods': m }).then(() => this.render(true))
    } else ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
  }

  /** @override */
  async close(options) {
    this._callback.close(options)
  }

  async closeApp(options) {
    super.close(options)
  }
}
