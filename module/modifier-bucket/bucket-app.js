import { displayMod, i18n } from '../../lib/utilities.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import ModifierBucketEditor from './tooltip-window.js'
import ModifierBucketJournals from './select-journals.js'
import { parselink } from '../../lib/parselink.js'

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
          return parseInt(m)
        },
      })
    d.gmod = GURPS.ModifierBucket.currentSum()
    return d
  }
}
CONFIG.Dice.rolls[0] = GurpsRoll

class ModifierStack {
  constructor() {
    this.modifierList = []
    this.currentSum = 0
    this.displaySum = '+0'
    this.plus = false
    this.minus = false
  }

  sum() {
    this.currentSum = 0
    for (let m of this.modifierList) {
      this.currentSum += m.modint
    }
    this.displaySum = displayMod(this.currentSum)
    this.plus = this.currentSum > 0 || this.modifierList.length > 0 // cheating here... it shouldn't be named "plus", but "green"
    this.minus = this.currentSum < 0
    game.user.setFlag('gurps', 'modifierstack', this) // Set the shared flags, so the GM can look at it sometime later.   Not used in the local calculations
  }

  _makeModifier(mod, reason) {
    let n = displayMod(mod)
    return {
      mod: n,
      modint: parseInt(n),
      desc: reason,
      plus: n[0] != '-',
    }
  }

  add(mod, reason, replace = false) {
    this._add(this.modifierList, mod, reason, replace)
    this.sum()
  }

  _add(list, mod, reason, replace = false) {
    var oldmod
    let i = list.findIndex(e => e.desc == reason)
    if (i > -1) {
      if (replace) list.splice(i, 1)
      // Must modify list (cannot use filter())
      else oldmod = list[i]
    }
    if (!!oldmod) {
      let m = oldmod.modint + parseInt(mod)
      oldmod.mod = displayMod(m)
      oldmod.modint = m
    } else {
      list.push(this._makeModifier(mod, reason))
    }
  }

  // Called during the dice roll to return a list of modifiers and then clear
  applyMods(targetmods = []) {
    let answer = !!targetmods ? targetmods : []
    answer = answer.concat(this.modifierList)
    this.reset()
    return answer
  }

  reset(otherstacklist = []) {
    this.modifierList = otherstacklist
    this.sum()
  }

  removeIndex(index) {
    this.modifierList.splice(index, 1)
    this.sum()
  }
}

/**
 * ModifierBucket is the always-present widget at the bottom of the
 * Foundry UI, that display the current total modifier and a 'trashcan'
 * button to clear all modifiers.
 *
 * This class owns the modifierStack, while the ModifierBucketEditor
 * modifies it.
 */
export class ModifierBucket extends Application {
  constructor(options = {}) {
    super(options)

    this.isTooltip = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFIER_TOOLTIP)

    this.editor = new ModifierBucketEditor(this, {
      popOut: !this.isTooltip,
      left: this.isTooltip ? 390 : 400,
      resizeable: true,
    })

    // whether the ModifierBucketEditor is visible
    this.SHOWING = false

    this._tempRangeMod = null

    this.modifierStack = new ModifierStack()
  }

  // Start GLOBALLY ACCESSED METHODS (used to update the contents of the MB)
  // Called from Range Ruler to hold the current range mod
  setTempRangeMod(mod) {
    this._tempRangeMod = mod
  }

  // Called from Range Ruler after measurement ends, to possible add range to stack
  addTempRangeMod() {
    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_TO_BUCKET)) {
      this.modifierStack.add(this._tempRangeMod, 'for range', true) // Only allow 1 measured range, for the moment.
      this.refresh()
    }
  }

  // Called by GURPS for various reasons.    This is the primary way to add new modifiers to the public bucket (or to a temporary list)
  addModifier(mod, reason, list) {
    if (!!list) this.modifierStack._add(list, mod, reason)
    else this.modifierStack.add(mod, reason)
    this.refresh()
  }

  currentSum() {
    return this.modifierStack.currentSum
  }

  // Called during the dice roll to return a list of modifiers and then clear
  applyMods(targetmods = []) {
    let answer = this.modifierStack.applyMods(targetmods)
    this.refresh()
    return answer
  }

  // A GM has set this player's modifier bucket.  Get the new data from the socket and refresh.
  updateModifierBucket(changed) {
    this.modifierStack.reset(changed.modifierList)
    this.refresh()
  }

  clear() {
    this.modifierStack.reset()
    this.refresh()
  }

  // Called by the chat command /sendmb
  sendToPlayers(action, usernames) {
    const saved = this.modifierStack.modifierList
    if (!!action) {
      this.modifierStack.modifierList = []
      GURPS.performAction(action)
    }
    let users = game.users.players
    if (usernames.length > 0) users = game.users.players.filter(u => usernames.includes(u.name))
    this._sendBucket(users)
    this.modifierStack.reset(saved)
  }

  sendBucketToPlayer(id) {
    if (!id) {
      // Only occurs if the GM clicks on 'everyone'
      this._sendBucket(game.users.filter(u => u.id != game.user.id))
    } else {
      let users = game.users.filter(u => u.id == id) || []
      if (users.length > 0) this._sendBucket(users)
      else ui.notifications.warn("No player with ID '" + id + "'")
    }
  }

  // End GLOBALLY ACCESSED METHODS
  _sendBucket(users) {
    if (users.length == 0) {
      ui.notifications.warn('No users to send to.')
      return
    }
    let mb = GURPS.ModifierBucket.modifierStack
    if (game.user.hasRole('GAMEMASTER'))
      // Only actual GMs can update other user's flags
      users.forEach(u => u.setFlag('gurps', 'modifierstack', mb)) // Only used by /showmbs.   Not used by local users.
    game.socket.emit('system.gurps', {
      type: 'updatebucket',
      users: users.map(u => u.id),
      bucket: GURPS.ModifierBucket.modifierStack,
    })
  }

  // BELOW are the methods for the MB user interface
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      popOut: false,
      minimizable: false,
      resizable: false,
      id: 'ModifierBucket',
      template: 'systems/gurps/templates/modifier-bucket/bucket-app.html',
    })
  }

  getData(options) {
    const data = super.getData(options)
    data.stack = this.modifierStack
    data.cssClass = 'modifierbucket'
    let ca = ''
    if (!!GURPS.LastActor) {
      ca = GURPS.LastActor.displayname
      if (ca.length > 25) ca = ca.substring(0, 22) + '...'
    }
    data.currentActor = ca
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    html.find('#trash').click(this._onClickTrash.bind(this))

    let e = html.find('#globalmodifier')
    e.click(this._onClick.bind(this))
    e.contextmenu(this.onRightClick.bind(this))
    e.each((_, li) => {
      li.addEventListener('dragstart', ev => {
        let bucket = GURPS.ModifierBucket.modifierStack.modifierList.map(m => `${m.mod} ${m.desc}`).join(' & ')
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            name: 'Modifier Bucket',
            bucket: bucket,
          })
        )
      })
    })

    if (this.isTooltip) {
      e.mouseenter(ev => this._onenter(ev))
    }
    
    html.on("drop", function(event) {
      event.preventDefault();  
      event.stopPropagation();
      let dragData = JSON.parse(event.originalEvent?.dataTransfer?.getData('text/plain'))
      if (!!dragData && !!dragData.otf) {
        let action = parselink(dragData.otf)
        action.action.blindroll = true
        if (action.action.type == "modifier" || !!dragData.actor)
          GURPS.performAction(action.action, game.actors.get(dragData.actor))
      }
    });

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
        ChatMessage.create(messageData, {})
      } else this.showOthers()
    } else this._onenter(event)
  }

  async showOthers() {
    let users = game.users.filter(u => u.id != game.user.id)
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
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      content: content,
      whisper: [game.user.id],
    }
    ChatMessage.create(chatData)
  }

  // If the GM right clicks on the modifier bucket, it will print the raw text data driving the tooltip
  async onRightClick(event) {
    event.preventDefault()
    if (!game.user.isGM) return
    this.showOthers()
  }

  refresh() {
    this.render(true)
    if (this.SHOWING) {
      this.editor.render(true)
    }
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
}
