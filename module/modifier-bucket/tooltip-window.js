import { displayMod, horiz, i18n } from '../../lib/utilities.js'
import { parselink } from '../../lib/parselink.js'
import * as HitLocations from '../hitlocation/hitlocation.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import ModifierBucketJournals from './select-journals.js'

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

    return mergeObject(super.defaultOptions, {
      id: 'ModifierBucketEditor',
      template: 'systems/gurps/templates/modifier-bucket/tooltip-window.html',
      minimizable: false,
      width: 820,
      scale: scale,
      classes: ['modifier-bucket'],
    })
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
    let modifierJournalIds = ModifierBucketJournals.getJournalIds()
    let journals = Array.from(game.journal)
      .filter(it => modifierJournalIds.includes(it.id))
      .map(it => game.journal.get(it.id))
    journals = journals.filter(it => it.testUserPermission(game.user, CONST.ENTITY_PERMISSIONS.OBSERVER))
    return journals
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
    data.speedrangemods = ['Speed / Range'].concat(GURPS.rangeObject.modifiers)
    data.actorname = !!GURPS.LastActor ? GURPS.LastActor.name : 'No active character!'
    data.othermods1 = ModifierLiterals.OtherMods1.split('\n')
    data.othermods2 = ModifierLiterals.OtherMods2.split('\n')
    data.cansend = game.user?.isGM || game.user?.isRole('TRUSTED') || game.user?.isRole('ASSISTANT')
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
    data.currentmods = []

    if (!!GURPS.LastActor) {
      let melee = []
      let ranged = []
      let defense = []
      let gen = []

      let effects = GURPS.LastActor.effects.filter(e => !e.data.disabled)
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
      let bucketTop = x.position().top
      let bucketLeft = x.position().left
      let bucketWidth = 70

      let width = parseFloat(html.css('width').replace('px', ''))
      let left = bucketLeft + bucketWidth / 2 - width / 2
      console.log(`bucketLeft: ${bucketLeft}; width: ${width}; left: ${left}`)
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

    GURPS.hookupGurps(html, this)
    // Support RMB on Tooltip window
    html.find('.gurpslink').contextmenu(GURPS.onRightClickGurpslink)
    html.find('.glinkmod').contextmenu(GURPS.onRightClickGurpslink)
    html.find('.glinkmodplus').contextmenu(GURPS.onRightClickGurpslink)
    html.find('.glinkmodminus').contextmenu(GURPS.onRightClickGurpslink)
    html.find('.pdflink').contextmenu(event => {
      event.preventDefault()
      let el = event.currentTarget
      GURPS.whisperOtfToOwner('PDF:' + el.innerText, null, event, false, GURPS.LastActor)
    })


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
    let parsed = parselink(element.value)
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
    return `[+4 ${i18n('GURPS.modifierDeterminedAttack')}] [PDF:${i18n('GURPS.pdfDeterminedAttack')}]
    [+4 ${i18n('GURPS.modifierTelegraphicAttack')}] [PDF:${i18n('GURPS.pdfTelegraphicAttack')}]
    [-2 ${i18n('GURPS.modifierDeceptiveAttack')}] [PDF:${i18n('GURPS.pdfDeceptiveAttack')}]
    [-4 ${i18n('GURPS.modifierMoveAttack')} *Max:9] [PDF:${i18n('GURPS.pdfMoveAttack')}]
    [+2 ${i18n('GURPS.modifierStrongAttack')}] [PDF:${i18n('GURPS.pdfStrongAttack')}]
    ${horiz(i18n('GURPS.modifierExtraEffort'))} [PDF:${i18n('GURPS.pdfExtraEffort')}]
    [+2 ${i18n('GURPS.modifierMightyBlow')} *Cost 1FP] [PDF:${i18n('GURPS.pdfMightyBlow')}]
    [+0 ${i18n('GURPS.modifierHeroicCharge')} *Cost 1FP] [PDF:${i18n('GURPS.pdfHeroicCharge')}]`
  },

  get RangedMods() {
    return `[+1 ${i18n('GURPS.aim')}]
    [+1 ${i18n('GURPS.modifierDeterminedAttack')}] [PDF:${i18n('GURPS.pdfDeterminedAttack')}]
    ${horiz(i18n('GURPS.actions'))}
    [${i18n('GURPS.modifierWillCheck')}]`
  },

  get DefenseMods() {
    return `[+2 ${i18n('GURPS.allOutDefense')}] [PDF:${i18n('GURPS.pdfAllOutDefense')}]
    [+1 ${i18n('GURPS.modifierShieldDB')}] [PDF:${i18n('GURPS.pdfShieldDB')}]
    [+2 ${i18n('GURPS.modifierDodgeAcrobatic')}] [PDF:${i18n('GURPS.pdfDodgeAcrobatic')}]
    [+3 ${i18n('GURPS.modifierDodgeDive')}] [PDF:${i18n('GURPS.pdfDodgeDive')}]
    [+3 ${i18n('GURPS.modifierDodgeRetreat')}] [PDF:${i18n('GURPS.pdfDodgeRetreat')}]
    [+1 ${i18n('GURPS.modifierBlockRetreat')}] [PDF:${i18n('GURPS.pdfBlockRetreat')}]
    [-2 ${i18n('GURPS.modifierDodgeFailedAcro')}] [PDF:${i18n('GURPS.pdfDodgeFailedAcro')}]
    [-2 ${i18n('GURPS.modifierDodgeSide')}] [PDF:${i18n('GURPS.pdfDodgeSide')}]
    [-4 ${i18n('GURPS.modifierDodgeRear')}] [PDF:${i18n('GURPS.pdfDodgeRear')}]
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
