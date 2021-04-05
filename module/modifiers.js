import { displayMod, makeSelect, horiz } from '../lib/utilities.js'
import { parselink } from '../lib/parselink.js'
import * as Settings from '../lib/miscellaneous-settings.js'
import * as HitLocations from '../module/hitlocation/hitlocation.js'

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
  constructor(options = {}) {
    super(options)

    this.isTooltip = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFIER_TOOLTIP)

    this.editor = new ModifierBucketEditor(this, {
      popOut: !this.isTooltip,
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

  getData(options) {
    const data = super.getData(options)
    data.stack = this.modifierStack
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
    this._position = {
      left: 375,
      top: 296,
    }

    // stupid Javascript
    this._onleave.bind(this)
    this._onenter.bind(this)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'ModifierBucketEditor',
      template: 'systems/gurps/templates/modifier-bucket-tooltip.html',
      width: 900,
      height: 800,
      resizeable: false,
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
    data.stack = this.bucket.modifierStack
    data.meleemods = ModifierLiterals.MeleeMods.split('\n')
    data.rangedmods = ModifierLiterals.RangedMods.split('\n')
    data.defensemods = ModifierLiterals.DefenseMods.split('\n')
    data.speedrangemods = ['Speed / Range'].concat(game.GURPS.rangeObject.modifiers)
    data.actorname = !!game.GURPS.LastActor ? game.GURPS.LastActor.name : 'No active character!'
    data.othermods = ModifierLiterals.OtherMods.split('\n')
    data.cansend = game.user?.isGM || game.user?.isRole('TRUSTED') || game.user?.isRole('ASSISTANT')
    data.users = game.users?.filter(u => u._id != game.user._id) || []
    if (data.users.length > 1) data.users.push({ name: 'Everyone!' })
    data.taskdificulties = ModifierLiterals.TaskDifficultyModifiers
    data.lightingmods = ModifierLiterals.LightingModifiers
    data.eqtqualitymods = ModifierLiterals.EqtQualifyModifiers
    data.rofmods = ModifierLiterals.RateOfFireModifiers
    data.statusmods = makeSelect(ModifierLiterals.StatusModifiers)
    data.covermods = makeSelect(ModifierLiterals.CoverPostureModifiers)
    data.sizemods = makeSelect(ModifierLiterals.SizeModifiers)
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
    html.css('top', `${this._position.top}px`)
    html.css('left', `${this._position.left}px`)

    this.bringToTop()

    html.find('#modtooltip').off('mouseleave')
    html.find('#modtooltip').off('mouseenter')
    this.inside = false
    html.find('#modtooltip').mouseenter(ev => this._onenter(ev))

    html.find('.removemod').click(this._onClickRemoveMod.bind(this))

    GURPS.hookupGurps(html, this)

    html.find('.gmbutton').click(this._onGMbutton.bind(this))
    html.find('#modmanualentry').change(this._onManualEntry.bind(this))
    html.find('#modtaskdifficulty').change(this._onTaskDifficulty.bind(this))
    html.find('#modlighting').change(this._onLighting.bind(this))
    html.find('#modspeedrange').change(this._onList.bind(this))
    html.find('#modeqtquality').change(this._onList.bind(this))
    html.find('#modrof').change(this._onList.bind(this))
    html.find('#modstatus').change(this._onList.bind(this))
    html.find('#modcover').change(this._onList.bind(this))
    html.find('#modsize').change(this._onList.bind(this))
    html.find('#modhitlocations').change(this._onList.bind(this))
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
        game.i18n.localize('GURPS.modifierStatusAffliction'),
        '*' + game.i18n.localize('GURPS.modifierStatus'),
        game.i18n.localize('GURPS.modifierStatusShock1'),
        game.i18n.localize('GURPS.modifierStatusShock2'),
        game.i18n.localize('GURPS.modifierStatusShock3'),
        game.i18n.localize('GURPS.modifierStatusShock4'),
        game.i18n.localize('GURPS.modifierStatusStunned'),
        '*' + game.i18n.localize('GURPS.modifierAffliction'),
        game.i18n.localize('GURPS.modifierAfflictionCough'),
        game.i18n.localize('GURPS.modifierAfflictionCoughIQ'),
        game.i18n.localize('GURPS.modifierAfflictionDrowsy'),
        game.i18n.localize('GURPS.modifierAfflictionDrunk'),
        game.i18n.localize('GURPS.modifierAfflictionDrunkCR'),
        game.i18n.localize('GURPS.modifierAfflictionTipsy'),
        game.i18n.localize('GURPS.modifierAfflictionTipsyCR'),
        game.i18n.localize('GURPS.modifierAfflictionEuphoria'),
        game.i18n.localize('GURPS.modifierAfflictionNausea'),
        game.i18n.localize('GURPS.modifierAfflictionNauseaDef'),
        game.i18n.localize('GURPS.modifierAfflictionModerate'),
        game.i18n.localize('GURPS.modifierAfflictionModerateHPT'),
        game.i18n.localize('GURPS.modifierAfflictionSevere'),
        game.i18n.localize('GURPS.modifierAfflictionSevereHPT'),
        game.i18n.localize('GURPS.modifierAfflictionTerrible'),
        game.i18n.localize('GURPS.modifierAfflictionTerribleHPT'),
        game.i18n.localize('GURPS.modifierAfflictionRetch'),
      ]
    }
    return this._statusModifiers
  },

  get CoverPostureModifiers() {
    return [
      game.i18n.localize('GURPS.modifierCoverPosture'),
      '*' + game.i18n.localize('GURPS.modifierCover'),
      game.i18n.localize('GURPS.modifierCoverHead'),
      game.i18n.localize('GURPS.modifierCoverHeadShoulder'),
      game.i18n.localize('GURPS.modifierCoverHalfExposed'),
      game.i18n.localize('GURPS.modifierCoverLight'),
      game.i18n.localize('GURPS.modifierCoverBehindFigure'),
      game.i18n.localize('GURPS.modifierCoverProne'),
      game.i18n.localize('GURPS.modifierCoverProneHeadUp'),
      game.i18n.localize('GURPS.modifierCoverProneHeadDown'),
      game.i18n.localize('GURPS.modifierCoverCrouch'),
      game.i18n.localize('GURPS.modifierCoverThroughHex'),
      '*' + game.i18n.localize('GURPS.modifierPosture'),
      game.i18n.localize('GURPS.modifierPostureProneMelee'),
      game.i18n.localize('GURPS.modifierPostureProneRanged'),
      game.i18n.localize('GURPS.modifierPostureProneDefend'),
      game.i18n.localize('GURPS.modifierPostureCrouchMelee'),
      game.i18n.localize('GURPS.modifierPostureCrouchRanged'),
      game.i18n.localize('GURPS.modifierPostureKneelMelee'),
      game.i18n.localize('GURPS.modifierPostureKneelDefend'),
    ]
  },

  get SizeModifiers() {
    return [
      game.i18n.localize('GURPS.modifierSize'),
      '*' + game.i18n.localize('GURPS.modifierSizeDetail'),
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
      game.i18n.format('GURPS.modifierSizeEntry', { SM: '+11', us: '150 yards/450 feet', metric: '150 meters' }),
      game.i18n.format('GURPS.modifierSizeEntry', { SM: '+12', us: '200 yards/600 feet', metric: '200 meters' }),
    ]
  },

  _HitLocationModifiers: [],

  get HitlocationModifiers() {
    if (this._HitLocationModifiers.length === 0) {
      this._HitLocationModifiers.push(game.i18n.localize('GURPS.modifierHitLocation'))

      for (let loc in HitLocations.hitlocationRolls) {
        let hit = HitLocations.hitlocationRolls[loc]
        // Only include the items in the menu is skip is false (or empty)
        if (!hit.skip) {
          let parts = [
            displayMod(hit.penalty),
            game.i18n.localize('GURPS.modifierToHit'),
            game.i18n.localize('GURPS.hitLocation' + loc),
          ]

          if (!!hit.desc) {
            parts.push(`[${hit.desc.map(it => game.i18n.localize(it)).join(', ')}]`)
          }
          this._HitLocationModifiers.push(parts.join(' '))
        }
      }
    }
    return this._HitLocationModifiers
  },

  // Using back quote to allow \n in the string.  Will make it easier to edit later (instead of array of strings)
  get MeleeMods() {
    return `[+4 ${game.i18n.localize('GURPS.modifierDeterminedAttack')}] [PDF:B365]
    [+4 ${game.i18n.localize('GURPS.modifierTelegraphicAttack')}] [PDF:MA113]
    [-2 ${game.i18n.localize('GURPS.modifierDeceptiveAttack')}] [PDF:B369]
    [-4 ${game.i18n.localize('GURPS.modifierMoveAttack')} *Max:9] [PDF:B365]
    [+2 ${game.i18n.localize('GURPS.modifierStrongAttack')}] [PDF:B365]
    ${horiz(game.i18n.localize('GURPS.modifierExtraEffort'))} [PDF:B357]
    [+2 ${game.i18n.localize('GURPS.modifierMightyBlow')} *Cost 1FP] [PDF:MA131]
    [+0 ${game.i18n.localize('GURPS.modifierHeroicCharge')} *Cost 1FP] [PDF:MA131]`
  },

  get RangedMods() {
    return `[+1 ${game.i18n.localize('GURPS.aim')}]
    [+1 ${game.i18n.localize('GURPS.modifierDeterminedAttack')}] [PDF:B365]
    ${horiz(game.i18n.localize('GURPS.actions'))}
    [${game.i18n.localize('GURPS.modifierWillCheck')}]`
  },

  get DefenseMods() {
    return `[+2 ${game.i18n.localize('GURPS.allOutDefense')}] [PDF:B365]
    [+1 ${game.i18n.localize('GURPS.modifierShieldDB')}] [PDF:B374]
    [+2 ${game.i18n.localize('GURPS.modifierDodgeAcrobatic')}] [PDF:B374]
    [+3 ${game.i18n.localize('GURPS.modifierDodgeDive')}] [PDF:B377]
    [+3 ${game.i18n.localize('GURPS.modifierDodgeRetreat')}] [PDF:B375]
    [+1 ${game.i18n.localize('GURPS.modifierBlockRetreat')}] [PDF:B377]
    [-2 ${game.i18n.localize('GURPS.modifierDodgeFailedAcro')}] [PDF:B375]
    [-2 ${game.i18n.localize('GURPS.modifierDodgeSide')}] [PDF:B390]
    [-4 ${game.i18n.localize('GURPS.modifierDodgeRear')}] [PDF:B391]
    ${horiz(game.i18n.localize('GURPS.modifierExtraEffort'))}
    [+2 ${game.i18n.localize('GURPS.modifierFeverishDef')} *Cost 1FP]
    ${horiz(game.i18n.localize('GURPS.actions'))}
    [WILL-3 ${game.i18n.localize('GURPS.concentrationCheck')}]`
  },

  get OtherMods() {
    return `[+1]
    [+2]
    [+3]
    [+4]
    [+5]
    [-1]
    [-2]
    [-3]
    [-4]
    [-5]
    [+1 ${game.i18n.localize('GURPS.modifierGMSaidSo')}]
    [-1 ${game.i18n.localize('GURPS.modifierGMSaidSo')}]
    [+4 ${game.i18n.localize('GURPS.modifierGMBlessed')}]
    [-4 ${game.i18n.localize('GURPS.modifierGMDontTry')}]`
  },

  get TaskDifficultyModifiers() {
    return [
      game.i18n.localize('GURPS.modifierTaskDifficulty'),
      `+10 ${game.i18n.localize('GURPS.modifierAutomatic')}`,
      `+8 ${game.i18n.localize('GURPS.modifierTrivial')}`,
      `+6 ${game.i18n.localize('GURPS.modifierVeryEasy')}`,
      `+4 ${game.i18n.localize('GURPS.modifierEasy')}`,
      `+2 ${game.i18n.localize('GURPS.modifierVeryFavorable')}`,
      `+1 ${game.i18n.localize('GURPS.modifierFavorable')}`,
      `-1 ${game.i18n.localize('GURPS.modifierUnfavorable')}`,
      `-2 ${game.i18n.localize('GURPS.modifierVeryUnfavorable')}`,
      `-4 ${game.i18n.localize('GURPS.modifierHard')}`,
      `-6 ${game.i18n.localize('GURPS.modifierVeryHard')}`,
      `-8 ${game.i18n.localize('GURPS.modifierDangerous')}`,
      `-10 ${game.i18n.localize('GURPS.modifierImpossible')}`,
    ]
  },

  get LightingModifiers() {
    return [
      game.i18n.localize('GURPS.lighting'),
      `-1 ${game.i18n.localize('GURPS.modifierLightDim')}`,
      `-2 ${game.i18n.localize('GURPS.modifierLightTwilight')}`,
      `-3 ${game.i18n.localize('GURPS.modifierLightTorch')}`,
      `-4 ${game.i18n.localize('GURPS.modifierLightFullMoon')}`,
      `-5 ${game.i18n.localize('GURPS.modifierLightCandle')}`,
      `-6 ${game.i18n.localize('GURPS.modifierLightHalfMoon')}`,
      `-7 ${game.i18n.localize('GURPS.modifierLightQuarterMoon')}`,
      `-8 ${game.i18n.localize('GURPS.modifierLightStarlight')}`,
      `-9 ${game.i18n.localize('GURPS.modifierLightMoonless')}`,
      `-10 ${game.i18n.localize('GURPS.modifierLightNone')}`,
    ]
  },

  get RateOfFireModifiers() {
    return [
      game.i18n.localize('GURPS.rateOfFire'),
      `+1 ${game.i18n.localize('GURPS.rof')}: 5-8`,
      `+2 ${game.i18n.localize('GURPS.rof')}: 9-12`,
      `+3 ${game.i18n.localize('GURPS.rof')}: 13-16`,
      `+4 ${game.i18n.localize('GURPS.rof')}: 17-24`,
      `+5 ${game.i18n.localize('GURPS.rof')}: 25-49`,
      `+6 ${game.i18n.localize('GURPS.rof')}: 50-99`,
    ]
  },

  get EqtQualifyModifiers() {
    return [
      game.i18n.localize('GURPS.modifierQuality'),
      `+4 ${game.i18n.localize('GURPS.modifierQualityBest')}`,
      `+2 ${game.i18n.localize('GURPS.modifierQualityFine')}`,
      `+1 ${game.i18n.localize('GURPS.modifierQualityGood')}`,
      `-2 ${game.i18n.localize('GURPS.modifierQualityImprovised')}`,
      `-5 ${game.i18n.localize('GURPS.modifierQualityImprovTech')}`,
      `-1 ${game.i18n.localize('GURPS.modifierQualityMissing')}`,
      `-5 ${game.i18n.localize('GURPS.modifierQualityNone')}`,
      `-10 ${game.i18n.localize('GURPS.modifierQualityNoneTech')}`,
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
