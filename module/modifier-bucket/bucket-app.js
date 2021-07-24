import { displayMod, generateUniqueId, i18n } from '../../lib/utilities.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import ModifierBucketEditor from './tooltip-window.js'
import { parselink } from '../../lib/parselink.js'
import ResolveDiceRoll from '../modifier-bucket/resolve-diceroll-app.js'
// import { ChatMessageData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs'

/**
 * Define some Typescript types.
 * @typedef {{_loaded: Array<Number>, baseExpression: Function, id: String}} GurpsDie
 * @typedef {{mod: String, modint: Number, desc: String, plus: Boolean}} Modifier
 */

Hooks.once('init', async function () {
  Hooks.on('closeModifierBucketEditor', (/** @type {any} */ _, /** @type {JQuery} */ element) => {
    $(element).hide() // To make this application appear to close faster, we will hide it before the animation
  })

  // @ts-ignore -- Need to look into why a GurpsRoll isn't a Roll
  CONFIG.Dice.rolls[0] = GurpsRoll

  // Patch DiceTerm.fromMatch to hi-jack the returned Die instances and in turn patch thme to
  // include the properties we need to support Physical Dice
  if (!!DiceTerm.fromMatch) {
    let _fromMatch = DiceTerm.fromMatch
    let newFromMatch = function (match) {
      let result = _fromMatch(match)
      if (result instanceof Die) {
        // do the JSDoc gymnastics to allow casting
        let gurpsDie = /** @type {Die & GurpsDie}  */ (/** @type {unknown}*/ (result))

        gurpsDie.id = generateUniqueId()
        gurpsDie.baseExpression = _baseExpression.bind(result)
        gurpsDie.roll = _roll.bind(result, result.roll.bind(result))
      }
      return result
    }

    DiceTerm.fromMatch = newFromMatch
  }
})

class GurpsDie extends Die {}

/**
 * @this {Die} - It's really a Die
 */
function _baseExpression() {
  const x = Die.DENOMINATION === 'd' ? this.faces : Die.DENOMINATION
  return `${this.number}d${x}`
}

/**
 * @this {Die & GurpsDie}
 * @param {Function} originalRoll
 * @param {*} param1
 */
function _roll(originalRoll, { minimize = false, maximize = false } = {}) {
  let loaded = this._loaded

  if (!loaded || !loaded.length) return originalRoll({ minimize, maximize })

  let baseExpression = this.baseExpression()
  if (CONFIG.debug.dice) console.log(`Loaded Die [${baseExpression}] -- values: ${loaded}`)

  /** @type {DiceTerm.Result} */
  const roll = { active: true, result: loaded.pop() || 0 }
  this.results.push(roll)
}

/**
 * Install Custom Roll to support global modifier access (@gmod & @gmodc) and
 * custom die-rolling behaviors, like the "Phyical Dice" feature.
 *
 * Code can check for the GurpsRoll#isLoaded flag to know that the user entered
 * his dice roll values via the physical dice feature.
 */
export class GurpsRoll extends Roll {
  static dieOverride = false

  /**
   * @param {String} formula
   * @param {*} data
   * @param {*} options
   */
  constructor(formula, data = {}, options = {}) {
    super(formula, data, options)

    this.isLoaded = false
  }

  /**
   * @inheritdoc
   * @param {*} data
   * @returns {*}
   */
  _prepareData(data) {
    let d = super._prepareData(data)
    if (!d.hasOwnProperty('gmodc'))
      Object.defineProperty(d, 'gmodc', {
        get: () => {
          let m = _GURPS().ModifierBucket.currentSum()
          _GURPS().ModifierBucket.clear()
          return parseInt(m)
        },
      })
    d.gmod = _GURPS().ModifierBucket.currentSum()
    return d
  }

  /**
   * @param {Partial<RollTerm.EvaluationOptions & { async: false; }> | undefined} options
   */
  // @ts-ignore
  evaluate(options) {
    if (CONFIG.debug.dice) console.log('override RollTerm.evaluate()!!')

    let diceTerms = this.terms.filter(term => term instanceof Die)
    let physicalDice =
      _game().user?.isTrusted && _game().settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PHYSICAL_DICE)

    // We can only do this if called asynchronously
    // @ts-ignore
    let noLoaded = this.options?.noLoaded
    if (options?.async && physicalDice && diceTerms.length > 0 && !noLoaded) {
      return this._promptForDiceResultsAndEvaluate(options, diceTerms)
    } else {
      return super.evaluate(options)
    }
  }

  /**
   * @param {*} options as for Roll#evaluate
   * @param {RollTerm[]} diceTerms
   */
  async _promptForDiceResultsAndEvaluate(options, diceTerms) {
    return new Promise(async (resolve, reject) => {
      let dialog = new ResolveDiceRoll(diceTerms)

      let callback = async (/** @type {boolean} */ isLoaded) => {
        this.isLoaded = isLoaded
        let roll = super.evaluate(options)
        await dialog.close()
        resolve(roll)
      }

      dialog.applyCallback = callback
      dialog.rollCallback = callback
      dialog.render(true)
    })
  }
}

// Maybe a final, complete fix for Physical Dice?
// CONFIG.Dice.termTypes.DiceTerm = GurpsDiceTerm
// GurpsDiceTerm.fromMatch() -- add needed Die enhancements

class ModifierStack {
  constructor() {
    /** @type {Array<Modifier>} */
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
    _game().user?.setFlag('gurps', 'modifierstack', this) // Set the shared flags, so the GM can look at it sometime later. Not used in the local calculations
  }

  /**
   * @param {string} mod
   * @param {any} reason
   * @returns {Modifier}
   */
  _makeModifier(mod, reason) {
    let n = displayMod(mod)
    return {
      mod: n,
      modint: parseInt(n),
      desc: reason,
      plus: n[0] != '-',
    }
  }

  /**
   * @param {string} reason
   * @param {string} mod
   */
  add(mod, reason, replace = false) {
    this._add(this.modifierList, mod, reason, replace)
    this.sum()
  }

  /**
   * @param {Modifier[]} list
   * @param {string} mod
   * @param {string} reason
   */
  _add(list, mod, reason, replace = false) {
    /** @type {Modifier|undefined} */
    var oldmod
    let i = list.findIndex(e => e.desc == reason)
    if (i > -1) {
      if (replace) list.splice(i, 1)
      else oldmod = list[i] // Must modify list (cannot use filter())
    }

    if (!!oldmod) {
      let m = oldmod.modint + parseInt(mod)
      oldmod.mod = displayMod(m)
      oldmod.modint = m
    } else {
      list.push(this._makeModifier(mod, reason))
    }
  }

  /**
   * Called during the dice roll to return a list of modifiers and then clear
   * @param {Modifier[]} targetmods
   * @returns {Modifier[]}
   */
  applyMods(targetmods = []) {
    let answer = !!targetmods ? targetmods : []
    answer = answer.concat(this.modifierList)
    this.reset()
    return answer
  }

  /**
   * @param {Modifier[]} otherstacklist
   */
  reset(otherstacklist = []) {
    this.modifierList = otherstacklist
    this.sum()
  }

  /**
   * @param {number} index
   */
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

    this.isTooltip = _game().settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFIER_TOOLTIP)

    this.editor = new ModifierBucketEditor(this, {
      popOut: !this.isTooltip,
      left: this.isTooltip ? 390 : 400,
      resizeable: true,
    })

    // whether the ModifierBucketEditor is visible
    this.SHOWING = false

    /** @type {string|null} */
    this._tempRangeMod = null

    this.modifierStack = new ModifierStack()
  }

  // Start GLOBALLY ACCESSED METHODS (used to update the contents of the MB)

  /**
   * Called from Range Ruler to hold the current range mod
   * @param {string} mod
   */
  setTempRangeMod(mod) {
    this._tempRangeMod = mod
  }

  // Called from Range Ruler after measurement ends, to possible add range to stack
  addTempRangeMod() {
    if (_game().settings.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_TO_BUCKET)) {
      if (!!this._tempRangeMod) this.modifierStack.add(this._tempRangeMod, 'for range', true) // Only allow 1 measured range, for the moment.
      this.refresh()
    }
  }

  // Called by GURPS for various reasons.    This is the primary way to add new modifiers to the public bucket (or to a temporary list)
  /**
   * @param {string} reason
   * @param {Modifier[] | undefined} [list]
   * @param {string | number} mod
   */
  addModifier(mod, reason, list) {
    if (!!list) this.modifierStack._add(list, mod.toString(), reason)
    else this.modifierStack.add(mod.toString(), reason)
    this.refresh()
  }

  currentSum() {
    return this.modifierStack.currentSum
  }

  /**
   * Called during the dice roll to return a list of modifiers and then clear.
   * @param {Modifier[]} targetmods
   * @returns {Modifier[]}
   */
  applyMods(targetmods = []) {
    let answer = this.modifierStack.applyMods(targetmods)
    this.refresh()
    return answer
  }

  /**
   * A GM has set this player's modifier bucket.  Get the new data from the socket and refresh.
   * @param {{ modifierList: Modifier[] | undefined; }} changed
   */
  updateModifierBucket(changed) {
    this.modifierStack.reset(changed.modifierList)
    this.refresh()
  }

  clear() {
    this.modifierStack.reset()
    this.refresh()
  }

  /**
   *  Called by the chat command /sendmb
   * @param {any} action
   * @param {string[]} usernames
   */
  sendToPlayers(action, usernames) {
    const saved = this.modifierStack.modifierList
    if (!!action) {
      this.modifierStack.modifierList = []
      _GURPS().performAction(action)
    }
    let _users = _game().users
    if (_users) {
      let players = _users.players
      if (usernames.length > 0) players = players.filter(u => u.name && usernames.includes(u.name))
      if (!!players) this._sendBucket(players)
      this.modifierStack.reset(saved)
    }
  }

  /**
   * @param {string | null} id
   */
  sendBucketToPlayer(id) {
    if (!id) {
      // Only occurs if the GM clicks on 'everyone'
      let _users = _game().users
      if (!!_users) {
        let everyone = _users.filter(u => u.id != _game().user?.id)
        if (!!everyone) this._sendBucket(everyone)
      }
    } else {
      let users = _game().users?.filter(u => u.id == id) || []
      if (users.length > 0) this._sendBucket(users)
      else _ui().notifications?.warn("No player with ID '" + id + "'")
    }
  }

  // End GLOBALLY ACCESSED METHODS

  /**
   * @param {Array<User>} users
   */
  _sendBucket(users) {
    if (users.length == 0) {
      _ui().notifications?.warn('No users to send to.')
      return
    }
    let mb = _GURPS().ModifierBucket.modifierStack
    if (_game().user?.hasRole('GAMEMASTER'))
      // Only actual GMs can update other user's flags
      users.forEach(u => u.setFlag('gurps', 'modifierstack', mb)) // Only used by /showmbs.   Not used by local users.
    _game().socket?.emit('system.gurps', {
      type: 'updatebucket',
      users: users.map(u => u.id),
      bucket: _GURPS().ModifierBucket.modifierStack,
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

  /**
   * @typedef {Application.RenderOptions & {stack: ModifierStack, cssClass: string, currentActor: string}} ModifierBucket.Data
   * @param {Application.RenderOptions | undefined} [options]
   */
  getData(options) {
    const data = /** @type {ModifierBucket.Data} */ (/** @type {unknown} */ (super.getData(options)))
    data.stack = this.modifierStack
    data.cssClass = 'modifierbucket'

    let ca = ''
    if (!!_GURPS().LastActor) {
      ca = _GURPS().LastActor.displayname
      if (ca.length > 25) ca = ca.substring(0, 22) + '…'
    }
    data.currentActor = ca
    return data
  }

  /**
   * @param {JQuery<HTMLElement>} html
   */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('#trash').on('click', this._onClickTrash.bind(this))

    let e = html.find('#globalmodifier')

    e.on('click', this._onClick.bind(this))

    // @ts-ignore -- apparently 'contextmenu' isn't a thing
    e.on('contextmenu', this.onRightClick.bind(this))

    e.each((_, li) => {
      li.addEventListener('dragstart', ev => {
        let bucket = _ModifierBucket()
          .modifierStack.modifierList.map(m => `${m.mod} ${m.desc}`)
          .join(' & ')
        return ev.dataTransfer?.setData(
          'text/plain',
          JSON.stringify({
            name: 'Modifier Bucket',
            bucket: bucket,
          })
        )
      })
    })

    if (this.isTooltip) e.on('mouseenter', ev => this._onenter(ev))

    html.on('drop', function (/** @type {JQuery.DropEvent} */ event) {
      event.preventDefault()
      event.stopPropagation()
      let dragData = JSON.parse(event.originalEvent?.dataTransfer?.getData('text/plain') || '')
      if (!!dragData && !!dragData.otf) {
        let action = parselink(dragData.otf)
        action.action.blindroll = true
        if (action.action.type == 'modifier' || !!dragData.actor)
          _GURPS().performAction(action.action, _game().actors?.get(dragData.actor))
      }
    })

    html.on('wheel', (/** @type {JQuery.TriggeredEvent} */ event) => {
      event.preventDefault()
      let originalEvent = event.originalEvent
      if (originalEvent instanceof WheelEvent) {
        let s = originalEvent.deltaY / -100
        this.addModifier(s, '')
      }
    })
  }

  /**
   * @param {JQuery.MouseEnterEvent} ev
   */
  _onenter(ev) {
    this.SHOWING = true
    // The location of bucket is hardcoded in the css #modifierbucket, so I'm ok with hardcoding it here.
    let position = {
      // @ts-ignore
      left: 805 + 70 / 2 - this.editor.position.width / 2,
      // @ts-ignore
      top: window.innerHeight - this.editor.position.height - 4,
    }
    // @ts-ignore
    this.editor._position = position
    this.editor.render(true)
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onClickTrash(event) {
    event.preventDefault()
    this.clear()
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onClick(event) {
    event.preventDefault()
    if (event.shiftKey) {
      // If not the GM, just broadcast our mods to the chat
      if (!_game().user?.isGM) {
        let messageData = {
          content: this.chatString(this.modifierStack),
          type: CONST.CHAT_MESSAGE_TYPES.OOC,
        }
        ChatMessage.create(messageData, {})
      } else this.showOthers()
    } // TODO else this._onenter(event) -- remove this if nothing breaks
  }

  async showOthers() {
    let users = _game().users?.filter(u => u.id != _game().user?.id)
    let content = ''
    let d = ''
    for (let user of users || []) {
      content += d
      d = '<hr>'
      let stack = await user.getFlag('gurps', 'modifierstack')
      if (!!stack && stack instanceof ModifierStack) content += this.chatString(stack, user.name + ', ')
      else content += user.name + ', No modifiers'
    }

    let chatData = {}
    chatData.user = _game().user?.id || null
    chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
    chatData.content = content
    chatData.whisper = [_game().user?.id || '']

    ChatMessage.create(chatData)
  }

  // If the GM right clicks on the modifier bucket, it will print the raw text data driving the tooltip
  /**
   * @param {JQuery.ClickEvent} event
   */
  async onRightClick(event) {
    event.preventDefault()
    if (!_game().user?.isGM) return
    this.showOthers()
  }

  refresh() {
    this.render(true)
    if (this.SHOWING) {
      this.editor.render(true)
    }
  }

  /**
   * @param {ModifierStack} modst
   */
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

// -- Functions to get type-safe global references (for TS) --

function _GURPS() {
  // @ts-ignore
  return GURPS
}

function _game() {
  if (game instanceof Game) return game
  throw new Error('game is not initialized yet!')
}

function _ui() {
  if (!!ui) return ui
  throw new Error('ui is not initialized yet!')
}

/**
 * @returns {ModifierBucket}
 */
function _ModifierBucket() {
  return /** type {ModifierBucket} */ _GURPS().ModifierBucket
}
