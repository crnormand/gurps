import { displayMod, horiz, localizeWithFallback } from '../lib/utilities.js'
import { parselink } from '../lib/parselink.js'
import * as Settings from '../lib/miscellaneous-settings.js'
import * as HitLocations from '../module/hitlocation/hitlocation.js'

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
  static initializeSettings() {}

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

/**
 * The ModifierBucketEditor displays the popup (tooltip) window where modifiers can be applied
 * to the current or other actors.
 */
export class ModifierBucketEditor extends Application {
  constructor(bucket, options = {}) {
    super(options)

    this.bucket = bucket // reference to class ModifierBucket, which is the 'button' that opens this window
    this.inside = false
    this.tabIndex = 0

    // TODO in the real implementation, store the ID of the journal
    let journals = game.data.journal
    let j1 = journals.find(it => it.name === 'Thiefly Skills')

    this.journals = []
    this.journals.push(j1)

    // stupid Javascript
    this._onleave.bind(this)
    this._onenter.bind(this)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'ModifierBucketEditor',
      template: 'systems/gurps/templates/modifier-bucket-tooltip.html',
      width: 872,
      height: 722,
      resizeable: true,
      minimizable: false,
      popOut: false,
    })
  }

  render(force, options = {}) {
    super.render(force, options)
    this.bucket.SHOWING = true
  }

  close() {
    this.bucket.SHOWING = false
    super.close()
  }

  getData(options) {
    const data = super.getData(options)

    data.isTooltip = !this.options.popOut
    data.gmod = this
    data.tabIndex = this.tabIndex
    data.journals = this.journals
    data.stack = this.bucket.modifierStack
    data.meleemods = ModifierLiterals.MeleeMods.split('\n')
    data.rangedmods = ModifierLiterals.RangedMods.split('\n')
    data.defensemods = ModifierLiterals.DefenseMods.split('\n')
    data.speedrangemods = ['Speed / Range'].concat(game.GURPS.rangeObject.modifiers)
    data.actorname = !!game.GURPS.LastActor ? game.GURPS.LastActor.name : 'No active character!'
    data.othermods1 = ModifierLiterals.OtherMods1.split('\n')
    data.othermods2 = ModifierLiterals.OtherMods2.split('\n')
    data.cansend = game.user?.isGM || game.user?.isRole('TRUSTED') || game.user?.isRole('ASSISTANT')
    data.users = game.users?.filter(u => u._id != game.user._id) || []
    data.everyone = data.users.length > 1 ? { name: 'Everyone!' } : null
    data.taskdificulties = ModifierLiterals.TaskDifficultyModifiers
    data.lightingmods = ModifierLiterals.LightingModifiers
    data.eqtqualitymods = ModifierLiterals.EqtQualifyModifiers
    data.rofmods = ModifierLiterals.RateOfFireModifiers
    data.statusmods = ModifierLiterals.StatusModifiers
    data.covermods = ModifierLiterals.CoverPostureModifiers
    data.sizemods = ModifierLiterals.SizeModifiers
    data.hitlocationmods = ModifierLiterals.HitlocationModifiers
    data.currentmods = []

    if (!!game.GURPS.LastActor) {
      let melee = []
      let ranged = []
      let defense = []
      let gen = []

      let effects = game.GURPS.LastActor.effects.filter(e => !e.data.disabled)
      for (let effect of effects) {
        let type = effect.data.flags.core.statusId
        let m = ModifiersForStatus[type]
        if (!!m) {
          melee = melee.concat(m.melee)
          ranged = ranged.concat(m.ranged)
          defense = defense.concat(m.defense)
          gen = gen.concat(m.gen)
        }
      }
      if (gen.length > 0) {
        data.currentmods.push(horiz('General'))
        gen.forEach(e => data.currentmods.push(e))
      }
      if (melee.length > 0) {
        data.currentmods.push(horiz('Melee'))
        melee.forEach(e => data.currentmods.push(e))
      }
      if (ranged.length > 0) {
        data.currentmods.push(horiz('Ranged'))
        ranged.forEach(e => data.currentmods.push(e))
      }
      if (defense.length > 0) {
        data.currentmods.push(horiz('Defense'))
        defense.forEach(e => data.currentmods.push(e))
      }
    }
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    console.log('activatelisteners')

    html.removeClass('overflowy')

    this.bringToTop()

    html.find('#modtooltip').off('mouseleave')
    html.find('#modtooltip').off('mouseenter')
    this.inside = false
    html.find('#modtooltip').mouseenter(ev => this._onenter(ev))

    html.find('.removemod').click(this._onClickRemoveMod.bind(this))

    GURPS.hookupGurps(html, this)

    html.find('.gmbutton').click(this._onGMbutton.bind(this))
    html.find('#modmanualentry').change(this._onManualEntry.bind(this))
    html.find('.collapsible-content .content-inner .selectable').click(this._onSelect.bind(this))
    html.find('.collapsible-wrapper > input').click(this._onClickClose.bind(this))

    // get the tabs
    let tabs = html.find('.tabbedcontent')
    this.numberOfTabs = tabs.length

    // make the current tab visible
    for (let index = 0; index < tabs.length; index++) {
      const element = tabs[index]
      if (index === this.tabIndex) {
        element.classList.remove('invisible')
      } else {
        element.classList.add('invisible')
      }
    }

    // on click, change the current tab
    html.find('.tabbed .forward').click(this._clickTabForward.bind(this))
    html.find('.tabbed .back').click(this._clickTabBack.bind(this))
  }

  _clickTabBack() {
    if (this.tabIndex === 0) {
      this.tabIndex = this.numberOfTabs - 1
    } else {
      this.tabIndex--
    }
    this.render(false)
  }

  _clickTabForward() {
    if (this.tabIndex < this.numberOfTabs - 1) {
      this.tabIndex++
    } else {
      this.tabIndex = 0
    }
    this.render(false)
  }

  _onClickClose(ev) {
    let name = ev.currentTarget.id
    if (name === this._currentlyShowing) {
      ev.currentTarget.checked = false
      this._currentlyShowing = null
    } else {
      this._currentlyShowing = name
    }
  }

  /**
   * A 'selectable' div in a collapsible was clicked.
   * @param {*} ev
   */
  _onSelect(ev) {
    // find the toggle input above this element and remove the checked property
    let div = $(ev.currentTarget).parent().closest('.collapsible-content')
    let toggle = div.siblings('input')
    $(toggle).prop('checked', false)
    this._onSimpleList(ev, '')
  }

  _onleave(ev) {
    console.log('onleave')
    this.inside = false
    this.bucket.SHOWING = false
    this.close()
  }

  _onenter(ev) {
    if (!this.options.popOut) {
      if (!this.inside) {
        console.log('onenter')
        this.inside = true
        $(ev.currentTarget).mouseleave(ev => this._onleave(ev))
      }
    }
  }

  async _onManualEntry(event) {
    event.preventDefault()
    let element = event.currentTarget
    let v = element.value
    let parsed = parselink(element.value, game.GURPS.LastActor)
    if (!!parsed.action && parsed.action.type === 'modifier') {
      this.bucket.addModifier(parsed.action.mod, parsed.action.desc)
    } else this.editor.refresh()
  }

  async _onList(event) {
    this._onSimpleList(event, '')
  }

  async _onTaskDifficulty(event) {
    this._onSimpleList(event, 'Difficulty: ')
  }

  async _onLighting(event) {
    this._onSimpleList(event, 'Lighting: ')
  }

  async _onSimpleList(event, prefix) {
    event.preventDefault()
    let element = event.currentTarget
    let v = element.value
    if (!v) v = element.textContent
    let i = v.indexOf(' ')
    this.SHOWING = true // Firefox seems to need this reset when showing a pulldown
    this.bucket.addModifier(v.substring(0, i), prefix + v.substr(i + 1))
  }

  async _onGMbutton(event) {
    event.preventDefault()
    let element = event.currentTarget
    let id = element.dataset.id
    let user = game.users.get(id)

    this.bucket.sendBucket(user)
    setTimeout(() => this.bucket.showOthers(), 1000) // Need time for clients to update...and
  }

  async _onClickRemoveMod(event) {
    event.preventDefault()
    let element = event.currentTarget
    let index = element.dataset.index
    this.bucket.modifierStack.modifierList.splice(index, 1)
    this.bucket.sum()
    this.bucket.refresh()
    this.render(false)
  }
}

/**
 * These constants were moved to an object literal to allow for delayed instantiation.
 * This allows us to i18n the values.
 */
const ModifierLiterals = {
  _statusModifiers: null,

  get StatusModifiers() {
    if (this._statusModifiers === null) {
      this._statusModifiers = [
        i18n('GURPS.modifierStatusAffliction'),
        '*' + i18n('GURPS.modifierStatus'),
        i18n('GURPS.modifierStatusShock1'),
        i18n('GURPS.modifierStatusShock2'),
        i18n('GURPS.modifierStatusShock3'),
        i18n('GURPS.modifierStatusShock4'),
        i18n('GURPS.modifierStatusStunned'),
        '*' + i18n('GURPS.modifierAffliction'),
        i18n('GURPS.modifierAfflictionCough'),
        i18n('GURPS.modifierAfflictionCoughIQ'),
        i18n('GURPS.modifierAfflictionDrowsy'),
        i18n('GURPS.modifierAfflictionDrunk'),
        i18n('GURPS.modifierAfflictionDrunkCR'),
        i18n('GURPS.modifierAfflictionTipsy'),
        i18n('GURPS.modifierAfflictionTipsyCR'),
        i18n('GURPS.modifierAfflictionEuphoria'),
        i18n('GURPS.modifierAfflictionNausea'),
        i18n('GURPS.modifierAfflictionNauseaDef'),
        i18n('GURPS.modifierAfflictionModerate'),
        i18n('GURPS.modifierAfflictionModerateHPT'),
        i18n('GURPS.modifierAfflictionSevere'),
        i18n('GURPS.modifierAfflictionSevereHPT'),
        i18n('GURPS.modifierAfflictionTerrible'),
        i18n('GURPS.modifierAfflictionTerribleHPT'),
        i18n('GURPS.modifierAfflictionRetch'),
      ]
    }
    return this._statusModifiers
  },

  get CoverPostureModifiers() {
    return [
      i18n('GURPS.modifierCoverPosture'),
      '*' + i18n('GURPS.modifierCover'),
      i18n('GURPS.modifierCoverHead'),
      i18n('GURPS.modifierCoverHeadShoulder'),
      i18n('GURPS.modifierCoverHalfExposed'),
      i18n('GURPS.modifierCoverLight'),
      i18n('GURPS.modifierCoverBehindFigure'),
      i18n('GURPS.modifierCoverProne'),
      i18n('GURPS.modifierCoverProneHeadUp'),
      i18n('GURPS.modifierCoverProneHeadDown'),
      i18n('GURPS.modifierCoverCrouch'),
      i18n('GURPS.modifierCoverThroughHex'),
      '*' + i18n('GURPS.modifierPosture'),
      i18n('GURPS.modifierPostureProneMelee'),
      i18n('GURPS.modifierPostureProneRanged'),
      i18n('GURPS.modifierPostureProneDefend'),
      i18n('GURPS.modifierPostureCrouchMelee'),
      i18n('GURPS.modifierPostureCrouchRanged'),
      i18n('GURPS.modifierPostureKneelMelee'),
      i18n('GURPS.modifierPostureKneelDefend'),
    ]
  },

  get SizeModifiers() {
    return [
      i18n('GURPS.modifierSize'),
      '*' + i18n('GURPS.modifierSizeDetail'),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: '-10', us: '1.5 inches', metric: '5 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -9', us: '  2 inches', metric: '7 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -8', us: '  3 inches', metric: '10 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -7', us: '  5 inches', metric: '15 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -6', us: '  8 inches', metric: '20 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -5', us: '  1 foot', metric: '30 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -4', us: '1.5 feet', metric: '50 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -3', us: '  2 feet', metric: '70 cm' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -2', us: '  1 yard/3 feet', metric: '1 meter' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' -1', us: '1.5 yards/4.5 feet', metric: '1.5 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +0', us: '  2 yards/6 feet', metric: '2 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +1', us: '  3 yards/9 feet', metric: '3 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +2', us: '  5 yards/15 feet', metric: '5 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +3', us: '  7 yards/21 feet', metric: '7 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +4', us: ' 10 yards/30 feet', metric: '10 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +5', us: ' 15 yards/45 feet', metric: '15 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +6', us: ' 20 yards/60 feet', metric: '20 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +7', us: ' 30 yards/90 feet', metric: '30 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +8', us: ' 50 yards/150 feet', metric: '50 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: ' +9', us: ' 70 yards/210 feet', metric: '70 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: '+10', us: '100 yards/300 feet', metric: '100 meters' }),
    ]
  },

  _HitLocationModifiers: [],

  get HitlocationModifiers() {
    if (this._HitLocationModifiers.length === 0) {
      this._HitLocationModifiers.push(i18n('GURPS.modifierHitLocation'))

      for (let loc in HitLocations.hitlocationRolls) {
        let hit = HitLocations.hitlocationRolls[loc]
        // Only include the items in the menu is skip is false (or empty)
        if (!hit.skip) {
          let parts = [displayMod(hit.penalty), i18n('GURPS.modifierToHit'), i18n('GURPS.hitLocation' + loc)]

          if (!!hit.desc) {
            parts.push(`[${hit.desc.map(it => i18n(it)).join(', ')}]`)
          }
          this._HitLocationModifiers.push(parts.join(' '))
        }
      }
    }
    return this._HitLocationModifiers
  },

  // Using back quote to allow \n in the string.  Will make it easier to edit later (instead of array of strings)
  get MeleeMods() {
    return `[+4 ${i18n('GURPS.modifierDeterminedAttack')}] [PDF:${i18n('GURPS.modifierDeterminedAttackRef')}]
    [+4 ${i18n('GURPS.modifierTelegraphicAttack')}] [PDF:${i18n('GURPS.modifierTelegraphicAttackRef')}]
    [-2 ${i18n('GURPS.modifierDeceptiveAttack')}] [PDF:${i18n('GURPS.modifierDeceptiveAttackRef')}]
    [-4 ${i18n('GURPS.modifierMoveAttack')} *Max:9] [PDF:${i18n('GURPS.modifierMoveAttackRef')}]
    [+2 ${i18n('GURPS.modifierStrongAttack')}] [PDF:${i18n('GURPS.modifierStrongAttackRef')}]
    ${horiz(i18n('GURPS.modifierExtraEffort'))} [PDF:${i18n('GURPS.modifierExtraEffortRef')}]
    [+2 ${i18n('GURPS.modifierMightyBlow')} *Cost 1FP] [PDF:${i18n('GURPS.modifierMightyBlowRef')}]
    [+0 ${i18n('GURPS.modifierHeroicCharge')} *Cost 1FP] [PDF:${i18n('GURPS.modifierHeroicChargeRef')}]`
  },

  get RangedMods() {
    return `[+1 ${i18n('GURPS.aim')}]
    [+1 ${i18n('GURPS.modifierDeterminedAttack')}] [PDF:${i18n('GURPS.modifierDeterminedAttackRef')}]
    ${horiz(i18n('GURPS.actions'))}
    [${i18n('GURPS.modifierWillCheck')}]`
  },

  get DefenseMods() {
    return `[+2 ${i18n('GURPS.allOutDefense')}] [PDF:${i18n('GURPS.allOutDefenseRef')}]
    [+1 ${i18n('GURPS.modifierShieldDB')}] [PDF:${i18n('GURPS.modifierShieldDBRef')}]
    [+2 ${i18n('GURPS.modifierDodgeAcrobatic')}] [PDF:${i18n('GURPS.modifierDodgeAcrobaticRef')}]
    [+3 ${i18n('GURPS.modifierDodgeDive')}] [PDF:${i18n('GURPS.modifierDodgeDiveRef')}]
    [+3 ${i18n('GURPS.modifierDodgeRetreat')}] [PDF:${i18n('GURPS.modifierDodgeRetreatRef')}]
    [+1 ${i18n('GURPS.modifierBlockRetreat')}] [PDF:${i18n('GURPS.modifierBlockRetreatRef')}]
    [-2 ${i18n('GURPS.modifierDodgeFailedAcro')}] [PDF:${i18n('GURPS.modifierDodgeFailedAcroRef')}]
    [-2 ${i18n('GURPS.modifierDodgeSide')}] [PDF:${i18n('GURPS.modifierDodgeSideRef')}]
    [-4 ${i18n('GURPS.modifierDodgeRear')}] [PDF:${i18n('GURPS.modifierDodgeRearRef')}]
    ${horiz(i18n('GURPS.modifierExtraEffort'))}
    [+2 ${i18n('GURPS.modifierFeverishDef')} *Cost 1FP]
    ${horiz(i18n('GURPS.actions'))}
    [WILL-3 ${i18n('GURPS.concentrationCheck')}]`
  },

  get OtherMods1() {
    return `[+1]
    [+2]
    [+3]
    [+4]
    [+5]
    [-1]
    [-2]
    [-3]
    [-4]
    [-5]`
  },

  get OtherMods2() {
    return `[+1 ${i18n('GURPS.modifierGMSaidSo')}]
    [-1 ${i18n('GURPS.modifierGMSaidSo')}]
    [+4 ${i18n('GURPS.modifierGMBlessed')}]
    [-4 ${i18n('GURPS.modifierGMDontTry')}]`
  },

  get TaskDifficultyModifiers() {
    return [
      i18n('GURPS.modifierTaskDifficulty'),
      `+10 ${i18n('GURPS.modifierAutomatic')}`,
      `+8 ${i18n('GURPS.modifierTrivial')}`,
      `+6 ${i18n('GURPS.modifierVeryEasy')}`,
      `+4 ${i18n('GURPS.modifierEasy')}`,
      `+2 ${i18n('GURPS.modifierVeryFavorable')}`,
      `+1 ${i18n('GURPS.modifierFavorable')}`,
      `-1 ${i18n('GURPS.modifierUnfavorable')}`,
      `-2 ${i18n('GURPS.modifierVeryUnfavorable')}`,
      `-4 ${i18n('GURPS.modifierHard')}`,
      `-6 ${i18n('GURPS.modifierVeryHard')}`,
      `-8 ${i18n('GURPS.modifierDangerous')}`,
      `-10 ${i18n('GURPS.modifierImpossible')}`,
    ]
  },

  get LightingModifiers() {
    return [
      i18n('GURPS.lighting'),
      `-1 ${i18n('GURPS.modifierLightDim')}`,
      `-2 ${i18n('GURPS.modifierLightTwilight')}`,
      `-3 ${i18n('GURPS.modifierLightTorch')}`,
      `-4 ${i18n('GURPS.modifierLightFullMoon')}`,
      `-5 ${i18n('GURPS.modifierLightCandle')}`,
      `-6 ${i18n('GURPS.modifierLightHalfMoon')}`,
      `-7 ${i18n('GURPS.modifierLightQuarterMoon')}`,
      `-8 ${i18n('GURPS.modifierLightStarlight')}`,
      `-9 ${i18n('GURPS.modifierLightMoonless')}`,
      `-10 ${i18n('GURPS.modifierLightNone')}`,
    ]
  },

  get RateOfFireModifiers() {
    return [
      i18n('GURPS.rateOfFire'),
      `+1 ${i18n('GURPS.rof')}: 5-8`,
      `+2 ${i18n('GURPS.rof')}: 9-12`,
      `+3 ${i18n('GURPS.rof')}: 13-16`,
      `+4 ${i18n('GURPS.rof')}: 17-24`,
      `+5 ${i18n('GURPS.rof')}: 25-49`,
      `+6 ${i18n('GURPS.rof')}: 50-99`,
    ]
  },

  get EqtQualifyModifiers() {
    return [
      i18n('GURPS.modifierQuality'),
      `+4 ${i18n('GURPS.modifierQualityBest')}`,
      `+2 ${i18n('GURPS.modifierQualityFine')}`,
      `+1 ${i18n('GURPS.modifierQualityGood')}`,
      `-2 ${i18n('GURPS.modifierQualityImprovised')}`,
      `-5 ${i18n('GURPS.modifierQualityImprovTech')}`,
      `-1 ${i18n('GURPS.modifierQualityMissing')}`,
      `-5 ${i18n('GURPS.modifierQualityNone')}`,
      `-10 ${i18n('GURPS.modifierQualityNoneTech')}`,
    ]
  },
}

const ModifiersForStatus = {
  grapple: {
    gen: ['[-4 to DX checks (Grappled)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  aim: {
    gen: ['Aiming! Reference weapon ACC mod'],
    melee: [],
    ranged: [],
    defense: [],
  },
  retching: {
    gen: ['[-5 to IQ/DX/PER checks (Retching)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  mild_pain: {
    gen: ['[-1 to IQ/DX/CR rolls (Mild Pain)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  moderate_pain: {
    gen: ['[-2 to IQ/DX/CR rolls (Moderate Pain)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  moderate_pain2: {
    gen: ['[-3 to IQ/DX/CR rolls (Moderate Pain)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  severe_pain: {
    gen: ['[-4 to IQ/DX/CR rolls (Severe Pain)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  severe_pain2: {
    gen: ['[-5 to IQ/DX/CR rolls (Severe Pain)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  terrible_pain: {
    gen: ['[-6 to IQ/DX/CR rolls (Terrible Pain)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  nauseated: {
    gen: ['[-2 to All attributes (Nauseated)]'],
    melee: [],
    ranged: [],
    defense: ['[-1 to active defense (Nauseated)]'],
  },
  tipsy: {
    gen: ['[-1 to IQ/DX checks (Tipsy)]', '[-2 to CR rolls (Tipsy)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  drunk: {
    gen: ['[-2 to IQ/DX checks (Drunk)]', '[-4 to CR rolls (Drunk)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  drowsy: {
    gen: ['[-2 to IQ/DX/CR rolls (Drowsy)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  coughing: {
    gen: ['[-3 to DX checks (Coughing)]', '[-1 to IQ checks (Coughing)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  euphoria: {
    gen: ['[-3 to IQ/DX/CR rolls (Euphoria)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  shock1: {
    gen: ['[-1 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  shock2: {
    gen: ['[-2 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  shock3: {
    gen: ['[-3 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  shock4: {
    gen: ['[-4 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: [],
  },
  prone: {
    gen: [],
    melee: ['[-4 to hit Melee (Prone)]'],
    ranged: ['[-2 to hit Ranged (Prone)]'],
    defense: ['[-2 to active defenses (Prone)]'],
  },
  stun: {
    gen: [],
    melee: [],
    ranged: [],
    defense: ['[-4 to active defenses (Stunned)]'],
  },
  kneel: {
    gen: [],
    melee: ['[-2 to hit Melee (Kneeling)]'],
    ranged: [],
    defense: ['[-2 to active defenses (Kneeling)]'],
  },
  crouch: {
    gen: [],
    melee: ['[-2 to hit Melee (Crouching)]'],
    ranged: ['[-2 to hit Ranged (Crouching)]'],
    defense: [],
  },
  sit: {
    gen: [],
    melee: ['[-2 to hit Melee (Sitting)]'],
    ranged: [],
    defense: ['[-2 to active defenses (Sitting)]'],
  },
  blind: {
    gen: [],
    melee: ['[-10 (Suddenly Blind)]', '[-6 (Blind)]'],
    ranged: ['[-10 (Suddenly Blind)]', '[-6 (Blind)]'],
    defense: [],
  },
}
