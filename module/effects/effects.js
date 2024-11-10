import { SYSTEM_NAME } from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'
import { MOVE_ONE, MOVE_NONE, MOVE_ONETHIRD, MOVE_TWOTHIRDS, PROPERTY_MOVEOVERRIDE_POSTURE } from '../actor/maneuver.js'

export class StatusEffect {
  static SETTING_USE_ACTIVE_EFFECTS = 'use-active-effects'

  static useActiveEffects() {
    return game.settings.get(SYSTEM_NAME, StatusEffect.SETTING_USE_ACTIVE_EFFECTS)
  }

  constructor() {
    Hooks.once('init', this._initialize.bind(this))
  }

  _initialize() {
    this._registerSetting()

    GURPS.SavedStatusEffects = CONFIG.statusEffects
    GURPS.StatusEffectStanding = 'standing'
    GURPS.StatusEffectStandingLabel = 'GURPS.STATUSStanding'

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
    game.settings.register(SYSTEM_NAME, StatusEffect.SETTING_USE_ACTIVE_EFFECTS, {
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
    return {
      prone: {
        img: 'systems/gurps/icons/statuses/dd-condition-prone.webp',
        id: 'prone',
        name: 'GURPS.STATUSProne',
        // I'm sneakily using ActiveEffects to implement postures even if the system setting is turned off.
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: 'GURPS.modifierPostureProneRanged',
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
            effect: { pdfref: 'GURPS.pdfPostureLyingDown', type: 'posture' },
          },
        },
      },
      kneel: {
        img: 'systems/gurps/icons/statuses/condition-kneel.webp',
        id: 'kneel',
        name: 'GURPS.STATUSKneel',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: 'GURPS.modifierPostureCrouchRanged',
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
            effect: { pdfref: 'GURPS.pdfPostureKneeling', type: 'posture' },
          },
        },
      },
      crouch: {
        img: 'systems/gurps/icons/statuses/condition-crouch.webp',
        id: 'crouch',
        name: 'GURPS.STATUSCrouch',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureCrouchMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: 'GURPS.modifierPostureCrouchRanged',
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
            effect: { type: 'posture', pdfref: 'GURPS.pdfPostureCrouching' },
          },
        },
      },
      sit: {
        img: 'systems/gurps/icons/statuses/condition-sit.webp',
        id: 'sit',
        name: 'GURPS.STATUSSit',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: 'GURPS.modifierPostureProneRanged',
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
            effect: { type: 'posture', pdfref: 'GURPS.pdfPostureSitting' },
          },
        },
      },
      crawl: {
        img: 'systems/gurps/icons/statuses/condition-crawl.webp',
        id: 'crawl',
        name: 'GURPS.STATUSCrawling',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'system.conditions.target.modifiers',
            value: 'GURPS.modifierPostureProneRanged',
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
            effect: { type: 'posture', pdfref: 'GURPS.pdfPostureCrawling' },
          },
        },
      },
      grapple: {
        img: 'systems/gurps/icons/statuses/path-condition-grappled.webp',
        id: 'grapple',
        name: 'GURPS.STATUSGrapple',
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
        name: 'GURPS.StatusStunnedMental',
        tint: '', // #FEAEF4 #AEFEAE
      },
      shock1: {
        img: 'systems/gurps/icons/statuses/condition-shock1.webp',
        id: 'shock1',
        name: 'EFFECT.StatusShocked',
      },
      shock2: {
        img: 'systems/gurps/icons/statuses/condition-shock2.webp',
        id: 'shock2',
        name: 'EFFECT.StatusShocked',
      },
      shock3: {
        img: 'systems/gurps/icons/statuses/condition-shock3.webp',
        id: 'shock3',
        name: 'EFFECT.StatusShocked',
      },
      shock4: {
        img: 'systems/gurps/icons/statuses/condition-shock4.webp',
        id: 'shock4',
        name: 'EFFECT.StatusShocked',
      },
      reeling: {
        img: 'systems/gurps/icons/statuses/cth-condition-major-wound.webp',
        id: 'reeling',
        name: 'GURPS.STATUSReeling',
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
              pdfref: 'GURPS.pdfReeling',
              // terminateActions: [
              //   {
              //     type: 'chat',
              //     msg: 'GURPS.chatTurnOffReeling',
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
        name: 'GURPS.STATUSExhausted',
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
              pdfref: 'GURPS.pdfTired',
            },
          },
        },
      },
      fly: {
        img: 'systems/gurps/icons/statuses/x-flying.webp',
        id: 'fly',
        name: 'GURPS.STATUSFly',
      },
      fall: {
        img: 'systems/gurps/icons/statuses/condition-fall.webp',
        id: 'fall',
        name: 'GURPS.STATUSFall',
      },
      pinned: {
        img: 'systems/gurps/icons/statuses/path-condition-pinned.webp',
        id: 'pinned',
        name: 'GURPS.STATUSPin',
      },
      nauseated: {
        img: 'systems/gurps/icons/statuses/path-condition-nauseated.webp',
        id: 'nauseated',
        name: 'GURPS.STATUSNauseated',
      },
      coughing: {
        img: 'systems/gurps/icons/statuses/condition-cough.webp',
        id: 'coughing',
        name: 'GURPS.STATUSCoughing',
      },
      retching: {
        img: 'systems/gurps/icons/statuses/condition-wretch.webp',
        id: 'retching',
        name: 'GURPS.STATUSRetching',
      },
      drowsy: {
        img: 'systems/gurps/icons/statuses/x-drowsy.webp',
        id: 'drowsy',
        name: 'GURPS.STATUSDrowsy',
      },
      sleeping: {
        img: 'systems/gurps/icons/statuses/x-asleep.webp',
        id: 'sleeping',
        name: 'GURPS.STATUSSleep',
      },
      tipsy: {
        img: 'systems/gurps/icons/statuses/condition-drunk1.webp',
        id: 'tipsy',
        name: 'GURPS.STATUSTipsy',
      },
      drunk: {
        img: 'systems/gurps/icons/statuses/condition-drunk2.webp',
        id: 'drunk',
        name: 'GURPS.STATUSDrunk',
      },
      euphoria: {
        img: 'systems/gurps/icons/statuses/path-condition-fascinated.webp',
        id: 'euphoria',
        name: 'GURPS.STATUSEuphoria',
      },
      mild_pain: {
        // README No such condition in Basic -- map to Moderate Pain with HPT?
        img: 'systems/gurps/icons/statuses/condition-pain1.webp',
        id: 'mild_pain',
        name: 'GURPS.STATUSMildPain',
      },
      moderate_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain2.webp',
        id: 'moderate_pain',
        name: 'GURPS.STATUSModeratePain',
      },
      moderate_pain2: {
        // README No such condition in Basic -- map to Terrible Pain with HPT?
        img: 'systems/gurps/icons/statuses/condition-pain3.webp',
        id: 'moderate_pain2',
        name: 'GURPS.STATUSModeratePain',
      },
      severe_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain4.webp',
        id: 'severe_pain',
        name: 'GURPS.STATUSSeverePain',
      },
      severe_pain2: {
        img: 'systems/gurps/icons/statuses/condition-pain5.webp',
        id: 'severe_pain2',
        name: 'GURPS.STATUSSeverePain',
      },
      terrible_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain6.webp',
        id: 'terrible_pain',
        name: 'GURPS.STATUSTerriblePain',
      },
      agony: {
        img: 'systems/gurps/icons/statuses/path-condition-helpless.webp',
        id: 'agony',
        name: 'GURPS.STATUSAgony',
      },
      bleed: {
        img: 'systems/gurps/icons/statuses/path-condition-bleeding.webp',
        id: 'bleed',
        name: 'GURPS.STATUSBleed',
      },
      poison: {
        img: 'systems/gurps/icons/statuses/dd-condition-poisoned.webp',
        id: 'poison',
        name: 'GURPS.STATUSPoison',
      },
      burn: {
        img: 'systems/gurps/icons/statuses/x-burning.webp',
        id: 'burn',
        name: 'GURPS.STATUSBurn',
      },
      suffocate: {
        img: 'systems/gurps/icons/statuses/condition-suffocate.webp',
        id: 'suffocate',
        name: 'GURPS.STATUSSuffocate',
      },
      disabled: {
        img: 'systems/gurps/icons/statuses/dd-condition-unconscious.webp',
        id: 'disabled',
        name: 'GURPS.STATUSDisable',
      },
      blind: {
        img: 'systems/gurps/icons/statuses/dd-condition-blinded.webp',
        id: 'blind',
        name: 'GURPS.STATUSBlind',
      },
      deaf: {
        img: 'systems/gurps/icons/statuses/dd-condition-deafened.webp',
        id: 'deaf',
        name: 'GURPS.STATUSDeaf',
      },
      silence: {
        img: 'systems/gurps/icons/statuses/x-silenced.webp',
        id: 'silence',
        name: 'GURPS.STATUSSilence',
      },
      stealth: {
        img: 'systems/gurps/icons/statuses/x-stealth.webp',
        id: 'stealth',
        name: 'GURPS.STATUSStealth',
      },
      waiting: {
        img: 'systems/gurps/icons/statuses/x-low-light-vision.webp',
        id: 'waiting',
        name: 'GURPS.STATUSWait',
      },
      sprint: {
        img: 'systems/gurps/icons/statuses/x-haste.webp',
        id: 'sprint',
        name: 'GURPS.STATUSSprint',
      },
      num1: {
        img: 'systems/gurps/icons/statuses/number-1.webp',
        id: 'num1',
        name: 'GURPS.STATUSCounter',
      },
      num2: {
        img: 'systems/gurps/icons/statuses/number-2.webp',
        id: 'num2',
        name: 'GURPS.STATUSCounter',
      },
      num3: {
        img: 'systems/gurps/icons/statuses/number-3.webp',
        id: 'num3',
        name: 'GURPS.STATUSCounter',
      },
      num4: {
        img: 'systems/gurps/icons/statuses/number-4.webp',
        id: 'num4',
        name: 'GURPS.STATUSCounter',
      },
      num5: {
        img: 'systems/gurps/icons/statuses/number-5.webp',
        id: 'num5',
        name: 'GURPS.STATUSCounter',
      },
      num6: {
        img: 'systems/gurps/icons/statuses/number-6.webp',
        id: 'num6',
        name: 'GURPS.STATUSCounter',
      },
      num7: {
        img: 'systems/gurps/icons/statuses/number-7.webp',
        id: 'num7',
        name: 'GURPS.STATUSCounter',
      },
      num8: {
        img: 'systems/gurps/icons/statuses/number-8.webp',
        id: 'num8',
        name: 'GURPS.STATUSCounter',
      },
      num9: {
        img: 'systems/gurps/icons/statuses/number-9.webp',
        id: 'num9',
        name: 'GURPS.STATUSCounter',
      },
      num10: {
        img: 'systems/gurps/icons/statuses/number-10.webp',
        id: 'num10',
        name: 'GURPS.STATUSCounter',
      },
      'bad+1': {
        img: 'systems/gurps/icons/statuses/BAD+1.webp',
        id: 'bad+1',
        name: 'GURPS.STATUSBad+1',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad+1',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+2': {
        img: 'systems/gurps/icons/statuses/BAD+2.webp',
        id: 'bad+2',
        name: 'GURPS.STATUSBad+2',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad+2',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+3': {
        img: 'systems/gurps/icons/statuses/BAD+3.webp',
        id: 'bad+3',
        name: 'GURPS.STATUSBad+3',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad+3',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+4': {
        img: 'systems/gurps/icons/statuses/BAD+4.webp',
        id: 'bad+4',
        name: 'GURPS.STATUSBad+4',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad+4',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad+5': {
        img: 'systems/gurps/icons/statuses/BAD+5.webp',
        id: 'bad+5',
        name: 'GURPS.STATUSBad+5',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad+5',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-1': {
        img: 'systems/gurps/icons/statuses/BAD-1.webp',
        id: 'bad-1',
        name: 'GURPS.STATUSBad-1',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad-1',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-2': {
        img: 'systems/gurps/icons/statuses/BAD-2.webp',
        id: 'bad-2',
        name: 'GURPS.STATUSBad-2',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad-2',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-3': {
        img: 'systems/gurps/icons/statuses/BAD-3.webp',
        id: 'bad-3',
        name: 'GURPS.STATUSBad-3',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad-3',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-4': {
        img: 'systems/gurps/icons/statuses/BAD-4.webp',
        id: 'bad-4',
        name: 'GURPS.STATUSBad-4',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad-4',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      'bad-5': {
        img: 'systems/gurps/icons/statuses/BAD-5.webp',
        id: 'bad-5',
        name: 'GURPS.STATUSBad-5',
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.STATUSBad-5',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
        ],
      },
      disarmed: {
        img: 'systems/gurps/icons/statuses/disarmed.webp',
        id: 'disarmed',
        name: 'GURPS.STATUSDisarmed',
      },
    }
  }
}

const _getActiveEffectsData = function (id) {
  const activeEffectsData = {
    shock1: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock1',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdfShock' },
        },
      },
    },
    shock2: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock2',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdfShock' },
        },
      },
    },
    shock3: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock3',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdfShock' },
        },
      },
    },
    shock4: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusShock4',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      duration: {
        rounds: 1,
      },
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdfShock' },
        },
      },
    },
    stun: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierStatusStunned',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
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
            pdfref: 'GURPS.pdfKnockdownStun',
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
            pdfref: 'GURPS.pdfKnockdownStun',
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
        },
      ],
      flags: {
        gurps: {
          effect: { pdfref: 'GURPS.pdfGrappling', requiresConfig: true },
        },
      },
    },
    nauseated: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionNausea',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionNauseaDef',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardNausea' },
        },
      },
    },
    coughing: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionCough',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionCoughIQ',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardCoughing' },
        },
      },
    },
    retching: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionRetch',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: {
            pdfref: 'GURPS.pdfHazardRetching',
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
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardDrowsy' },
        },
      },
    },
    tipsy: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTipsy',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTipsyCR',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardTipsy"' },
        },
      },
    },
    drunk: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionDrunk',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionDrunkCR',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardDrunk' },
        },
      },
    },
    euphoria: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionEuphoria',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardEuphoria' },
        },
      },
    },
    mild_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionModerateHPT',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardPain' },
        },
      },
    },
    moderate_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionModerate',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardPain' },
        },
      },
    },
    moderate_pain2: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTerribleHPT',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flag: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardPain' },
        },
      },
    },
    severe_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionSevere',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardPain' },
        },
      },
    },
    terrible_pain: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTerrible',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardPain' },
        },
      },
    },
    suffocate: {
      flags: {
        gurps: {
          effect: {
            pdfref: 'GURPS.pdfSuffocation',
            everyturn: { type: 'otf', args: '/fp -1' }, // TODO implement everyturn
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
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifiersBlindDefend',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
      ],
      flags: {
        gurps: {
          effect: {
            requiresConfig: true,
            pdfref: 'GURPS.pdfVisibility',
            // TODO implement configHint
            configHint: 'GURPS.effectHintBlind',
          },
        },
      },
    },
  }

  let data = activeEffectsData[id]
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
