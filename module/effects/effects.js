import * as Settings from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'
import { MOVE_ONE, MOVE_NONE, MOVE_ONETHIRD, MOVE_TWOTHIRDS, PROPERTY_MOVEOVERRIDE_POSTURE } from '../actor/maneuver.js'

export class StatusEffect {
  static SETTING_USE_ACTIVE_EFFECTS = 'use-active-effects'

  static useActiveEffects() {
    return game.settings.get(Settings.SYSTEM_NAME, StatusEffect.SETTING_USE_ACTIVE_EFFECTS)
  }

  constructor() {
    Hooks.once('init', this._initialize.bind(this))
  }

  _initialize() {
    this._registerSetting()

    GURPS.SavedStatusEffects = CONFIG.statusEffects
    GURPS.StatusEffectStanding = 'standing'
    GURPS.StatusEffectStandingLabel = 'GURPS.statuses.Standing'

    this.useActiveEffects = true // StatusEffect.useActiveEffects()
    this._statusEffects = {}

    for (const key in this.rawStatusEffects) {
      let value = this.rawStatusEffects[key]
      if (this.useActiveEffects) {
        let activeEffectData = _getActiveEffectsData(key)
        value = foundry.utils.mergeObject(value, activeEffectData)
      }
      this._statusEffects[key] = value
    }
    // Hack to add back in 'dead' status (to allow dead icon to show on token)
    this._statusEffects['dead'] = { id: 'dead', name: 'EFFECT.StatusDead', img: 'icons/svg/skull.svg' }

    // replace standard effects
    CONFIG.statusEffects = this.effects()
  }

  _registerSetting() {
    game.settings.register(Settings.SYSTEM_NAME, StatusEffect.SETTING_USE_ACTIVE_EFFECTS, {
      name: i18n('GURPS.settingActiveEffects'),
      hint: i18n('GURPS.settingHintActiveEffects'),
      scope: 'world',
      config: false, // TODO when everything is ready change this to 'true' to allow end user to configure
      type: Boolean,
      default: false,
      onChange: value => console.log(`${StatusEffect.SETTING_USE_ACTIVE_EFFECTS} : ${value}`),
    })

    Hooks.on('createActiveEffect', args => {
      // console.log(args)
    })
  }

  effects() {
    return Object.values(this._statusEffects)
  }

  lookup(id) {
    return this._statusEffects[id]
  }

  getAllPostures() {
    let postures = Object.keys(this._statusEffects).reduce((accumulator, key) => {
      if (foundry.utils.getProperty(this._statusEffects[key], 'flags.gurps.effect.type') == 'posture')
        accumulator[key] = this._statusEffects[key]
      return accumulator
    }, {})
    return postures
  }

  get rawStatusEffects() {
    const taggedModifiersSetting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
    const defenseTag = taggedModifiersSetting.allDefenseRolls.split(',')[0]
    const meleeTag = taggedModifiersSetting.allMeleeRolls.split(',')[0]
    const rangedTag = taggedModifiersSetting.allRangedRolls.split(',')[0]

    const getTaggedValue = (key, tags) => {
      const t = tags.map(tag => `#${tag}`).join(' ')
      return `${key} ${t} @combatmod`
    }

    return {
      prone: {
        img: 'systems/gurps/icons/statuses/dd-condition-prone.webp',
        id: 'prone',
        name: 'GURPS.statuses.Prone',
        // I'm sneakily using ActiveEffects to implement postures even if the system setting is turned off.
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneDefend', [defenseTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneMelee', [meleeTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneRanged', [rangedTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.posture',
            value: 'prone',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONE,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
            priority: 10,
          },
        ],
        flags: {
          gurps: {
            effect: { pdfref: 'GURPS.pdf.PostureLyingDown', type: 'posture' },
          },
        },
      },
      kneel: {
        img: 'systems/gurps/icons/statuses/condition-kneel.webp',
        id: 'kneel',
        name: 'GURPS.statuses.Kneel',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelDefend', [defenseTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelMelee', [meleeTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureCrouchRanged', [rangedTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONETHIRD,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'system.conditions.posture',
            value: 'kneel',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
        ],
        flags: {
          gurps: {
            effect: { pdfref: 'GURPS.pdf.PostureKneeling', type: 'posture' },
          },
        },
      },
      crouch: {
        img: 'systems/gurps/icons/statuses/condition-crouch.webp',
        id: 'crouch',
        name: 'GURPS.statuses.Crouch',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureCrouchMelee', [meleeTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureCrouchRanged', [rangedTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_TWOTHIRDS,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'system.conditions.posture',
            value: 'crouch',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
        ],
        flags: {
          gurps: {
            effect: { type: 'posture', pdfref: 'GURPS.pdf.PostureCrouching' },
          },
        },
      },
      sit: {
        img: 'systems/gurps/icons/statuses/condition-sit.webp',
        id: 'sit',
        name: 'GURPS.statuses.Sit',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelMelee', [meleeTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelDefend', [defenseTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneRanged', [rangedTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_NONE,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'system.conditions.posture',
            value: 'sit',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
        ],
        flags: {
          gurps: {
            effect: { type: 'posture', pdfref: 'GURPS.pdf.PostureSitting' },
          },
        },
      },
      crawl: {
        img: 'systems/gurps/icons/statuses/condition-crawl.webp',
        id: 'crawl',
        name: 'GURPS.statuses.Crawling',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneMelee', [meleeTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneDefend', [defenseTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneRanged', [rangedTag]),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONETHIRD,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'system.conditions.posture',
            value: 'crawl',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
        ],
        flags: {
          gurps: {
            effect: { type: 'posture', pdfref: 'GURPS.pdf.PostureCrawling' },
          },
        },
      },
      grapple: {
        img: 'systems/gurps/icons/statuses/path-condition-grappled.webp',
        id: 'grapple',
        name: 'GURPS.statuses.Grapple',
      },
      stun: {
        img: 'systems/gurps/icons/statuses/dd-condition-stunned.webp',
        id: 'stun',
        name: 'EFFECT.StatusStunned',
        tint: '', // #FEAEF4 #AEFEAE
      },
      mentalstun: {
        img: 'systems/gurps/icons/statuses/dd-condition-stunned-iq.webp',
        id: 'mentalstun',
        name: 'GURPS.statuses.StunnedMental',
        tint: '', // #FEAEF4 #AEFEAE
      },
      shock1: {
        img: 'systems/gurps/icons/statuses/condition-shock1.webp',
        id: 'shock1',
        name: 'GURPS.shock1',
      },
      shock2: {
        img: 'systems/gurps/icons/statuses/condition-shock2.webp',
        id: 'shock2',
        name: 'GURPS.shock2',
      },
      shock3: {
        img: 'systems/gurps/icons/statuses/condition-shock3.webp',
        id: 'shock3',
        name: 'GURPS.shock3',
      },
      shock4: {
        img: 'systems/gurps/icons/statuses/condition-shock4.webp',
        id: 'shock4',
        name: 'GURPS.shock4',
      },
      reeling: {
        img: 'systems/gurps/icons/statuses/cth-condition-major-wound.webp',
        id: 'reeling',
        name: 'GURPS.statuses.Reeling',
        changes: [
          {
            key: 'system.conditions.reeling',
            value: true,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
        ],
        flags: {
          gurps: {
            effect: {
              pdfref: 'GURPS.pdf.Reeling',
              // terminateActions: [
              //   {
              //     type: 'chat',
              //     msg: 'GURPS.nameNoLongerReeling',
              //     args: { name: '@displayname' },
              //   },
              // ],
            },
          },
        },
      },
      exhausted: {
        img: 'systems/gurps/icons/statuses/path-condition-exhausted.webp',
        id: 'exhausted',
        name: 'GURPS.statuses.Exhausted',
        changes: [
          {
            key: 'system.conditions.exhausted',
            value: true,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'system.attributes.ST.import',
            value: 0.5,
            mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
          },
        ],
        flags: {
          gurps: {
            effect: {
              pdfref: 'GURPS.pdf.Tired',
            },
          },
        },
      },
      fly: {
        img: 'systems/gurps/icons/statuses/x-flying.webp',
        id: 'fly',
        name: 'GURPS.statuses.Fly',
      },
      fall: {
        img: 'systems/gurps/icons/statuses/condition-fall.webp',
        id: 'fall',
        name: 'GURPS.statuses.Fall',
      },
      pinned: {
        img: 'systems/gurps/icons/statuses/path-condition-pinned.webp',
        id: 'pinned',
        name: 'GURPS.statuses.Pin',
      },
      nauseated: {
        img: 'systems/gurps/icons/statuses/path-condition-nauseated.webp',
        id: 'nauseated',
        name: 'GURPS.statuses.Nauseated',
      },
      coughing: {
        img: 'systems/gurps/icons/statuses/condition-cough.webp',
        id: 'coughing',
        name: 'GURPS.statuses.Coughing',
      },
      retching: {
        img: 'systems/gurps/icons/statuses/condition-wretch.webp',
        id: 'retching',
        name: 'GURPS.statuses.Retching',
      },
      drowsy: {
        img: 'systems/gurps/icons/statuses/x-drowsy.webp',
        id: 'drowsy',
        name: 'GURPS.statuses.Drowsy',
      },
      sleeping: {
        img: 'systems/gurps/icons/statuses/x-asleep.webp',
        id: 'sleeping',
        name: 'GURPS.statuses.Sleep',
      },
      tipsy: {
        img: 'systems/gurps/icons/statuses/condition-drunk1.webp',
        id: 'tipsy',
        name: 'GURPS.statuses.Tipsy',
      },
      drunk: {
        img: 'systems/gurps/icons/statuses/condition-drunk2.webp',
        id: 'drunk',
        name: 'GURPS.statuses.Drunk',
      },
      euphoria: {
        img: 'systems/gurps/icons/statuses/path-condition-fascinated.webp',
        id: 'euphoria',
        name: 'GURPS.statuses.Euphoria',
      },
      mild_pain: {
        // README No such condition in Basic -- map to Moderate Pain with HPT?
        img: 'systems/gurps/icons/statuses/condition-pain1.webp',
        id: 'mild_pain',
        name: 'GURPS.statuses.MildPain',
      },
      moderate_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain2.webp',
        id: 'moderate_pain',
        name: 'GURPS.statuses.ModeratePain2',
      },
      moderate_pain2: {
        // README No such condition in Basic -- map to Terrible Pain with HPT?
        img: 'systems/gurps/icons/statuses/condition-pain3.webp',
        id: 'moderate_pain2',
        name: 'GURPS.statuses.ModeratePain3',
      },
      severe_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain4.webp',
        id: 'severe_pain',
        name: 'GURPS.statuses.SeverePain4',
      },
      severe_pain2: {
        img: 'systems/gurps/icons/statuses/condition-pain5.webp',
        id: 'severe_pain2',
        name: 'GURPS.statuses.SeverePain5',
      },
      terrible_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain6.webp',
        id: 'terrible_pain',
        name: 'GURPS.statuses.TerriblePain',
      },
      agony: {
        img: 'systems/gurps/icons/statuses/path-condition-helpless.webp',
        id: 'agony',
        name: 'GURPS.statuses.Agony',
      },
      bleed: {
        img: 'systems/gurps/icons/statuses/path-condition-bleeding.webp',
        id: 'bleed',
        name: 'GURPS.statuses.Bleed',
      },
      poison: {
        img: 'systems/gurps/icons/statuses/dd-condition-poisoned.webp',
        id: 'poison',
        name: 'GURPS.statuses.Poison',
      },
      burn: {
        img: 'systems/gurps/icons/statuses/x-burning.webp',
        id: 'burn',
        name: 'GURPS.statuses.Burn',
      },
      suffocate: {
        img: 'systems/gurps/icons/statuses/condition-suffocate.webp',
        id: 'suffocate',
        name: 'GURPS.statuses.Suffocate',
      },
      disabled: {
        img: 'systems/gurps/icons/statuses/dd-condition-unconscious.webp',
        id: 'disabled',
        name: 'GURPS.statuses.Disable',
      },
      blind: {
        img: 'systems/gurps/icons/statuses/dd-condition-blinded.webp',
        id: 'blind',
        name: 'GURPS.statuses.Blind',
      },
      deaf: {
        img: 'systems/gurps/icons/statuses/dd-condition-deafened.webp',
        id: 'deaf',
        name: 'GURPS.statuses.Deaf',
      },
      silence: {
        img: 'systems/gurps/icons/statuses/x-silenced.webp',
        id: 'silence',
        name: 'GURPS.statuses.Silence',
      },
      stealth: {
        img: 'systems/gurps/icons/statuses/x-stealth.webp',
        id: 'stealth',
        name: 'GURPS.statuses.Stealth',
      },
      waiting: {
        img: 'systems/gurps/icons/statuses/x-low-light-vision.webp',
        id: 'waiting',
        name: 'GURPS.statuses.Wait',
      },
      sprint: {
        img: 'systems/gurps/icons/statuses/x-haste.webp',
        id: 'sprint',
        name: 'GURPS.statuses.Sprint',
      },
      num1: {
        img: 'systems/gurps/icons/statuses/number-1.webp',
        id: 'num1',
        name: 'GURPS.statuses.Counter1',
      },
      num2: {
        img: 'systems/gurps/icons/statuses/number-2.webp',
        id: 'num2',
        name: 'GURPS.statuses.Counter2',
      },
      num3: {
        img: 'systems/gurps/icons/statuses/number-3.webp',
        id: 'num3',
        name: 'GURPS.statuses.Counter3',
      },
      num4: {
        img: 'systems/gurps/icons/statuses/number-4.webp',
        id: 'num4',
        name: 'GURPS.statuses.Counter4',
      },
      num5: {
        img: 'systems/gurps/icons/statuses/number-5.webp',
        id: 'num5',
        name: 'GURPS.statuses.Counter5',
      },
      num6: {
        img: 'systems/gurps/icons/statuses/number-6.webp',
        id: 'num6',
        name: 'GURPS.statuses.Counter6',
      },
      num7: {
        img: 'systems/gurps/icons/statuses/number-7.webp',
        id: 'num7',
        name: 'GURPS.statuses.Counter7',
      },
      num8: {
        img: 'systems/gurps/icons/statuses/number-8.webp',
        id: 'num8',
        name: 'GURPS.statuses.Counter8',
      },
      num9: {
        img: 'systems/gurps/icons/statuses/number-9.webp',
        id: 'num9',
        name: 'GURPS.statuses.Counter9',
      },
      num10: {
        img: 'systems/gurps/icons/statuses/number-10.webp',
        id: 'num10',
        name: 'GURPS.statuses.Counter10',
      },
      'bad+1': {
        img: 'systems/gurps/icons/statuses/BAD+1.webp',
        id: 'bad+1',
        name: 'GURPS.statuses.Bad+1',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad+1',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+2': {
        img: 'systems/gurps/icons/statuses/BAD+2.webp',
        id: 'bad+2',
        name: 'GURPS.statuses.Bad+2',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad+2',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+3': {
        img: 'systems/gurps/icons/statuses/BAD+3.webp',
        id: 'bad+3',
        name: 'GURPS.statuses.Bad+3',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad+3',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+4': {
        img: 'systems/gurps/icons/statuses/BAD+4.webp',
        id: 'bad+4',
        name: 'GURPS.statuses.Bad+4',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad+4',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+5': {
        img: 'systems/gurps/icons/statuses/BAD+5.webp',
        id: 'bad+5',
        name: 'GURPS.statuses.Bad+5',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad+5',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-1': {
        img: 'systems/gurps/icons/statuses/BAD-1.webp',
        id: 'bad-1',
        name: 'GURPS.statuses.Bad-1',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad-1',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-2': {
        img: 'systems/gurps/icons/statuses/BAD-2.webp',
        id: 'bad-2',
        name: 'GURPS.statuses.Bad-2',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad-2',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-3': {
        img: 'systems/gurps/icons/statuses/BAD-3.webp',
        id: 'bad-3',
        name: 'GURPS.statuses.Bad-3',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad-3',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-4': {
        img: 'systems/gurps/icons/statuses/BAD-4.webp',
        id: 'bad-4',
        name: 'GURPS.statuses.Bad-4',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad-4',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-5': {
        img: 'systems/gurps/icons/statuses/BAD-5.webp',
        id: 'bad-5',
        name: 'GURPS.statuses.Bad-5',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.statuses.Bad-5',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      disarmed: {
        img: 'systems/gurps/icons/statuses/disarmed.webp',
        id: 'disarmed',
        name: 'GURPS.statuses.Disarmed',
      },
    }
  }
}

const _getActiveEffectsData = function (id) {
  const taggedModifiersSetting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
  const hitTag = taggedModifiersSetting.allAttackRolls.split(',')[0]
  const defenseTag = taggedModifiersSetting.allDefenseRolls.split(',')[0]
  const dxTag = taggedModifiersSetting.allDXRolls.split(',')[0]
  const iqTag = taggedModifiersSetting.allIQRolls.split(',')[0]
  const attributesTag = taggedModifiersSetting.allAttributesRolls.split(',')[0]
  const perTag = taggedModifiersSetting.allPERRolls.split(',')[0]
  const crTag = taggedModifiersSetting.allCRRolls.split(',')[0]
  const spellTag = taggedModifiersSetting.allSpellRolls.split(',')[0]
  const skillTag = taggedModifiersSetting.allSkillRolls.split(',')[0]

  const activeEffectsData = {
    shock1: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock1',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdf.Shock' },
        },
      },
    },
    shock2: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock2',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdf.Shock' },
        },
      },
    },
    shock3: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock3',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdf.Shock' },
        },
      },
    },
    shock4: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock4',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdf.Shock' },
        },
      },
    },
    stun: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusStunned',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [defenseTag],
        },
        {
          key: 'system.conditions.maneuver',
          value: 'do_nothing',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        },
      ],
      flags: {
        gurps: {
          effect: {
            endCondition: 'HT', // may move to 'IQ' (mental stun)
            pdfref: 'GURPS.pdf.KnockdownStun',
            requiresConfig: true,
          },
        },
      },
    },
    mentalstun: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusStunned',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [defenseTag],
        },
        {
          key: 'system.conditions.maneuver',
          value: 'do_nothing',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        },
      ],
      flags: {
        gurps: {
          effect: {
            endCondition: 'IQ', // may move to 'IQ' (mental stun)
            pdfref: 'GURPS.pdf.KnockdownStun',
            requiresConfig: true,
          },
        },
      },
    },
    grapple: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierGrappling',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag],
        },
      ],
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdf.Grappling', requiresConfig: true },
        },
      },
    },
    nauseated: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionNausea',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [attributesTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionNauseaDef',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [defenseTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardNausea' },
        },
      },
    },
    coughing: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionCough',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionCoughIQ',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [iqTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardCoughing' },
        },
      },
    },
    retching: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionRetch',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, perTag],
        },
      ],
      flags: {
        gurps: {
          effect: {
            pdfref: 'GURPS.pdf.HazardRetching',
            terminateActions: [{ type: 'otf', args: '/fp -1' }], // TODO put in chat when followups are activated
            requiresConfig: true,
          },
        },
      },
    },
    drowsy: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionDrowsy',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, perTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardDrowsy' },
        },
      },
    },
    tipsy: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTipsy',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTipsyCR',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardTipsy"' },
        },
      },
    },
    drunk: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionDrunk',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionDrunkCR',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardDrunk' },
        },
      },
    },
    euphoria: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionEuphoria',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardEuphoria' },
        },
      },
    },
    mild_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionModerateHPT',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardPain' },
        },
      },
    },
    moderate_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionModerate',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardPain' },
        },
      },
    },
    moderate_pain2: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTerribleHPT',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flag: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardPain' },
        },
      },
    },
    severe_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionSevere',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardPain' },
        },
      },
    },
    terrible_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTerrible',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdf.HazardPain' },
        },
      },
    },
    suffocate: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierSuffocate',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: {
            pdfref: 'GURPS.pdf.Suffocation',
            requiresConfig: true,
          },
        },
      },
    },
    blind: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifiersBlindAttack',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [hitTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifiersBlindDefend',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          tags: [defenseTag],
        },
      ],
      flags: {
        gurps: {
          effect: {
            requiresConfig: true,
            pdfref: 'GURPS.pdf.Visibility',
            // TODO implement configHint
            configHint: 'GURPS.effectHintBlind',
          },
        },
      },
    },
  }

  let data = activeEffectsData[id]
  data?.changes.map(change => {
    const tags = [`#${id}`, ...(change.tags || []).map(tag => `#${tag}`)].join(' ')
    change.value = `${change.value} ${tags} @combatmod`
    return change
  })
  return data
}

export const GURPSActiveEffectsChanges = {
  'system.conditions.exhausted': 'GURPS.exhausted',
  'system.conditions.maneuver': 'GURPS.maneuver',
  'system.conditions.posture': 'GURPS.posture',
  'system.conditions.reeling': 'GURPS.reeling',
  'system.conditions.self.modifiers': 'GURPS.selfModifiers',
  'system.conditions.target.modifiers': 'GURPS.targetModifiers',
  'system.moveoverride.maneuver': 'GURPS.moveManeuver',
  'system.moveoverride.posture': 'GURPS.movePosture',
  'system.attributes.ST.import': 'GURPS.strength',
}
