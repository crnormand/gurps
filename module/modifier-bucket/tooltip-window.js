import { displayMod, horiz, i18n } from '../../lib/utilities.js'
import { parselink } from '../../lib/parselink.js'
import * as HitLocations from '../hitlocation/hitlocation.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import GurpsWiring from '../gurps-wiring.js'
import { gurpslink } from '../../module/utilities/gurpslink.js'
/**
 * The ModifierBucketEditor displays the popup (tooltip) window where modifiers can be applied
 * to the current or other actors.
 */
export default class ModifierBucketEditor extends Application {
  constructor(bucket, options = {}) {
    super(options)

    // console.trace('+++++ Create ModifierBucketEditor +++++')

    this.bucket = bucket // reference to class ModifierBucket, which is the 'button' that opens this window
    this.inside = false
    this.tabIndex = 0
  }

  static get defaultOptions() {
    let scale = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_SCALE)

    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'ModifierBucketEditor',
      template: 'systems/gurps/templates/modifier-bucket/tooltip-window.html',
      minimizable: false,
      width: 840,
      height: 'auto', // Set height to 'auto' to make it depend on the content
      scale: scale,
      classes: ['modifier-bucket'],
    })
  }

  get title() {
    return i18n('GURPS.modifierTitle')
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
    return list.map(it => `[${i18n(it)}]`).map(it => gurpslink(it))
  }

  /**
   * @override
   * @param {*} options
   * @returns
   */
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
    data.speedrangemods = [i18n('GURPS.modifierRangeTitle')].concat(GURPS.rangeObject.modifiers)
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
        data.currentmods.push(horiz(i18n('GURPS.targetedModifiers')))
        target.forEach(e => data.currentmods.push(e))
      }
      let user = this.convertModifiers(
        GURPS.LastActor.system.conditions.usermods ? GURPS.LastActor.system.conditions.usermods : []
      )
      if (user.length > 0) {
        let uc = '(' + i18n('GURPS.equipmentUserCreated') + ')'
        data.currentmods.push(horiz(i18n('GURPS.equipmentUserCreated')))
        user.forEach(e => data.currentmods.push(e.replace(uc, '')))
      }

      /*
				  let melee = []
				  let ranged = []
				  let defense = []
				  let gen = []
				  
				  let effects = GURPS.LastActor.effects.filter(e => !e.disabled)
				  for (let effect of effects) {
					let type = effect.flags?.core?.statusId
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
			*/
    }
    return data
  }

  /**
   * @override
   * @param {*} html
   */
  activateListeners(html) {
    super.activateListeners(html)

    // if this is a tooltip, scale and position
    let scale = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BUCKET_SCALE)

    if (!this.options.popOut) {
      html.css('font-size', `${13 * scale}px`)

      // let height = parseFloat(html.css('height').replace('px', ''))
      // let top = window.innerHeight - height - 65
      // html.css('top', `${top}px`)

      // let right = parseFloat(html.css('right').replace('px', ''))
      // if (right < 0) {
      let x = $('#modifierbucket')
      // let bucketTop = x.position().top
      let bucketLeft = x.position().left
      let bucketWidth = 70

      let width = parseFloat(html.css('width').replace('px', ''))
      // ensure that left is not negative
      let left = Math.max(bucketLeft + bucketWidth / 2 - width / 2, 10)
      // console.log(`bucketLeft: ${bucketLeft}; width: ${width}; left: ${left}`)
      html.css('left', `${left}px`)
      // }
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
    // console.log('onleave')
    this.inside = false
    this.bucket.SHOWING = false
    this.close()
  }

  _onenter(ev) {
    if (!this.options.popOut) {
      if (!this.inside) {
        // console.log('onenter')
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
    //    this.render(false)
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
    return `
    [+4 ${i18n('gurps.modifiers.aoaDetermined')}] [PDF:${i18n('gurps.modifiers.pdf.aoaDetermined')}]
    [+2 ${i18n('gurps.modifiers.aoaStrong')}] [PDF:${i18n('gurps.modifiers.pdf.aoaStrong')}]
    [+2 ${i18n('gurps.modifiers.committedDetermined')}] [PDF:${i18n('gurps.modifiers.pdf.committedDetermined')}]
    [+1 ${i18n('gurps.modifiers.committedStrong')}] [PDF:${i18n('gurps.modifiers.pdf.committedStrong')}]
    [+4 ${i18n('gurps.modifiers.telegraphic')}] [PDF:${i18n('gurps.modifiers.pdf.telegraphic')}]
    [-4 ${i18n('gurps.modifiers.moveAndAttack')} *Max:9] [PDF:${i18n('gurps.modifiers.pdf.moveAndAttack')}]
    [-2 ${i18n('gurps.modifiers.deceptive')}] [PDF:${i18n('gurps.modifiers.pdf.deceptive')}]
    [-2 ${i18n('gurps.modifiers.defensive')}] [PDF:${i18n('gurps.modifiers.pdf.defensive')}]
    [-6 ${i18n('gurps.modifiers.rapidStrike')}] [PDF:${i18n('gurps.modifiers.pdf.rapidStrike')}]`
  },

  get RangedMods() {
    const useOnTarget = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_ON_TARGET)

    return (
      `[+1 ${i18n('gurps.modifiers.aim')}] [PDF:${i18n('gurps.modifiers.pdf.aim')}]
      [–2 ${i18n('gurps.modifiers.popup')}] [PDF:${i18n('gurps.modifiers.pdf.popup')}]` +
      (useOnTarget
        ? `
${horiz(i18n('gurps.modifiers.onTargetAiming'))}
[+2 ${i18n('gurps.modifiers.aoaRanged')}] [PDF:${i18n('gurps.modifiers.pdf.aoaRanged')}]
[+1 ${i18n('gurps.modifiers.committedRanged')}] [PDF:${i18n('gurps.modifiers.pdf.committedRanged')}]
[+4 ${i18n('gurps.modifiers.allOutAim')}] [PDF:${i18n('gurps.modifiers.pdf.allOutAim')}]
[+2 ${i18n('gurps.modifiers.allOutAimBraced')}] [PDF:${i18n('gurps.modifiers.pdf.allOutAimBraced')}]
[+2 ${i18n('gurps.modifiers.committedAim')}] [PDF:${i18n('gurps.modifiers.pdf.committedAim')}]
[+1 ${i18n('gurps.modifiers.committedAimBraced')}] [PDF:${i18n('gurps.modifiers.pdf.committedAimBraced')}]`
        : `
[+1 ${i18n('gurps.modifiers.aoaRangedDetermined')}] [PDF:${i18n('gurps.modifiers.pdf.aoaRangedDetermined')}]`)
    )
  },

  get DefenseMods() {
    const useOnTarget = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_ON_TARGET)

    return `[+2 ${i18n('gurps.modifiers.aodIncreased')}] [PDF:${i18n('gurps.modifiers.pdf.aodIncreased')}]
    [+1 ${i18n('gurps.modifiers.shieldDB')}] [PDF:${i18n('gurps.modifiers.pdf.shieldDB')}]
    [+2 ${i18n('gurps.modifiers.dodgeAcrobatic')}] [PDF:${i18n('gurps.modifiers.pdf.dodgeAcrobatic')}]
    [+3 ${i18n('gurps.modifiers.dodgeAndDrop')}] [PDF:${i18n('gurps.modifiers.pdf.dodgeAndDrop')}]
    [+3 ${i18n('gurps.modifiers.dodgeRetreat')}] [PDF:${i18n('gurps.modifiers.pdf.dodgeRetreat')}]
    [+1 ${i18n('gurps.modifiers.blockRetreat')}] [PDF:${i18n('gurps.modifiers.pdf.blockRetreat')}]
    [+3 ${i18n('gurps.modifiers.fencingRetreat')}] [PDF:${i18n('gurps.modifiers.pdf.fencingRetreat')}]
    [+1 ${i18n('gurps.modifiers.defensiveDefense')}] [PDF:${i18n('gurps.modifiers.pdf.defensiveDefense')}]
    ${
      useOnTarget
        ? `[-2 ${i18n('gurps.modifiers.committedAimDefense')}] [PDF:${i18n('gurps.modifiers.pdf.committedAimDefense')}]`
        : ''
    }
    ${
      useOnTarget
        ? `[-2 ${i18n('gurps.modifiers.committedAttackRanged')}] [PDF:${i18n(
            'gurps.modifiers.pdf.committedAttackRanged'
          )}]`
        : ''
    }
    [-2 ${i18n('gurps.modifiers.dodgeAcrobaticFail')}] [PDF:${i18n('gurps.modifiers.pdf.dodgeAcrobaticFail')}]
    [-2 ${i18n('gurps.modifiers.defenseSide')}] [PDF:${i18n('gurps.modifiers.pdf.defenseSide')}]
    [-1 ${i18n('gurps.modifiers.deceptiveDefense')}] [PDF:${i18n('gurps.modifiers.pdf.deceptiveDefense')}]
    [–1 ${i18n('gurps.modifiers.riposte')}] [PDF:${i18n('gurps.modifiers.pdf.riposte')}]`
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
  /**
		  return `[+1 ${i18n('GURPS.modifierGMSaidSo')}]
		  [-1 ${i18n('GURPS.modifierGMSaidSo')}]
		  [+4 ${i18n('GURPS.modifierGMBlessed')}]
		  [-4 ${i18n('GURPS.modifierGMDontTry')}]`
		},
		*/

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
      `-3 ${i18n('GURPS.modifierLightDeepTwilight')}`,
      `-4 ${i18n('GURPS.modifierLightFullMoon')}`,
      `-5 ${i18n('GURPS.modifierLightHalfMoon')}`,
      `-6 ${i18n('GURPS.modifierLightQuarterMoon')}`,
      `-7 ${i18n('GURPS.modifierLightStarlight')}`,
      `-8 ${i18n('GURPS.modifierLightStarlightClouds')}`,
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

  get ExtraEffortModifiers() {
    return [
      i18n('gurps.modifiers.extraEffort'),
      `+2 ${i18n('gurps.modifiers.feverishDefense')} *Cost 1FP`,
      `+2 ${i18n('gurps.modifiers.mightyBlow')} *Cost 1FP`,
      `+0 ${i18n('gurps.modifiers.heroicCharge')} *Cost 1FP`,
      `-3 penalty for Rapid Strike (Flurry of Blows) *Cost 1FP`,
    ]
  },
}
