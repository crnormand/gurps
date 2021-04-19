import { displayMod, localizeWithFallback } from '../../lib/utilities.js'
import * as settings from '../../lib/miscellaneous-settings.js'
import ModifierBucketEditor from './modifier-bucket-editor.js'
import ModifierBucketJournals from './modifier-bucket-journals.js'

let i18n = localizeWithFallback

Hooks.once('init', async function () {
  Hooks.on('closeModifierBucketEditor', (editor, element) => {
    $(element).hide() // To make this application appear to close faster, we will hide it before the animation
  })
})

// Install Custom Roll to support global modifier access (@gmod & @gmodc)
export class GurpsRoll extends Roll {
  _prepareData(data) {
    let d = super._prepareData(data)
    if (!d.hasOwnProperty('gmodc'))
      Object.defineProperty(d, 'gmodc', {
        get: () => {
          let m = GURPS.ModifierBucket.currentSum()
          GURPS.ModifierBucket.clear()
          return m
        },
      })
    d.gmod = GURPS.ModifierBucket.currentSum()
    return d
  }
}
CONFIG.Dice.rolls[0] = GurpsRoll
/**
 * ModifierBucket is the always-present widget at the bottom of the
 * Foundry UI, that display the current total modifier and a 'trashcan'
 * button to clear all modifiers.
 *
 * This class owns the modifierStack, while the ModifierBucketEditor
 * modifies it.
 */
export class ModifierBucket extends Application {
  static initSettings() {
    game.settings.registerMenu(settings.SYSTEM_NAME, settings.SETTING_BUCKET_SELECT_JOURNALS, {
      name: i18n('GURPS.modifierSelectJournals', 'Bucket: Journal Entries'),
      hint: i18n('GURPS.modifierSelectJournalsHint', 'Select the Journals to Display in the Modifier Bucket.'),
      label: i18n('GURPS.modifierSelectJournalButton', 'Select Bucket Journals'),
      type: ModifierBucketJournals,
      restricted: false,
    })

    game.settings.register(settings.SYSTEM_NAME, settings.SETTING_BUCKET_JOURNALS, {
      name: i18n('GURPS.modifierJournals', 'Modifier Bucket Journal List'),
      scope: 'client',
      config: false,
      type: Object,
      default: {},
      onChange: value => console.log(`Updated Modifier Bucket Journals: ${JSON.stringify(value)}`),
    })
  }

  constructor(options = {}) {
    super(options)

    this.isTooltip = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFIER_TOOLTIP)

    this.editor = new ModifierBucketEditor(this, {
      popOut: !this.isTooltip,
      left: this.isTooltip ? 390 : 400,
      top: this.isTooltip ? 400 : 260,
      resizeable: true,
    })

    // whether the ModifierBucketEditor is visible
    this.SHOWING = false

    this._tempRangeMod = null

    this.modifierStack = {
      modifierList: [], // { "mod": +/-N, "desc": "" }
      currentSum: 0,
      displaySum: '+0',
      plus: false,
      minus: false,
    }
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      popOut: false,
      minimizable: false,
      resizable: false,
      id: 'ModifierBucket',
      template: 'systems/gurps/templates/modifier-bucket.html',
    })
  }

  getData(options) {
    const data = super.getData(options)
    data.stack = this.modifierStack
    data.cssClass = 'modifierbucket'
    let ca = ''
    if (game.user?.isGM && !!GURPS.LastActor) {
      ca = GURPS.LastActor.displayname
      if (ca.length > 25) ca = ca.substring(0, 22) + '...'
    }
    data.currentActor = ca
    return data
  }

  setTempRangeMod(mod) {
    this._tempRangeMod = mod
  }

  addTempRangeMod() {
    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_TO_BUCKET)) {
      // Only allow 1 measured range, for the moment.
      let d = 'for range'
      this.modifierStack.modifierList = this.modifierStack.modifierList.filter(m => m.desc != d)
      if (this._tempRangeMod == 0) {
        this.sum()
        this.updateBucket()
      } else {
        this.addModifier(this._tempRangeMod, d)
      }
    }
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('#trash').click(this._onClickTrash.bind(this))

    let e = html.find('#globalmodifier')
    e.click(this._onClick.bind(this))
    e.contextmenu(this.onRightClick.bind(this))

    if (this.isTooltip) {
      e.mouseenter(ev => this._onenter(ev))
    }
  }

  _onenter(ev) {
    this.SHOWING = true
    // The location of bucket is hardcoded in the css #modifierbucket, so I'm ok with hardcoding it here.
    let position = {
      left: 805 + 70 / 2 - this.editor.position.width / 2,
      top: window.innerHeight - this.editor.position.height - 4,
    }
    this.editor._position = position
    this.editor.render(true)
  }

  async _onClickTrash(event) {
    event.preventDefault()
    this.clear()
  }

  async _onClick(event) {
    event.preventDefault()
    if (event.shiftKey) {
      // If not the GM, just broadcast our mods to the chat
      if (!game.user.isGM) {
        let messageData = {
          content: this.chatString(this.modifierStack),
          type: CONST.CHAT_MESSAGE_TYPES.OOC,
        }
        CONFIG.ChatMessage.entityClass.create(messageData, {})
      } else this.showOthers()
    } else this._onenter(event)
  }

  async showOthers() {
    let users = game.users.filter(u => u._id != game.user._id)
    let content = ''
    let d = ''
    for (let user of users) {
      content += d
      d = '<hr>'
      let stack = await user.getFlag('gurps', 'modifierstack')
      if (!!stack) content += this.chatString(stack, user.name + ', ')
      else content += user.name + ', No modifiers'
    }
    let chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      content: content,
      whisper: [game.user._id],
    }
    CONFIG.ChatMessage.entityClass.create(chatData, {})
  }

  // If the GM right clicks on the modifier bucket, it will print the raw text data driving the tooltip
  async onRightClick(event) {
    event.preventDefault()
    if (!game.user.isGM) return
    this.showOthers()
  }

  // Public method. Used by GURPS to create a temporary modifer for an action.
  makeModifier(mod, reason) {
    let m = displayMod(mod)
    return {
      mod: m,
      modint: parseInt(m),
      desc: reason,
      plus: m[0] == '+',
    }
  }

  sum() {
    let stack = this.modifierStack
    stack.currentSum = 0
    for (let m of stack.modifierList) {
      stack.currentSum += m.modint
    }
    stack.displaySum = displayMod(stack.currentSum)
    stack.plus = stack.currentSum > 0 || stack.modifierList.length > 0 // cheating here... it shouldn't be named "plus", but "green"
    stack.minus = stack.currentSum < 0
  }

  currentSum() {
    return this.modifierStack.currentSum
  }

  addModifier(mod, reason) {
    let stack = this.modifierStack
    let oldmod = stack.modifierList.find(m => m.desc == reason)
    if (!!oldmod) {
      let m = oldmod.modint + parseInt(mod)
      oldmod.mod = displayMod(m)
      oldmod.modint = m
    } else {
      stack.modifierList.push(this.makeModifier(mod, reason))
    }
    this.sum()
    this.updateBucket()
  }

  // Called during the dice roll to return a list of modifiers and then clear
  async applyMods(targetmods = []) {
    let stack = this.modifierStack
    let answer = !!targetmods ? targetmods : []
    answer = answer.concat(stack.modifierList)
    await this.clear()
    return answer
  }

  async updateBucket() {
    this.refresh()
    if (this.SHOWING) {
      this.editor.render(true)
    }
    await game.user.setFlag('gurps', 'modifierstack', this.modifierStack)
  }

  // A GM has set this player's modifier bucket.  Get the new data from the user flags and refresh.
  async updateDisplay(changed) {
    this.modifierStack = game.user.getFlag('gurps', 'modifierstack')
    this.sum()
    if (this.SHOWING) {
      this.editor.render(true)
    }
    this.refresh()
  }

  chatString(modst, name = '') {
    let content = name + 'No modifiers'
    if (modst.modifierList.length > 0) {
      content = name + 'total: ' + modst.displaySum
      for (let m of modst.modifierList) {
        content += '<br> &nbsp;' + m.mod + ' : ' + m.desc
      }
    }
    return content
  }

  async clear() {
    await game.user.setFlag('gurps', 'modifierstack', null)
    this.modifierStack = {
      modifierList: [], // { "mod": +/-N, "desc": "" }
      currentSum: 0,
      displaySum: '+0',
    }
    this.updateBucket()
  }

  refresh() {
    this.render(true)
  }

  async sendToPlayer(action, user) {
    const saved = this.modifierStack.modifierList
    this.modifierStack.modifierList = []
    await GURPS.performAction(action)
    await this.sendBucketToPlayer(user)
    this.modifierStack.modifierList = saved
    this.sum()
    this.updateBucket()
  }

  async sendBucketToPlayer(name) {
    if (!name) {
      await this.sendBucket()
    } else {
      let users = game.users.players.filter(u => u.name == name) || []
      if (users.length > 0) await this.sendBucket(users[0])
      else ui.notifications.warn("No player named '" + name + "'")
    }
  }

  async sendBucket(user) {
    let set = !!user ? [user] : game.users?.filter(u => u._id != game.user._id) || []
    let d = Date.now()
    {
      for (const u of set) {
        await u.setFlag('gurps', 'modifierstack', game.GURPS.ModifierBucket.modifierStack)
      }
      for (const u of set) {
        await u.setFlag('gurps', 'modifierchanged', d)
      }
    }
  }
}
