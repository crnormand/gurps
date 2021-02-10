import { displayMod, makeSelect, horiz } from '../lib/utilities.js'
import { parselink } from '../lib/parselink.js'
import * as Settings from '../lib/miscellaneous-settings.js'
import * as HitLocations from '../module/hitlocation/hitlocation.js'

Hooks.once('init', async function () {
  Hooks.on('closeModifierBucketEditor', (editor, element) => {
    $(element).hide()   // To make this application appear to close faster, we will hide it before the animation
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
        }
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

    this.editor = new ModifierBucketEditor(this)

    // whether the ModifierBucketEditor is visible
    this.SHOWING = false

    this._tempRangeMod = null

    this.modifierStack = {
      modifierList: [], // { "mod": +/-N, "desc": "" }
      currentSum: 0,
      displaySum: '+0',
      plus: false,
      minus: false
    }
  }

  getData(options) {
    const data = super.getData(options)
    data.stack = this.modifierStack
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

    if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFIER_TOOLTIP)) {
      e.mouseenter(ev => this._onenter(ev))
    }
  }

  _onenter(ev) {
    this.SHOWING = true
    // The location of bucket is hardcoded in the css #modifierbucket, so I'm ok with hardcoding it here.
    let position = {
      left: (805 + (70 / 2)) - (this.editor.position.width / 2),
      top: window.innerHeight - this.editor.position.height - 4
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
          type: CONST.CHAT_MESSAGE_TYPES.OOC
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
      whisper: [game.user._id]
    }
    CONFIG.ChatMessage.entityClass.create(chatData, {})
  }

  // If the GM right clicks on the modifier bucket, it will print the raw text data driving the tooltip
  async onRightClick(event) {
    event.preventDefault()
    if (!game.user.isGM) return
    this.showOthers();
  }

  // Public method. Used by GURPS to create a temporary modifer for an action.
  makeModifier(mod, reason) {
    let m = displayMod(mod)
    return {
      mod: m,
      modint: parseInt(m),
      desc: reason,
      plus: m[0] == '+'
    }
  }

  sum() {
    let stack = this.modifierStack
    stack.currentSum = 0
    for (let m of stack.modifierList) {
      stack.currentSum += m.modint
    }
    stack.displaySum = displayMod(stack.currentSum)
    stack.plus = stack.currentSum > 0 || stack.modifierList.length > 0   // cheating here... it shouldn't be named "plus", but "green"
    stack.minus = stack.currentSum < 0
  }

  currentSum() {
    return this.modifierStack.currentSum
  }

  async addModifier(mod, reason) {
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
    this.clear()
    return answer
  }

  async updateBucket() {
    this.refresh()
    if (this.SHOWING) {
      this.editor.render(true)
    }
    game.user.setFlag('gurps', 'modifierstack', this.modifierStack)
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
      displaySum: '+0'
    }
    this.updateBucket()
  }

  refresh() {
    this.render(true)
  }

  async sendBucketToPlayer(name) {
    if (!name) {
      this.sendBucket()
    } else {
      let users = game.users.players.filter(u => u.name == name) || []
      if (users.length > 0) this.sendBucket(users[0])
      else ui.notifications.warn("No player named '" + name + "'")
    }
  }

  async sendBucket(user) {
    let set = !!user ? [user] : game.users?.filter(u => u._id != game.user._id) || []
    let d = Date.now()
    {
      await set.forEach(u => {
        u.setFlag('gurps', 'modifierstack', game.GURPS.ModifierBucket.modifierStack)
      })
      await set.forEach(u => {
        u.setFlag('gurps', 'modifierchanged', d)
      })
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
      top: 296
    }

    for (let loc in HitLocations.hitlocationRolls) {
      let hit = HitLocations.hitlocationRolls[loc]
      if (!hit.skip) {
        // Only include the items in the menu is skip is false (or empty)
        let mod = displayMod(hit.penalty) + ' to hit ' + loc
        if (!!hit.desc) mod += ' (' + hit.desc + ')'
        HitlocationModifiers.push(mod)
      }
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

  getData(options) {
    const data = super.getData(options)
    data.gmod = this
    data.stack = this.bucket.modifierStack
    data.meleemods = MeleeMods.split('\n')
    data.rangedmods = RangedMods.split('\n')
    data.defensemods = DefenseMods.split('\n')
    data.speedrangemods = ['Speed / Range'].concat(game.GURPS.rangeObject.modifiers)
    data.actorname = !!game.GURPS.LastActor ? game.GURPS.LastActor.name : 'No active character!'
    data.othermods = OtherMods.split('\n')
    data.cansend = game.user?.isGM || game.user?.isRole('TRUSTED') || game.user?.isRole('ASSISTANT')
    data.users = game.users?.filter(u => u._id != game.user._id) || []
    if (data.users.length > 1) data.users.push({ name: 'Everyone!' })
    data.taskdificulties = TaskDifficultyModifiers
    data.lightingmods = LightingModifiers
    data.eqtqualitymods = EqtQualifyModifiers
    data.rofmods = RateOfFireModifiers
    data.statusmods = makeSelect(StatusModifiers)
    data.covermods = makeSelect(CoverPostureModifiers)
    data.sizemods = SizeModifiers
    data.hitlocationmods = HitlocationModifiers
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
    if (!this.inside) {
      console.log('onenter')
      this.inside = true
      $(ev.currentTarget).mouseleave(ev => this._onleave(ev))
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


const StatusModifiers = [
  'Status & Afflictions',
  '*Status',
  '-1 to IQ/DX checks (Shock 1)',
  '-2 to IQ/DX checks (Shock 2)',
  '-3 to IQ/DX checks (Shock 3)',
  '-4 to IQ/DX checks (Shock 4)',
  '-4 to active defenses (Stunned)',
  '*Afflictions',
  '-3 to DX checks (Coughing)',
  '-1 to IQ checks (Coughing)',
  '-2 to IQ/DX/CR rolls (Drowsy)',
  '-2 to IQ/DX checks (Drunk)',
  '-4 to CR rolls (Drunk)',
  '-1 to IQ/DX checks (Tipsy)',
  '-2 to CR rolls (Tipsy)',
  '-3 to IQ/DX/CR rolls (Euphoria)',
  '-2 to All attributes (Nauseated)',
  '-1 to active defense (Nauseated)',
  '-2 to IQ/DX/CR rolls (Moderate Pain)',
  '-4 to IQ/DX/CR rolls (Severe Pain)',
  '-6 to IQ/DX/CR rolls (Terrible Pain)',
  '-1 to IQ/DX/CR rolls (Moderate Pain /w HPT)',
  '-2 to IQ/DX/CR rolls (Severe Pain /w HPT)',
  '-3 to IQ/DX/CR rolls (Terrible Pain /w HPT)',
  '-5 to IQ/DX/PER checks (Retching)'
]

const CoverPostureModifiers = [
  'Cover & Posture',
  '*Cover',
  '-5 to hit, Head only',
  '-4 to hit, Head and shoulders exposed',
  '-3 to hit, Body half exposed',
  '-2 to hit, Behind light cover',
  '-4 to hit, Behind same-sized figure',
  '-4 to hit, Prone without cover',
  '-5 to hit, Prone some cover, head up',
  '-7 to hit, Prone some cover, head down',
  '-2 to hit, Crouching/kneeling no cover',
  '-4 to hit, firing through occupied hex',
  '*Posture',
  '-4 to hit Melee (Prone)',
  '-2 to hit Ranged (Prone)',
  '-3 to active defenses (Prone)',
  '-2 to hit Melee (Crouch)',
  '-2 to hit Ranged (Crouch)',
  '-2 to hit Melee (Kneel/Sit)',
  '-2 to active defenses (Kneel/Sit)'
]

const SizeModifiers = [
  'Size Modifier (melee diff, ranged abs)',
  '-10  Size 0.05 yard (1.8")',
  '-9  Size 0.07 yard (2.5")',
  '-8  Size 0.1 yard (3.5")',
  '-7  Size 0.15 yard (5")',
  '-6  Size 0.2 yard (7")',
  '-5  Size 0.3 yard (10")',
  '-4  Size 0.5 yard (18")',
  "-3  Size 0.7 yard (2')",
  "-2  Size 1 yard (3')",
  "-1  Size 1.5 yards (4.5')",
  "+0  Size 2 yards (6')",

  "+1  Size 3 yards (9')",
  "+2  Size 5 yards (15')",
  "+3  Size 7 yards (21')",
  "+4  Size 10 yards (30')",
  "+5  Size 15 yards (45')",
  "+6  Size 20 yards (60')",
  "+7  Size 30 yards (90')",
  "+8  Size 50 yards (150')",
  "+9  Size 70 yards (210')",
  "+10 Size 100 yards (300')",
  "+11 Size 150 yards (450')"
]

let HitlocationModifiers = ['Hit Locations (if miss by 1, then *)']

// Using back quote to allow \n in the string.  Will make it easier to edit later (instead of array of strings)
const MeleeMods = `[+4 to hit (Determined Attack)]
[+4 to hit (Telegraphic Attack)]
[-2 to hit (Deceptive Attack)]
[-4 to hit (Charge Attack) *Max:9]
[+2 dmg (Strong Attack)]
${horiz('Extra Effort')}
[+2 dmg (Mighty Blow) *Cost 1FP]
[+0 Heroic Charge *Cost 1FP]`

const RangedMods = `[+1 Aim]
[+1 to hit (Determined Attack)]
${horiz('Actions')}
[WILL check to maintain Aim]`

const DefenseMods = `[+2 All-Out Defense]
[+1 to dodge (Shield)]
[+2 to dodge (Acrobatics)]
[+3 to dodge (Dive)]
[+3 to dodge (Retreat)]
[+1 block/parry (Retreat)]

[-2 to dodge (Failed Acrobatics)]
[-2 to dodge (Attacked from side)]
[-4 to dodge (Attacked from rear)]
${horiz('Extra Effort')}
[+2 Feverish Defense *Cost 1FP]
${horiz('Actions')}
[WILL-3 Concentration check]`

const OtherMods = `[+1]
[+2]
[+3]
[+4]
[+5]
[-1]
[-2]
[-3]
[-4]
[-5]
[+1 GM said so]
[-1 GM said so]
[+4 GM Blessed]
[-4 GM don't try it]`

const TaskDifficultyModifiers = [
  'Task Difficulty',
  '+10 Automatic',
  '+8 Trivial',
  '+6 Very Easy',
  '+4 Easy',
  '+2 Very Favorable',
  '+1 Favorable',
  '-1 Unfavorable',
  '-2 Very Unfavorable',
  '-4 Hard',
  '-6 Very hard',
  '-8 Dangerous',
  '-10 Impossible'
]

const LightingModifiers = [
  'Lighting',
  '-1 Sunrise / sunset / torch / flashlight',
  '-2 Twilight / gaslight / cell-phone',
  '-3 Deep twlight / candlelight',
  '-4 Full moon',
  '-5 Half moon',
  '-6 Quarter moon',
  '-7 Starlight',
  '-8 Starlight through clouds',
  '-9 Overcast moonless night',
  '-10 Total darkness'
]

const RateOfFireModifiers = [
  'Rate of Fire',
  '+1 RoF: 5-8',
  '+2 RoF: 9-12',
  '+3 RoF: 13-16',
  '+4 RoF: 17-24',
  '+5 RoF: 25-49',
  '+6 RoF: 50-99'
]

const EqtQualifyModifiers = [
  'Equipment Quality',
  '+4 Best Possible Equipment',
  '+2 Fine Quality Equipment (20x cost)',
  '+1 Good Quality Equipment (5x cost)',
  '-2 Improvised Equipment (non-tech task)',
  '-5 Improvised Equipment (tech task)',
  '-1 Missing / Damaged item',
  '-5 No Equipment (none-tech task)',
  '-10 No Equipment (tech task)'
]

const ModifiersForStatus = {
  grapple: {
    gen: ['[-4 to DX checks (Grappled)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  aim: {
    gen: ['Aiming! Reference weapon ACC mod'],
    melee: [],
    ranged: [],
    defense: []
  },
  retching: {
    gen: ['[-5 to IQ/DX/PER checks (Retching)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  mild_pain: {
    gen: ['[-1 to IQ/DX/CR rolls (Mild Pain)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  moderate_pain: {
    gen: ['[-2 to IQ/DX/CR rolls (Moderate Pain)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  moderate_pain2: {
    gen: ['[-3 to IQ/DX/CR rolls (Moderate Pain)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  severe_pain: {
    gen: ['[-4 to IQ/DX/CR rolls (Severe Pain)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  severe_pain2: {
    gen: ['[-5 to IQ/DX/CR rolls (Severe Pain)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  terrible_pain: {
    gen: ['[-6 to IQ/DX/CR rolls (Terrible Pain)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  nauseated: {
    gen: ['[-2 to All attributes (Nauseated)]'],
    melee: [],
    ranged: [],
    defense: ['[-1 to active defense (Nauseated)]']
  },
  tipsy: {
    gen: ['[-1 to IQ/DX checks (Tipsy)]', '[-2 to CR rolls (Tipsy)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  drunk: {
    gen: ['[-2 to IQ/DX checks (Drunk)]', '[-4 to CR rolls (Drunk)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  drowsy: {
    gen: ['[-2 to IQ/DX/CR rolls (Drowsy)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  coughing: {
    gen: ['[-3 to DX checks (Coughing)]', '[-1 to IQ checks (Coughing)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  euphoria: {
    gen: ['[-3 to IQ/DX/CR rolls (Euphoria)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  shock1: {
    gen: ['[-1 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  shock2: {
    gen: ['[-2 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  shock3: {
    gen: ['[-3 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  shock4: {
    gen: ['[-4 to IQ/DX checks (Shock)]'],
    melee: [],
    ranged: [],
    defense: []
  },
  prone: {
    gen: [],
    melee: ['[-4 to hit Melee (Prone)]'],
    ranged: ['[-2 to hit Ranged (Prone)]'],
    defense: ['[-2 to active defenses (Prone)]']
  },
  stun: {
    gen: [],
    melee: [],
    ranged: [],
    defense: ['[-4 to active defenses (Stunned)]']
  },
  kneel: {
    gen: [],
    melee: ['[-2 to hit Melee (Kneeling)]'],
    ranged: [],
    defense: ['[-2 to active defenses (Kneeling)]']
  },
  crouch: {
    gen: [],
    melee: ['[-2 to hit Melee (Crouching)]'],
    ranged: ['[-2 to hit Ranged (Crouching)]'],
    defense: []
  },
  sit: {
    gen: [],
    melee: ['[-2 to hit Melee (Sitting)]'],
    ranged: [],
    defense: ['[-2 to active defenses (Sitting)]']
  },
  blind: {
    gen: [],
    melee: ['[-10 (Suddenly Blind)]', '[-6 (Blind)]'],
    ranged: ['[-10 (Suddenly Blind)]', '[-6 (Blind)]'],
    defense: []
  }
}
