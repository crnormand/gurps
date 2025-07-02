import * as Settings from '../../lib/miscellaneous-settings.js'
import { parselink } from '../../lib/parselink.js'
import { displayMod, horiz } from '../../lib/utilities.js'
import { gurpslink } from '../../module/utilities/gurpslink.js'
import GurpsWiring from '../gurps-wiring.js'
import * as HitLocations from '../hitlocation/hitlocation.js'
/**
 * The ModifierBucketEditor displays the popup (tooltip) window where modifiers can be applied
 * to the current or other actors.
 */
export default class ModifierBucketEditor extends Application {
  constructor(bucket, options = {}) {
    super(options)
    this.bucket = bucket // reference to class ModifierBucket, which is the 'button' that opens this window

    this.inside = false
    this.tabIndex = 0
  }

  static get defaultOptions() {
    let scale = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_SCALE)

    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'ModifierBucketEditor',
      template: 'systems/gurps/templates/modifier-bucket/tooltip-window.hbs',
      minimizable: false,
      width: 840,
      height: 'auto', // Set height to 'auto' to make it depend on the content
      scale: scale,
      classes: ['modifier-bucket'],
    })
  }

  get title() {
    return game.i18n.localize('GURPS.modifierTitle')
  }

  /**
   * @override
   * @param {*} force
   * @param {*} options
   */
  render(force, options = {}) {
    super.render(force, options)
    this.bucket.SHOWING = true
  }

  /**
   * @override
   */
  close() {
    this.bucket.SHOWING = false
    super.close()
  }

  get journals() {
    const settings = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_JOURNALS) || []
    let bucketPages = []
    game.journal.forEach(j => {
      j.pages.forEach(p => {
        for (const k in settings) {
          const id = settings[k]
          if (p.id == id) bucketPages.push(p)
        }
      })
    })
    return bucketPages
  }

  convertModifiers(list) {
    return list
      .filter(it => it.trim() !== '')
      .map(it => {
        const regex = it.includes('@man:') ? /^(.*?)(?=[#@])/ : /^(.*?)(?=[#@(])/
        const desc = it.match(regex)?.[1]
        return desc ? `[${game.i18n.localize(desc.trim())}]` : `[${game.i18n.localize(it).trim()}]`
      })
      .map(it => gurpslink(it))
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
    data.speedrangemods = [game.i18n.localize('GURPS.modifierRangeTitle')].concat(GURPS.rangeObject.modifiers)
    data.actorname = !!GURPS.LastActor ? GURPS.LastActor.name : 'No active character!'
    data.othermods1 = ModifierLiterals.OtherMods1.split('\n')
    data.othermods2 = ModifierLiterals.OtherMods2.split('\n')
    data.cansend = game.user?.isGM || game.user?.hasRole('TRUSTED') || game.user?.hasRole('ASSISTANT')
    data.users = game.users?.filter(u => u.id != game.user.id) || []
    data.everyone = data.users.length > 1 ? { name: 'Everyone!' } : null
    data.taskdificulties = ModifierLiterals.TaskDifficultyModifiers
    data.lightingmods = ModifierLiterals.LightingModifiers
    data.eqtqualitymods = ModifierLiterals.EqtQualifyModifiers
    data.rofmods = ModifierLiterals.RateOfFireModifiers
    data.statusmods = ModifierLiterals.StatusModifiers
    data.covermods = ModifierLiterals.CoverPostureModifiers
    data.sizemods = ModifierLiterals.SizeModifiers
    data.hitlocationmods = ModifierLiterals.HitlocationModifiers
    data.effortmods = ModifierLiterals.ExtraEffortModifiers
    data.currentmods = []

    if (!!GURPS.LastActor) {
      let self = this.convertModifiers(GURPS.LastActor.system.conditions.self.modifiers)
      self.forEach(e => data.currentmods.push(e))

      let target = this.convertModifiers(GURPS.LastActor.system.conditions.target.modifiers)
      if (target.length > 0) {
        data.currentmods.push(horiz(game.i18n.localize('GURPS.targetedModifiers')))
        target.forEach(e => data.currentmods.push(e))
      }
      let user = this.convertModifiers(
        GURPS.LastActor.system.conditions.usermods ? GURPS.LastActor.system.conditions.usermods : []
      )
      if (user.length > 0) {
        let uc = '(' + game.i18n.localize('GURPS.equipmentUserCreated') + ')'
        data.currentmods.push(horiz(game.i18n.localize('GURPS.equipmentUserCreated')))
        user.forEach(e => data.currentmods.push(e.replace(uc, '')))
      }
    }
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    // if this is a tooltip, scale and position
    let scale = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_SCALE)
    const positionSetting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_POSITION)

    if (!this.options.popOut) {
      html.css('font-size', `${13 * scale}px`)

      const button = document.getElementById('modifierbucket')

      const buttonLeft = button.getBoundingClientRect().left
      const buttonWidth = button.offsetWidth
      const buttonTop = window.innerHeight - button.getBoundingClientRect().top

      const width = parseFloat(html.css('width').replace('px', ''))

      let left = 0
      if (positionSetting === 'left') {
        left = Math.max(buttonLeft + buttonWidth / 2 - width / 2, 10)
      } else {
        left = Math.max(buttonLeft + buttonWidth - width, 10)
      }

      // ensure that left is not negative
      html.css('left', `${left}px`)
      html.css('bottom', `${buttonTop + 20}px`)
    }

    html.removeClass('overflowy')
    this.bringToTop()

    html.find('#modtooltip').off('mouseleave')
    html.find('#modtooltip').off('mouseenter')
    this.inside = false
    html.find('#modtooltip').mouseenter(this._onenter.bind(this))

    html.find('.removemod').click(this._onClickRemoveMod.bind(this))

    GurpsWiring.hookupGurps(html)
    GurpsWiring.hookupGurpsRightClick(html)

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

  _onleave(_ev) {
    this.inside = false
    this.bucket.SHOWING = false
    this.close()
  }

  _onenter(ev) {
    if (!this.options.popOut) {
      if (!this.inside) {
        this.inside = true
        $(ev.currentTarget).mouseleave(ev => this._onleave(ev))
      }
    }
  }

  async _onManualEntry(event) {
    event.preventDefault()
    event.stopPropagation()
    let element = event.currentTarget
    let parsed = parselink(element.value)
    if (!!parsed.action && parsed.action.type === 'modifier') {
      this.bucket.addModifier(parsed.action.mod, parsed.action.desc)
    } else {
      setTimeout(() => ui.notifications.info("Unable to determine modifier for '" + element.value + "'"), 200)
      this.bucket.refresh() // WARNING: REQUIRED!  or the world will crash... trust me.
    }
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
    v = v.trim()
    let i = v.indexOf(' ')
    this.SHOWING = true // Firefox seems to need this reset when showing a pulldown
    this.bucket.addModifier(v.substring(0, i), prefix + v.substr(i + 1))
  }

  async _onGMbutton(event) {
    event.preventDefault()
    let element = event.currentTarget
    let id = element.dataset.id
    this.bucket.sendBucketToPlayer(id)
    setTimeout(() => this.bucket.showOthers(), 1000) // Need time for clients to update...and
  }

  async _onClickRemoveMod(event) {
    event.preventDefault()
    let element = event.currentTarget
    let index = element.dataset.index
    this.bucket.modifierStack.removeIndex(index)
    this.bucket.refresh()
  }
}

/**
 * These constants were moved to an object literal to allow for delayed instantiation.
 * This allows us to localize the values.
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
    return `
    [+4 ${game.i18n.localize('GURPS.modifiers_.aoaDetermined')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.aoaDetermined')}]
    [+2 ${game.i18n.localize('GURPS.modifiers_.aoaStrong')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.aoaStrong')}]
    [+2 ${game.i18n.localize('GURPS.modifiers_.committedDetermined')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.committedDetermined')}]
    [+1 ${game.i18n.localize('GURPS.modifiers_.committedStrong')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.committedStrong')}]
    [+4 ${game.i18n.localize('GURPS.modifiers_.telegraphic')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.telegraphic')}]
    [-4 ${game.i18n.localize('GURPS.modifiers_.moveAndAttack')} *Max:9] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.moveAndAttack')}]
    [-2 ${game.i18n.localize('GURPS.modifiers_.deceptive')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.deceptive')}]
    [-2 ${game.i18n.localize('GURPS.modifiers_.defensive')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.defensive')}]
    [-6 ${game.i18n.localize('GURPS.modifiers_.rapidStrike')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.rapidStrike')}]`
  },

  get RangedMods() {
    const useOnTarget = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_ON_TARGET)

    return (
      `[+1 ${game.i18n.localize('GURPS.modifiers_.aim')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.aim')}]
      [–2 ${game.i18n.localize('GURPS.modifiers_.popup')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.popup')}]` +
      (useOnTarget
        ? `
${horiz(game.i18n.localize('GURPS.modifiers_.onTargetAiming'))}
[+2 ${game.i18n.localize('GURPS.modifiers_.aoaRanged')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.aoaRanged')}]
[+1 ${game.i18n.localize('GURPS.modifiers_.committedRanged')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.committedRanged')}]
[+4 ${game.i18n.localize('GURPS.modifiers_.allOutAim')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.allOutAim')}]
[+2 ${game.i18n.localize('GURPS.modifiers_.allOutAimBraced')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.allOutAimBraced')}]
[+2 ${game.i18n.localize('GURPS.modifiers_.committedAim')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.committedAim')}]
[+1 ${game.i18n.localize('GURPS.modifiers_.committedAimBraced')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.committedAimBraced')}]`
        : `
[+1 ${game.i18n.localize('GURPS.modifiers_.aoaRangedDetermined')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.aoaRangedDetermined')}]`)
    )
  },

  get DefenseMods() {
    const useOnTarget = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_ON_TARGET)

    return `[+2 ${game.i18n.localize('GURPS.modifiers_.aodIncreased')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.aodIncreased')}]
    [+1 ${game.i18n.localize('GURPS.modifiers_.shieldDB')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.shieldDB')}]
    [+2 ${game.i18n.localize('GURPS.modifiers_.dodgeAcrobatic')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.dodgeAcrobatic')}]
    [+3 ${game.i18n.localize('GURPS.modifiers_.dodgeAndDrop')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.dodgeAndDrop')}]
    [+3 ${game.i18n.localize('GURPS.modifiers_.dodgeRetreat')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.dodgeRetreat')}]
    [+1 ${game.i18n.localize('GURPS.modifiers_.blockRetreat')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.blockRetreat')}]
    [+3 ${game.i18n.localize('GURPS.modifiers_.fencingRetreat')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.fencingRetreat')}]
    [+1 ${game.i18n.localize('GURPS.modifiers_.defensiveDefense')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.defensiveDefense')}]
    ${
      useOnTarget
        ? `[-2 ${game.i18n.localize('GURPS.modifiers_.committedAimDefense')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.committedAimDefense')}]`
        : ''
    }
    ${
      useOnTarget
        ? `[-2 ${game.i18n.localize('GURPS.modifiers_.committedAttackRanged')}] [PDF:${game.i18n.localize(
            'GURPS.modifiers_.pdf.committedAttackRanged'
          )}]`
        : ''
    }
    [-2 ${game.i18n.localize('GURPS.modifiers_.dodgeAcrobaticFail')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.dodgeAcrobaticFail')}]
    [-2 ${game.i18n.localize('GURPS.modifiers_.defenseSide')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.defenseSide')}]
    [-1 ${game.i18n.localize('GURPS.modifiers_.deceptiveDefense')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.deceptiveDefense')}]
    [–1 ${game.i18n.localize('GURPS.modifiers_.riposte')}] [PDF:${game.i18n.localize('GURPS.modifiers_.pdf.riposte')}]`
  },

  get OtherMods1() {
    return `["&nbsp;&nbsp;+1&nbsp;&nbsp;&nbsp;&hairsp;"+1]
            ["&nbsp;&nbsp;+2&nbsp;&nbsp;&nbsp;&hairsp;"+2]
            ["&nbsp;&nbsp;+3&nbsp;&nbsp;&nbsp;&hairsp;"+3]
            ["&nbsp;&nbsp;+4&nbsp;&nbsp;&nbsp;&hairsp;"+4]
            ["&nbsp;&nbsp;+5&nbsp;&nbsp;&nbsp;&hairsp;"+5]
            ["&nbsp;&nbsp;&#8211;1&nbsp;&nbsp;&nbsp;"-1]
            ["&nbsp;&nbsp;&#8211;2&nbsp;&nbsp;&nbsp;"-2]
            ["&nbsp;&nbsp;&#8211;3&nbsp;&nbsp;&nbsp;"-3]
            ["&nbsp;&nbsp;&#8211;4&nbsp;&nbsp;&nbsp;"-4]
            ["&nbsp;&nbsp;&#8211;5&nbsp;&nbsp;&nbsp;"-5]`
  },

  get OtherMods2() {
    return ''
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
      `-3 ${game.i18n.localize('GURPS.modifierLightDeepTwilight')}`,
      `-4 ${game.i18n.localize('GURPS.modifierLightFullMoon')}`,
      `-5 ${game.i18n.localize('GURPS.modifierLightHalfMoon')}`,
      `-6 ${game.i18n.localize('GURPS.modifierLightQuarterMoon')}`,
      `-7 ${game.i18n.localize('GURPS.modifierLightStarlight')}`,
      `-8 ${game.i18n.localize('GURPS.modifierLightStarlightClouds')}`,
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

  get ExtraEffortModifiers() {
    return [
      game.i18n.localize('GURPS.modifiers_.extraEffort'),
      `+2 ${game.i18n.localize('GURPS.modifiers_.feverishDefense')} *Cost 1FP`,
      `+2 ${game.i18n.localize('GURPS.modifiers_.mightyBlow')} *Cost 1FP`,
      `+0 ${game.i18n.localize('GURPS.modifiers_.heroicCharge')} *Cost 1FP`,
      `-3 penalty for Rapid Strike (Flurry of Blows) *Cost 1FP`,
    ]
  },
}
