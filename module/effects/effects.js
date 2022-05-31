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
        icon: 'systems/gurps/icons/statuses/dd-condition-prone.webp',
        id: 'prone',
        label: 'GURPS.STATUSProne',
        // I'm sneakily using ActiveEffects to implement postures even if the system setting is turned off.
        changes: [
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.target.modifiers',
            value: 'GURPS.modifierPostureProneRanged',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.posture',
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
        icon: 'systems/gurps/icons/statuses/condition-kneel.webp',
        id: 'kneel',
        label: 'GURPS.STATUSKneel',
        changes: [
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.target.modifiers',
            value: 'GURPS.modifierPostureCrouchRanged',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONETHIRD,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'data.conditions.posture',
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
        icon: 'systems/gurps/icons/statuses/condition-crouch.webp',
        id: 'crouch',
        label: 'GURPS.STATUSCrouch',
        changes: [
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureCrouchMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.target.modifiers',
            value: 'GURPS.modifierPostureCrouchRanged',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_TWOTHIRDS,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'data.conditions.posture',
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
        icon: 'systems/gurps/icons/statuses/condition-sit.webp',
        id: 'sit',
        label: 'GURPS.STATUSSit',
        changes: [
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureKneelDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.target.modifiers',
            value: 'GURPS.modifierPostureProneRanged',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_NONE,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'data.conditions.posture',
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
        icon: 'systems/gurps/icons/statuses/condition-crawl.webp',
        id: 'crawl',
        label: 'GURPS.STATUSCrawling',
        changes: [
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneMelee',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.self.modifiers',
            value: 'GURPS.modifierPostureProneDefend',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: 'data.conditions.target.modifiers',
            value: 'GURPS.modifierPostureProneRanged',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONETHIRD,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'data.conditions.posture',
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
        icon: 'systems/gurps/icons/statuses/path-condition-grappled.webp',
        id: 'grapple',
        label: 'GURPS.STATUSGrapple',
      },
      stun: {
        icon: 'systems/gurps/icons/statuses/dd-condition-stunned.webp',
        id: 'stun',
        label: 'EFFECT.StatusStunned',
        tint: '', // #FEAEF4 #AEFEAE
      },
      mentalstun: {
        icon: 'systems/gurps/icons/statuses/dd-condition-stunned-iq.webp',
        id: 'mentalstun',
        label: 'GURPS.StatusStunnedMental',
        tint: '', // #FEAEF4 #AEFEAE
      },
      shock1: {
        icon: 'systems/gurps/icons/statuses/condition-shock1.webp',
        id: 'shock1',
        label: 'EFFECT.StatusShocked',
      },
      shock2: {
        icon: 'systems/gurps/icons/statuses/condition-shock2.webp',
        id: 'shock2',
        label: 'EFFECT.StatusShocked',
      },
      shock3: {
        icon: 'systems/gurps/icons/statuses/condition-shock3.webp',
        id: 'shock3',
        label: 'EFFECT.StatusShocked',
      },
      shock4: {
        icon: 'systems/gurps/icons/statuses/condition-shock4.webp',
        id: 'shock4',
        label: 'EFFECT.StatusShocked',
      },
      reeling: {
        icon: 'systems/gurps/icons/statuses/cth-condition-major-wound.webp',
        id: 'reeling',
        label: 'GURPS.STATUSReeling',
        changes: [
          {
            key: 'data.conditions.reeling',
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
        icon: 'systems/gurps/icons/statuses/path-condition-exhausted.webp',
        id: 'exhausted',
        label: 'GURPS.STATUSExhausted',
        changes: [
          {
            key: 'data.conditions.exhausted',
            value: true,
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          },
          {
            key: 'data.attributes.ST.import',
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
        icon: 'systems/gurps/icons/statuses/x-flying.webp',
        id: 'fly',
        label: 'GURPS.STATUSFly',
      },
      fall: {
        icon: 'systems/gurps/icons/statuses/condition-fall.webp',
        id: 'fall',
        label: 'GURPS.STATUSFall',
      },
      pinned: {
        icon: 'systems/gurps/icons/statuses/path-condition-pinned.webp',
        id: 'pinned',
        label: 'GURPS.STATUSPin',
      },
      nauseated: {
        icon: 'systems/gurps/icons/statuses/path-condition-nauseated.webp',
        id: 'nauseated',
        label: 'GURPS.STATUSNauseated',
      },
      coughing: {
        icon: 'systems/gurps/icons/statuses/condition-cough.webp',
        id: 'coughing',
        label: 'GURPS.STATUSCoughing',
      },
      retching: {
        icon: 'systems/gurps/icons/statuses/condition-wretch.webp',
        id: 'retching',
        label: 'GURPS.STATUSRetching',
      },
      drowsy: {
        icon: 'systems/gurps/icons/statuses/x-drowsy.webp',
        id: 'drowsy',
        label: 'GURPS.STATUSDrowsy',
      },
      sleeping: {
        icon: 'systems/gurps/icons/statuses/x-asleep.webp',
        id: 'sleeping',
        label: 'GURPS.STATUSSleep',
      },
      tipsy: {
        icon: 'systems/gurps/icons/statuses/condition-drunk1.webp',
        id: 'tipsy',
        label: 'GURPS.STATUSTipsy',
      },
      drunk: {
        icon: 'systems/gurps/icons/statuses/condition-drunk2.webp',
        id: 'drunk',
        label: 'GURPS.STATUSDrunk',
      },
      euphoria: {
        icon: 'systems/gurps/icons/statuses/path-condition-fascinated.webp',
        id: 'euphoria',
        label: 'GURPS.STATUSEuphoria',
      },
      mild_pain: {
        // README No such condition in Basic -- map to Moderate Pain with HPT?
        icon: 'systems/gurps/icons/statuses/condition-pain1.webp',
        id: 'mild_pain',
        label: 'GURPS.STATUSMildPain',
      },
      moderate_pain: {
        icon: 'systems/gurps/icons/statuses/condition-pain2.webp',
        id: 'moderate_pain',
        label: 'GURPS.STATUSModeratePain',
      },
      moderate_pain2: {
        // README No such condition in Basic -- map to Terrible Pain with HPT?
        icon: 'systems/gurps/icons/statuses/condition-pain3.webp',
        id: 'moderate_pain2',
        label: 'GURPS.STATUSModeratePain',
      },
      severe_pain: {
        icon: 'systems/gurps/icons/statuses/condition-pain4.webp',
        id: 'severe_pain',
        label: 'GURPS.STATUSSeverePain',
      },
      severe_pain2: {
        icon: 'systems/gurps/icons/statuses/condition-pain5.webp',
        id: 'severe_pain2',
        label: 'GURPS.STATUSSeverePain',
      },
      terrible_pain: {
        icon: 'systems/gurps/icons/statuses/condition-pain6.webp',
        id: 'terrible_pain',
        label: 'GURPS.STATUSTerriblePain',
      },
      agony: {
        icon: 'systems/gurps/icons/statuses/path-condition-helpless.webp',
        id: 'agony',
        label: 'GURPS.STATUSAgony',
      },
      bleed: {
        icon: 'systems/gurps/icons/statuses/path-condition-bleeding.webp',
        id: 'bleed',
        label: 'GURPS.STATUSBleed',
      },
      poison: {
        icon: 'systems/gurps/icons/statuses/dd-condition-poisoned.webp',
        id: 'poison',
        label: 'GURPS.STATUSPoison',
      },
      burn: {
        icon: 'systems/gurps/icons/statuses/x-burning.webp',
        id: 'burn',
        label: 'GURPS.STATUSBurn',
      },
      suffocate: {
        icon: 'systems/gurps/icons/statuses/condition-suffocate.webp',
        id: 'suffocate',
        label: 'GURPS.STATUSSuffocate',
      },
      disabled: {
        icon: 'systems/gurps/icons/statuses/dd-condition-unconscious.webp',
        id: 'disabled',
        label: 'GURPS.STATUSDisable',
      },
      blind: {
        icon: 'systems/gurps/icons/statuses/dd-condition-blinded.webp',
        id: 'blind',
        label: 'GURPS.STATUSBlind',
      },
      deaf: {
        icon: 'systems/gurps/icons/statuses/dd-condition-deafened.webp',
        id: 'deaf',
        label: 'GURPS.STATUSDeaf',
      },
      silence: {
        icon: 'systems/gurps/icons/statuses/x-silenced.webp',
        id: 'silence',
        label: 'GURPS.STATUSSilence',
      },
      stealth: {
        icon: 'systems/gurps/icons/statuses/x-stealth.webp',
        id: 'stealth',
        label: 'GURPS.STATUSStealth',
      },
      waiting: {
        icon: 'systems/gurps/icons/statuses/x-low-light-vision.webp',
        id: 'waiting',
        label: 'GURPS.STATUSWait',
      },
      sprint: {
        icon: 'systems/gurps/icons/statuses/x-haste.webp',
        id: 'sprint',
        label: 'GURPS.STATUSSprint',
      },
      num1: {
        icon: 'systems/gurps/icons/statuses/number-1.webp',
        id: 'num1',
        label: 'GURPS.STATUSCounter',
      },
      num2: {
        icon: 'systems/gurps/icons/statuses/number-2.webp',
        id: 'num2',
        label: 'GURPS.STATUSCounter',
      },
      num3: {
        icon: 'systems/gurps/icons/statuses/number-3.webp',
        id: 'num3',
        label: 'GURPS.STATUSCounter',
      },
      num4: {
        icon: 'systems/gurps/icons/statuses/number-4.webp',
        id: 'num4',
        label: 'GURPS.STATUSCounter',
      },
      num5: {
        icon: 'systems/gurps/icons/statuses/number-5.webp',
        id: 'num5',
        label: 'GURPS.STATUSCounter',
      },
      num6: {
        icon: 'systems/gurps/icons/statuses/number-6.webp',
        id: 'num6',
        label: 'GURPS.STATUSCounter',
      },
      num7: {
        icon: 'systems/gurps/icons/statuses/number-7.webp',
        id: 'num7',
        label: 'GURPS.STATUSCounter',
      },
      num8: {
        icon: 'systems/gurps/icons/statuses/number-8.webp',
        id: 'num8',
        label: 'GURPS.STATUSCounter',
      },
      num9: {
        icon: 'systems/gurps/icons/statuses/number-9.webp',
        id: 'num9',
        label: 'GURPS.STATUSCounter',
      },
      num10: {
        icon: 'systems/gurps/icons/statuses/number-10.webp',
        id: 'num10',
        label: 'GURPS.STATUSCounter',
      },
    }
  }
}

const _getActiveEffectsData = function (id) {
  const activeEffectsData = {
    shock1: {
      changes: [
        {
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
          value: 'GURPS.modifierStatusStunned',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.conditions.maneuver',
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
          key: 'data.conditions.self.modifiers',
          value: 'GURPS.modifierStatusStunned',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.conditions.maneuver',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionNausea',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionCough',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTipsy',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionDrunk',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
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
          key: 'data.conditions.self.modifiers',
          value: 'GURPS.modifiersBlindAttack',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        },
        {
          key: 'data.conditions.self.modifiers',
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

// chat
// data.conditions.exhausted
// data.conditions.maneuver
// data.conditions.posture
// data.conditions.reeling
// data.conditions.self.modifiers
// data.conditions.target.modifiers
// data.moveoverride.maneuver
// data.moveoverride.posture
// data.attributes.ST.import

export const GURPSActiveEffectsChanges = {
  'data.conditions.exhausted': 'GURPS.exhausted',
  'data.conditions.maneuver': 'GURPS.maneuver',
  'data.conditions.posture': 'GURPS.posture',
  'data.conditions.reeling': 'GURPS.reeling',
  'data.conditions.self.modifiers': 'GURPS.selfModifiers',
  'data.conditions.target.modifiers': 'GURPS.targetModifiers',
  'data.moveoverride.maneuver': 'GURPS.moveManeuver',
  'data.moveoverride.posture': 'GURPS.movePosture',
  'data.attributes.ST.import': 'GURPS.strength',
}
