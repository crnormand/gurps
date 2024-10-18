import { i18n, displayMod, generateUniqueId } from '../../lib/utilities.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import ModifierBucketEditor from './tooltip-window.js'
import { parselink } from '../../lib/parselink.js'
import ResolveDiceRoll from '../modifier-bucket/resolve-diceroll-app.js'

/**
 * Define some Typescript types.
 * @typedef {{mod: String, modint: Number, desc: String, plus: Boolean}} Modifier
 */
Hooks.once('init', async function () {
  Hooks.on('closeModifierBucketEditor', (/** @type {any} */ _, /** @type {JQuery} */ element) => {
    $(element).hide() // To make this application appear to close faster, we will hide it before the animation
  })

  CONFIG.Dice.rolls.push(CONFIG.Dice.rolls[0]) // save a copy of Foundry's default roll
  CONFIG.Dice.rolls[0] = GurpsRoll // replace it with our custom roll
  CONFIG.Dice.terms['d'] = GurpsDie // Hack to get Dice so nice working (it checks the terms["d"].name vs the Dice class name
})

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
  }

  /**
   * The Roll is "loaded" if any term has the _loaded property.
   */
  get isLoaded() {
    return this.terms.some(term => term instanceof GurpsDie && !!term._loaded)
  }

  /**
   * @inheritdoc
   * @param {*} data
   * @returns {*}
   */
  _prepareData(data) {
    const _data = super._prepareData(data)

    // Add the gmodc property, that returns the current sum of the modifier bucket and then clears it.
    if (!_data.hasOwnProperty('gmodc'))
      Object.defineProperty(_data, 'gmodc', {
        get() {
          let m = GURPS.ModifierBucket.currentSum()
          GURPS.ModifierBucket.clear()
          return parseInt(m)
        },
      })
    _data.gmod = GURPS.ModifierBucket.currentSum()
    _data.margin = GURPS.lastTargetedRoll?.margin

    return _data
  }
}

export class GurpsDie extends foundry.dice.terms.Die {
  /**
   * @param {Die} die
   */
  constructor(die) {
    super({
      number: die.number,
      faces: die.faces ? die.faces : 6, // GurpsDie (type 'd') defaults to 6 faces
      modifiers: die.modifiers,
      results: die.results,
      options: die.options,
    })

    this.id = generateUniqueId()
    this._loaded = null

    // baseExpression is called from a closure elsewhere so need to bind it
    this.baseExpression = this.baseExpression.bind(this)
    this.evaluate = this.evaluate.bind(this)
  }

  asDiceTerm() {
    if (this instanceof foundry.dice.terms.DiceTerm) return this
    throw new Error('Unexpected: GurpsDie is not a DiceTerm')
  }

  baseExpression() {
    const x = foundry.dice.terms.Die.DENOMINATION === 'd' ? this.faces : foundry.dice.terms.Die.DENOMINATION
    return `${this.number}d${x}`
  }

  roll({ minimize = false, maximize = false } = {}) {
    if (!this._loaded || !this._loaded.length) return super.roll({ minimize, maximize })

    if (CONFIG.debug.dice) console.log(`Loaded Die [${this.baseExpression()}] -- values: ${this._loaded}`)

    // Preserve the order: set value to the first element in _loaded, and update
    // _loaded to contain the remaining elements.
    let [value, ...remainder] = this._loaded
    this._loaded = remainder

    /** @type {DiceTerm.Result} */
    const roll = { active: true, result: value }
    this.results.push(roll)
    return roll
  }

  /**
   * @inheritdoc
   */
  // evaluate({ minimize = false, maximize = false, async = false } = {}) {
  //   if (this._evaluated) {
  //     throw new Error(`The ${this.constructor.name} has already been evaluated and is now immutable`)
  //   }
  //   this._evaluated = true

  //   return async ? this._evaluate({ minimize, maximize }) : this._evaluateSync({ minimize, maximize })
  // }

  /**
   * Evaluate the term.
   * @param {object} [options={}]           Options which modify how the RollTerm is evaluated, see RollTerm#evaluate
   * @param {boolean} [options.minimize=false]    Minimize the result, obtaining the smallest possible value.
   * @param {boolean} [options.maximize=false]    Maximize the result, obtaining the largest possible value.
   * @returns {Promise<RollTerm>}
   */
  async _evaluate({ minimize = false, maximize = false } = {}) {
    let physicalDice = game.user?.isTrusted && game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PHYSICAL_DICE)

    if (physicalDice) {
      return new Promise(async resolve => {
        let dialog = new ResolveDiceRoll(this)

        let callback = async () => {
          let die = this._evaluateSync({ minimize, maximize }).asDiceTerm()
          await dialog.close()
          resolve(die)
        }

        dialog.applyCallback = callback
        dialog.rollCallback = callback
        dialog.render(true)
      })
    } else {
      // @ts-ignore
      return await super._evaluate({ minimize, maximize })
    }
  }
}

class ModifierStack {
  constructor() {
    /** @type {Array<Modifier>} */
    this.modifierList = []

    /** @type {Array<Modifier>} */
    this.savedModifierList = []

    this.currentSum = 0
    this.displaySum = '+0'
    this.plus = false
    this.minus = false

    // do we automatically empty the bucket when a roll is made?
    this.AUTO_EMPTY = true
  }

  toggleAutoEmpty() {
    this.AUTO_EMPTY = !this.AUTO_EMPTY
    return this.AUTO_EMPTY
  }
  savelist() {
    this.savedModifierList = this.modifierList
    this.modifierList = []
    this.sum()
  }

  restorelist() {
    this.modifierList = this.savedModifierList
    this.sum()
  }

  sum() {
    this.currentSum = 0
    for (let m of this.modifierList) {
      this.currentSum += m.modint
    }
    this.displaySum = displayMod(this.currentSum)
    this.plus = this.currentSum > 0 || this.modifierList.length > 0 // cheating here... it shouldn't be named "plus", but "green"
    this.minus = this.currentSum < 0
    game.user?.setFlag('gurps', 'modifierstack', this) // Set the shared flags, so the GM can look at it sometime later. Not used in the local calculations
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
    reason = reason.replace('(' + i18n('GURPS.equipmentUserCreated') + ')', '').trim() // Remove User Created tag
    let i = list.findIndex(e => e.desc == reason && !e.desc.match(/\* *Cost/i)) // Don't double up on *Costs modifiers... so they will pay the full cost
    if (i > -1) {
      if (replace)
        list.splice(i, 1) // only used by range modifier
      else oldmod = list[i] // Must modify list (cannot use filter())
    }
    let m = (mod + '').match(/([+-])?@margin/i)
    if (!!m) {
      mod = (GURPS.lastTargetedRoll?.margin || 0) * (m[1] == '-' ? -1 : 1)
      if (GURPS.lastTargetedRoll?.thing)
        reason = reason.replace(/-@/, ' -').replace(/\+@/, '') + ' for ' + GURPS.lastTargetedRoll.thing
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
    if (this.AUTO_EMPTY) this.reset()
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

    // console.trace('+++++ Create ModifierBucket +++++')

    this.isTooltip = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFIER_TOOLTIP)

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

    // is the Dice section visible?
    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_3D6)) {
      // FIXME do nothing, for now...
    }

    this.accumulatorIndex = 0
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
    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_TO_BUCKET)) {
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

  clear(update = true) {
    this.modifierStack.reset()
    if (update) this.refresh()
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
      GURPS.performAction(action)
    }
    let _users = game.users
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
    if ('SHOWALL' == id) return
    if (!id) {
      // Only occurs if the GM clicks on 'everyone'
      let _users = game.users
      if (!!_users) {
        let everyone = _users.filter(u => u.id != game.user?.id)
        if (!!everyone) this._sendBucket(everyone)
      }
    } else {
      let users = game.users?.filter(u => u.id == id) || []
      if (users.length > 0) this._sendBucket(users)
      else ui.notifications?.warn("No player with ID '" + id + "'")
    }
  }

  // End GLOBALLY ACCESSED METHODS

  /**
   * @param {Array<User>} users
   */
  _sendBucket(users) {
    if (users.length == 0) {
      ui.notifications?.warn('No users to send to.')
      return
    }
    let mb = GURPS.ModifierBucket.modifierStack
    if (game.user?.hasRole('GAMEMASTER'))
      // Only actual GMs can update other user's flags
      users.forEach(u => u.setFlag('gurps', 'modifierstack', mb)) // Only used by /showmbs.   Not used by local users.
    let ctrl = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL)
    game.socket?.emit('system.gurps', {
      type: 'updatebucket',
      users: users.map(u => u.id),
      bucket: GURPS.ModifierBucket.modifierStack,
      add: ctrl,
    })
  }

  // BELOW are the methods for the MB user interface
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
    const position = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_POSITION)
    data.cssContainerClass = `force-${position}`
    data.dice3dImagePath = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_3D6_IMAGE)
    data.diceImagePath = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_D6_IMAGE)

    let ca = null
    if (!!GURPS.LastActor) {
      data.damageAccumulators = GURPS.LastActor.damageAccumulators
      data.accumulatorIndex = this.accumulatorIndex
      ca = GURPS.LastActor.displayname
      if (ca && ca.length > 25) ca = ca.substring(0, 22) + '…'
    }
    data.currentActor = ca
    data.diceVisible = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_3D6)
    return data
  }

  /**
   * @param {JQuery<HTMLElement>} html
   */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('#oned6dice').addClass('invisible')
    html.find('#threed6dice').removeClass('invisible')

    html.find('#trash').on('click', this._onClickTrash.bind(this))
    html.find('#magnet').on('click', this._onClickMagnet.bind(this))

    let e = html.find('#globalmodifier')
    e.on('click', this._onClick.bind(this))
    e.on('contextmenu', this.onRightClick.bind(this))
    e.each((_, li) => {
      li.addEventListener('dragstart', ev => {
        let bucket = GURPS.ModifierBucket.modifierStack.modifierList.map(m => `${m.mod} ${m.desc}`)
        //.join(' & ')
        return ev.dataTransfer?.setData(
          'text/plain',
          JSON.stringify({
            //displayname: 'Modifier Bucket',
            type: 'modifierbucket',
            bucket: bucket,
          })
        )
      })
    })

    if (this.isTooltip) e.on('mouseenter', ev => this._onenter(ev))

    let modifierbucket = html.find('#modifierbucket')
    modifierbucket.on('drop', function (/** @type {JQuery.DropEvent} */ event) {
      event.preventDefault()
      event.stopPropagation()
      let dragData = JSON.parse(event.originalEvent?.dataTransfer?.getData('text/plain') || '')
      if (!!dragData && !!dragData.otf) {
        let link = parselink(dragData.otf)
        if (link.action) {
          link.action.blindroll = true
          if (link.action.type == 'modifier' || !!dragData.actor)
            GURPS.performAction(link.action, game.actors?.get(dragData.actor))
        }
      }
    })

    modifierbucket.on('wheel', (/** @type {JQuery.TriggeredEvent} */ event) => {
      event.preventDefault()
      let originalEvent = event.originalEvent
      if (originalEvent instanceof WheelEvent) {
        let s = Math.round(originalEvent.deltaY / -100)
        this.addModifier(s, '')
      }
    })

    html.find('#threed6').click(this._on3dClick.bind(this))
    html.find('#threed6').contextmenu(this._on3dRightClick.bind(this))
    html.find('#threed6').on('drop', function (event) {
      event.preventDefault()
      event.stopPropagation()
      let dragData = JSON.parse(event.originalEvent?.dataTransfer?.getData('text/plain'))
      if (!!dragData && !!dragData.actor && !!dragData.otf) {
        let action = parselink(dragData.otf)
        action.action.blindroll = true
        GURPS.performAction(action.action, game.actors.get(dragData.actor), {
          shiftKey: game.user.isGM,
          ctrlKey: false,
          data: {},
        })
      }
    })

    html.find('.accumulator-control').on('click', this._onAccumulatorClick.bind(this, html))
  }

  _onAccumulatorClick(hmtl, event) {
    event.preventDefault()
    const a = event.currentTarget
    const value = a.value ?? null
    const action = a.dataset.action ?? null

    switch (action) {
      case 'inc':
        GURPS.LastActor.incrementDamageAccumulator(this.accumulatorIndex)
        break
      case 'dec':
        GURPS.LastActor.decrementDamageAccumulator(this.accumulatorIndex)
        break
      case 'cancel':
        GURPS.LastActor.clearDamageAccumulator(this.accumulatorIndex)
        break
      case 'apply':
        GURPS.LastActor.applyDamageAccumulator(this.accumulatorIndex)
        break
      default:
        break
    }
    this.render()
  }

  showOneD6() {
    // handle Ctrl key event by setting the correct image to be visible in the Dice roller widget
    this._element.find('#oned6dice').removeClass('invisible')
    this._element.find('#threed6dice').addClass('invisible')
    // this.render()
  }

  showThreeD6() {
    this._element.find('#oned6dice').addClass('invisible')
    this._element.find('#threed6dice').removeClass('invisible')
    this.render()
  }

  async _on3dClick(event) {
    event.preventDefault()
    let action = {
      type: 'roll',
      formula: '3d6',
      desc: '',
    }
    GURPS.performAction(action, GURPS.LastActor || game.user, event)
  }

  async _on3dRightClick(event) {
    event.preventDefault()
    let action = {
      type: 'roll',
      formula: '1d6',
      desc: '',
    }
    GURPS.performAction(action, GURPS.LastActor || game.user, event)
  }

  /**
   * @param {JQuery.MouseEnterEvent} ev
   */
  _onenter(ev) {
    this.SHOWING = true
    // The location of bucket is hardcoded in the css #modifierbucket, so I'm ok with hardcoding it here.
    // let position = {
    //   // @ts-ignore
    //   left: 805 + 70 / 2 - this.editor.position.width / 2,
    //   // @ts-ignore
    //   top: window.innerHeight - this.editor.position.height - 4,
    // }
    // @ts-ignore
    // this.editor._position = position
    this.editor.render(true)
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onClickTrash(event) {
    event.preventDefault()
    this.clear()
  }

  async _onClickMagnet(event) {
    event.preventDefault()
    if (this.modifierStack.toggleAutoEmpty()) {
      $(event.currentTarget).removeClass('enabled')
    } else {
      $(event.currentTarget).addClass('enabled')
    }
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  async _onClick(event) {
    event.preventDefault()
    if (event.shiftKey) {
      // If not the GM, just broadcast our mods to the chat
      if (!game.user?.isGM) {
        let messageData = {
          content: this.chatString(this.modifierStack),
          type: CONST.CHAT_MESSAGE_STYLES.OOC,
        }
        ChatMessage.create(messageData, {})
      } else this.showOthers()
    } else if (!this.isTooltip) {
      this._onenter()
    }
  }

  async showOthers() {
    let users = game.users?.filter(u => u.id != game.user?.id)
    let content = ''
    let d = ''
    for (let user of users || []) {
      content += d
      d = '<hr>'
      let stack = await user.getFlag('gurps', 'modifierstack')
      if (!!stack && !!stack.modifierList) content += this.chatString(stack, user.name + ', ')
      else content += user.name + ', No modifiers'
    }

    let chatData = {}
    chatData.user = game.user?.id || null
    chatData.content = content
    chatData.whisper = [game.user?.id || '']

    ChatMessage.create(chatData)
  }

  // If the GM right clicks on the modifier bucket, it will print the raw text data driving the tooltip
  /**
   * @param {JQuery.ClickEvent} event
   */
  async onRightClick(event) {
    event.preventDefault()
    if (!game.user?.isGM) return
    this.showOthers()
  }

  refresh() {
    // setTimeout(() => this.render(true), 100) // Not certain why the UI element isn't updating immediately, so hacked this
    this.render()
    if (this.SHOWING) {
      this.editor.render()
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

  _injectHTML(html) {
    if ($('body').find('#bucket-app').length === 0) {
      html.insertAfter($('body').find('#hotbar'))
      this._element = html
    } else console.warn('=== HOLA ===\n That weird Modifier Bucket problem just happened! \n============')
  }
}
