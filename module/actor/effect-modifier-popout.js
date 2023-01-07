import GurpsWiring from '../gurps-wiring.js'
import { i18n, i18n_f, sanitize } from '../../lib/utilities.js'
import { gurpslink } from '../../module/utilities/gurpslink.js'
import { parselink } from '../../lib/parselink.js'

export class EffectModifierPopout extends Application {
  constructor(token, callback, options = {}) {
    super(options)
    this._token = token
    this._callback = callback
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/actor/effect-modifier-popout.hbs',
      classes: ['sidebar-popout effect-modifiers-app'],
      popOut: true,
      top: 0,
      width: 400,
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
    return mergeObject(super.getData(options), {
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

  getToken() {
    return this._token
  }

  async setToken(value) {
    this._token = value
    await this.render(false)
  }

  /** @override */
  activateListeners(html) {
    GurpsWiring.hookupGurps(html)

    html.find('a.gurpslink').on('contextmenu', (ev) => this.onRightClick(ev))
    html.find('.gurpslink').on('contextmenu', (ev) => this.onRightClick(ev))
    html.find('.glinkmod').on('contextmenu', (ev) => this.onRightClick(ev))
    html.find('.glinkmodplus').on('contextmenu', (ev) => this.onRightClick(ev))
    html.find('.glinkmodminus').on('contextmenu', (ev) => this.onRightClick(ev))
    html.find('.gmod').on('contextmenu', (ev) => this.onRightClick(ev))

    html.closest('div.effect-modifiers-app').on('drop', (ev) => this.handleDrop(ev))
    html.find('.modifier-list').on('drop', (ev) => this.handleDrop(ev))
    html
      .closest('div.effect-modifiers-app')
      .find('.window-title')
      .text(i18n_f('GURPS.effectModifierPopout', { name: this.selectedToken }, 'Effect Modifiers: {name}'))
    
    // Place the effect mod window just to the left of sidebar  
    setTimeout( ()=> {
      let x = $('#sidebar')
      let sidebarLeft = x.parent().position().left
  
      let width = parseFloat(html.parent().parent().width())
      if (!isNaN(width)) {
        // ensure that left is not negative
        let left = sidebarLeft - width
        //console.log("SB:" + sidebarLeft + " w:" + width + " left:" + left)
        html.parent().parent().css('left', `${left}px`)
      }
    }, 1)   // This needs to be calculated later... so it's width is correctly set first
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
        if (umods.length != m.length)
          t.actor.update({'system.conditions.usermods' : m}).then(() => this.render(true))
      }
    }    
  } 
  
  handleDrop(ev) {
    ev.preventDefault()
    ev.stopImmediatePropagation()
    if (!!ev.originalEvent) ev = ev.originalEvent
    let dragData = JSON.parse(ev.dataTransfer.getData('text/plain'))
    let uc = " (" + i18n("GURPS.equipmentUserCreated") + ")"
    let add = ''
    if (!!dragData.otf) {
      let action = parselink(dragData.otf)
      if (action.action?.type == 'modifier')
        add = dragData.otf + uc
    }
    if (!!dragData.bucket) {
      let sep = ''
      dragData.bucket.forEach(otf => {
        add += sep + otf
        sep = ' & '
      })
      add += uc
    }
    if (add.length == 0) return
    let t = this.getToken()
    if (t && t.actor) {
      let m = t.actor.system.conditions.usermods ? [...t.actor.system.conditions.usermods] : []
      m.push(add)
      t.actor.update({'system.conditions.usermods' : m}).then(() => this.render(true))
    } else
      ui.notifications.warn(i18n("GURPS.chatYouMustHaveACharacterSelected"))
  }

  /** @override */
  async close(options) {
    this._callback.close(options)
  }

  async closeApp(options) {
    super.close(options)
  }
}
