import { MOVE_ONE, MOVE_NONE, MOVE_THIRD, MOVE_TWOTHIRDS } from '../actor/maneuver.js'

export class StatusEffect {
  static effects() {
    // TODO if active effects are turned on, return the effects with changes, duration, etc...

    return statusEffects
  }
}

const statusEffects = [
  {
    icon: 'systems/gurps/icons/statuses/condition-shock1.webp',
    id: 'shock1',
    label: 'EFFECT.StatusShocked',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock2.webp',
    id: 'shock2',
    label: 'EFFECT.StatusShocked',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock3.webp',
    id: 'shock3',
    label: 'EFFECT.StatusShocked',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-shock4.webp',
    id: 'shock4',
    label: 'EFFECT.StatusShocked',
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: '-4 to IQ and DX and skills based on them',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    duration: {
      rounds: 1,
    },
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-stunned.webp',
    id: 'stun',
    label: 'EFFECT.StatusStunned',
    tint: '', // #FEAEF4 #AEFEAE
    changes: [
      {
        key: 'data.conditions.maneuver',
        value: 'do_nothing',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      },
    ],
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-grappled.webp',
    id: 'grapple',
    label: 'GURPS.STATUSGrapple',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-prone.webp',
    id: 'prone',
    label: 'EFFECT.StatusProne',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-kneel.webp',
    id: 'kneel',
    label: 'GURPS.STATUSKneel',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-crouch.webp',
    id: 'crouch',
    label: 'GURPS.STATUSCrouch',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-sit.webp',
    id: 'sit',
    label: 'GURPS.STATUSSit',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-flying.webp',
    id: 'fly',
    label: 'GURPS.STATUSFly',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-fall.webp',
    id: 'fall',
    label: 'GURPS.STATUSFall',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-pinned.webp',
    id: 'pinned',
    label: 'GURPS.STATUSPin',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-nauseated.webp',
    id: 'nauseated',
    label: 'GURPS.STATUSNauseated',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-cough.webp',
    id: 'coughing',
    label: 'GURPS.STATUSCoughing',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-wretch.webp',
    id: 'retching',
    label: 'GURPS.STATUSRetching',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-drowsy.webp',
    id: 'drowsy',
    label: 'GURPS.STATUSDrowsy',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-asleep.webp',
    id: 'sleeping',
    label: 'GURPS.STATUSSleep',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-drunk1.webp',
    id: 'tipsy',
    label: 'GURPS.STATUSTipsy',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-drunk2.webp',
    id: 'drunk',
    label: 'GURPS.STATUSDrunk',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-fascinated.webp',
    id: 'euphoria',
    label: 'GURPS.STATUSEuphoria',
  },
  {
    // README No such condition in Basic -- map to Moderate Pain with HPT?
    icon: 'systems/gurps/icons/statuses/condition-pain1.webp',
    id: 'mild_pain',
    label: 'GURPS.STATUSMildPain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain2.webp',
    id: 'moderate_pain',
    label: 'GURPS.STATUSModeratePain',
  },
  {
    // README No such condition in Basic -- map to Terrible Pain with HPT?
    icon: 'systems/gurps/icons/statuses/condition-pain3.webp',
    id: 'moderate_pain2',
    label: 'GURPS.STATUSModeratePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain4.webp',
    id: 'severe_pain',
    label: 'GURPS.STATUSSeverePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain5.webp',
    id: 'severe_pain2',
    label: 'GURPS.STATUSSeverePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-pain6.webp',
    id: 'terrible_pain',
    label: 'GURPS.STATUSTerriblePain',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-helpless.webp',
    id: 'agony',
    label: 'GURPS.STATUSAgony',
  },
  {
    icon: 'systems/gurps/icons/statuses/cth-condition-major-wound.webp',
    id: 'reeling',
    label: 'GURPS.STATUSReeling',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-exhausted.webp',
    id: 'exhausted',
    label: 'GURPS.STATUSExhausted',
  },
  {
    icon: 'systems/gurps/icons/statuses/path-condition-bleeding.webp',
    id: 'bleed',
    label: 'GURPS.STATUSBleed',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-poisoned.webp',
    id: 'poison',
    label: 'GURPS.STATUSPoison',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-burning.webp',
    id: 'burn',
    label: 'GURPS.STATUSBurn',
  },
  {
    icon: 'systems/gurps/icons/statuses/condition-suffocate.webp',
    id: 'suffocate',
    label: 'GURPS.STATUSSuffocate',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-unconscious.webp',
    id: 'disabled',
    label: 'GURPS.STATUSDisable',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-blinded.webp',
    id: 'blind',
    label: 'GURPS.STATUSBlind',
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-deafened.webp',
    id: 'deaf',
    label: 'GURPS.STATUSDeaf',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-silenced.webp',
    id: 'silence',
    label: 'GURPS.STATUSSilence',
  },
  // {
  //   icon: 'systems/gurps/icons/statuses/cth-condition-readied.webp',
  //   id: 'aim',
  //   label: 'GURPS.STATUSAim',
  // },
  {
    icon: 'systems/gurps/icons/statuses/x-stealth.webp',
    id: 'stealth',
    label: 'GURPS.STATUSStealth',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-low-light-vision.webp',
    id: 'waiting',
    label: 'GURPS.STATUSWait',
  },
  {
    icon: 'systems/gurps/icons/statuses/x-haste.webp',
    id: 'sprint',
    label: 'GURPS.STATUSSprint',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-1.webp',
    id: 'num1',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-2.webp',
    id: 'num2',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-3.webp',
    id: 'num3',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-4.webp',
    id: 'num4',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-5.webp',
    id: 'num5',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-6.webp',
    id: 'num6',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-7.webp',
    id: 'num7',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-8.webp',
    id: 'num8',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-9.webp',
    id: 'num9',
    label: 'GURPS.STATUSCounter',
  },
  {
    icon: 'systems/gurps/icons/statuses/number-10.webp',
    id: 'num10',
    label: 'GURPS.STATUSCounter',
  },
]

const activeEffectsData = {
  shock1: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierStatusShock1',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    duration: {
      rounds: 1,
    },
    gurps: {
      requiresConfig: true,
      pdfref: 'B419',
    },
  },
  shock2: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierStatusShock2',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    duration: {
      rounds: 1,
    },
    gurps: {
      requiresConfig: true,
      pdfref: 'B419',
    },
  },
  shock3: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierStatusShock3',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    duration: {
      rounds: 1,
    },
    gurps: {
      requiresConfig: true,
      pdfref: 'B419',
    },
  },
  shock4: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierStatusShock4',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    duration: {
      rounds: 1,
    },
    gurps: {
      requiresConfig: true,
      pdfref: 'B419',
    },
  },
  stun: {
    // tint: maybe set the tint based on physical/mental stun?
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierStatusStunned',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.maneuver',
        value: 'do_nothing',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      },
    ],
    gurps: {
      requiresConfig: true,
      terminalCondition: 'HT', // may move to 'IQ' (mental stun)
      pdfref: 'B420',
    },
  },
  grapple: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierGrappling', // '-4 to DX and DX-based skills'
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B370',
    },
  },
  prone: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierPostureProneDefend',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierPostureProneMelee',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        // TODO put this value as a chat message '{token} is [{i18n(value)}]' - example: 'Joe is [-2 to be hit with ranged combat (target is Prone)]'
        key: 'chat',
        value: 'GURPS.modifierPostureProneRanged',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      },
      {
        key: 'data.conditions.move',
        value: MOVE_ONE,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      },
    ],
    gurps: {
      requiresConfig: true,
      type: 'posture',
      pdfref: 'B551',
    },
  },
  kneel: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierPostureKneelDefend',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierPostureKneelMelee',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'chat',
        value: 'GURPS.modifierPostureCrouchRanged',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      },
      {
        key: 'data.conditions.move',
        value: MOVE_THIRD,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      },
    ],
    gurps: {
      requiresConfig: true,
      type: 'posture',
      pdfref: 'B551',
    },
  },
  crouch: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierPostureCrouchMelee',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'chat',
        value: 'GURPS.modifierPostureCrouchRanged',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      },
      {
        key: 'data.conditions.move',
        value: MOVE_TWOTHIRDS,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      },
    ],
    gurps: {
      requiresConfig: true,
      type: 'posture',
      pdfref: 'B551',
    },
  },
  sit: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierPostureKneelMelee',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierPostureKneelDefend',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'chat',
        value: 'GURPS.modifierPostureProneRanged',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      },
      {
        key: 'data.conditions.move',
        value: MOVE_NONE,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      },
    ],
    gurps: {
      requiresConfig: true,
      type: 'posture',
      pdfref: 'B551',
    },
  },
  nauseated: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionNausea',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionNauseaDef',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  coughing: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionCough',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionCoughIQ',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  retching: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionRetch',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B429',
      followup: '/fp -1', // TODO put in chat when followups are activated
    },
  },
  drowsy: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionDrowsy',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  tipsy: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionTipsy',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionTipsyCR',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  drunk: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionDrunk',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionDrunkCR',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  euphoria: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionEuphoria',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  mild_pain: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionModerateHPT',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  moderate_pain: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionModerate',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  moderate_pain2: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionTerribleHPT',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  severe_pain: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionSevere',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  terrible_pain: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifierAfflictionTerrible',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B428',
    },
  },
  reeling: {
    changes: [
      {
        key: 'data.basicmove',
        value: 0.5,
        mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
      },
      {
        key: 'data.additionalresources.isReeling',
        value: true,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B380',
    },
  },
  exhausted: {
    changes: [
      {
        key: 'data.additionalresources.isTired',
        value: true,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      },
      {
        key: 'data.attributes.ST.import',
        value: 0.5,
        mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B426',
    },
  },
  suffocate: {
    gurps: {
      requiresConfig: true,
      pdfref: 'B426',
      everyturn: '/fp -1', // TODO implement everyturn
    },
  },
  blind: {
    changes: [
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifiersBlindAttack', // '[-10 to hit (Blind)]
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.conditions.modifiers',
        value: 'GURPS.modifiersBlindDefend', // '[-4 to dodge (Blind -- cannot see attacker)]
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    gurps: {
      requiresConfig: true,
      pdfref: 'B394',
      configHint: 'GURPS.effectHintBlind' // -6 to hit if accustomed to being blind; Hearing -2 success lowers the to hit penalty to -4
    },
  },
}
