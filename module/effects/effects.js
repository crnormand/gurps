export class StatusEffect {
  static effects() {
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
  },
  {
    icon: 'systems/gurps/icons/statuses/dd-condition-stunned.webp',
    id: 'stun',
    label: 'EFFECT.StatusStunned',
    changes: [
      {
        key: 'data.conditions.maneuver',
        value: 'do_nothing',
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: 1,
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
