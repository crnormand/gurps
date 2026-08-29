import * as Settings from '../../lib/miscellaneous-settings.js'
import { MOVE_NONE, MOVE_ONE, MOVE_ONETHIRD, MOVE_TWOTHIRDS, PROPERTY_MOVEOVERRIDE_POSTURE } from '../actor/maneuver.js'

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
    GURPS.StatusEffectStandingLabel = 'GURPS.status.Standing'

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
      name: game.i18n.localize('GURPS.settingActiveEffects'),
      hint: game.i18n.localize('GURPS.settingHintActiveEffects'),
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
      reeling: {
        img: 'systems/gurps/icons/statuses/cth-condition-major-wound.webp',
        id: 'reeling',
        name: 'GURPS.status.Reeling',
        order: 110,
        changes: [
          {
            key: 'system.conditions.reeling',
            value: true,
            type: 'override',
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
        name: 'GURPS.status.Exhausted',
        order: 120,
        changes: [
          {
            key: 'system.conditions.exhausted',
            value: true,
            type: 'override',
          },
          {
            key: 'system.attributes.ST.import',
            value: 0.5,
            type: 'multiply',
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
      stun: {
        img: 'systems/gurps/icons/statuses/dd-condition-stunned.webp',
        id: 'stun',
        name: 'EFFECT.StatusStunned',
        tint: '', // #FEAEF4 #AEFEAE
        order: 130,
      },
      mentalstun: {
        img: 'systems/gurps/icons/statuses/dd-condition-stunned-iq.webp',
        id: 'mentalstun',
        name: 'GURPS.status.StunnedMental',
        tint: '', // #FEAEF4 #AEFEAE
        order: 140,
      },
      prone: {
        img: 'systems/gurps/icons/statuses/dd-condition-prone.webp',
        id: 'prone',
        name: 'GURPS.status.Prone',
        order: 250,
        // I'm sneakily using ActiveEffects to implement postures even if the system setting is turned off.
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneDefend', [defenseTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneMelee', [meleeTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneRanged', [rangedTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.posture',
            value: 'prone',
            type: 'override',
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONE,
            type: 'override',
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
        name: 'GURPS.status.Kneel',
        order: 220,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelDefend', [defenseTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelMelee', [meleeTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureCrouchRanged', [rangedTag]),
            type: 'add',
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONETHIRD,
            type: 'override',
          },
          {
            key: 'system.conditions.posture',
            value: 'kneel',
            type: 'override',
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
        name: 'GURPS.status.Crouch',
        order: 210,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureCrouchMelee', [meleeTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureCrouchRanged', [rangedTag]),
            type: 'add',
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_TWOTHIRDS,
            type: 'override',
          },
          {
            key: 'system.conditions.posture',
            value: 'crouch',
            type: 'override',
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
        name: 'GURPS.status.Sit',
        order: 240,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelMelee', [meleeTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureKneelDefend', [defenseTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneRanged', [rangedTag]),
            type: 'add',
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_NONE,
            type: 'override',
          },
          {
            key: 'system.conditions.posture',
            value: 'sit',
            type: 'override',
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
        name: 'GURPS.status.Crawling',
        order: 230,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneMelee', [meleeTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.self.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneDefend', [defenseTag]),
            type: 'add',
          },
          {
            key: 'system.conditions.target.modifiers',
            value: getTaggedValue('GURPS.modifierPostureProneRanged', [rangedTag]),
            type: 'add',
          },
          {
            key: PROPERTY_MOVEOVERRIDE_POSTURE,
            value: MOVE_ONETHIRD,
            type: 'override',
          },
          {
            key: 'system.conditions.posture',
            value: 'crawl',
            type: 'override',
          },
        ],
        flags: {
          gurps: {
            effect: { type: 'posture', pdfref: 'GURPS.pdfPostureCrawling' },
          },
        },
      },
      shock1: {
        img: 'systems/gurps/icons/statuses/condition-shock1.webp',
        id: 'shock1',
        name: 'GURPS.shock1',
        order: 610,
      },
      shock2: {
        img: 'systems/gurps/icons/statuses/condition-shock2.webp',
        id: 'shock2',
        name: 'GURPS.shock2',
        order: 620,
      },
      shock3: {
        img: 'systems/gurps/icons/statuses/condition-shock3.webp',
        id: 'shock3',
        name: 'GURPS.shock3',
        order: 630,
      },
      shock4: {
        img: 'systems/gurps/icons/statuses/condition-shock4.webp',
        id: 'shock4',
        name: 'GURPS.shock4',
        order: 640,
      },
      nauseated: {
        img: 'systems/gurps/icons/statuses/path-condition-nauseated.webp',
        id: 'nauseated',
        name: 'GURPS.status.Nauseated',
        order: 700,
      },
      coughing: {
        img: 'systems/gurps/icons/statuses/condition-cough.webp',
        id: 'coughing',
        name: 'GURPS.status.Coughing',
        order: 700,
      },
      retching: {
        img: 'systems/gurps/icons/statuses/condition-wretch.webp',
        id: 'retching',
        name: 'GURPS.status.Retching',
        order: 700,
      },
      drowsy: {
        img: 'systems/gurps/icons/statuses/x-drowsy.webp',
        id: 'drowsy',
        name: 'GURPS.status.Drowsy',
        order: 700,
      },
      sleeping: {
        img: 'systems/gurps/icons/statuses/x-asleep.webp',
        id: 'sleeping',
        name: 'GURPS.status.Sleep',
        order: 700,
      },
      tipsy: {
        img: 'systems/gurps/icons/statuses/condition-drunk1.webp',
        id: 'tipsy',
        name: 'GURPS.status.Tipsy',
        order: 710,
      },
      drunk: {
        img: 'systems/gurps/icons/statuses/condition-drunk2.webp',
        id: 'drunk',
        name: 'GURPS.status.Drunk',
        order: 700,
      },
      euphoria: {
        img: 'systems/gurps/icons/statuses/path-condition-fascinated.webp',
        id: 'euphoria',
        name: 'GURPS.status.Euphoria',
        order: 700,
      },
      bleed: {
        img: 'systems/gurps/icons/statuses/path-condition-bleeding.webp',
        id: 'bleed',
        name: 'GURPS.status.Bleed',
        order: 700,
      },
      poison: {
        img: 'systems/gurps/icons/statuses/dd-condition-poisoned.webp',
        id: 'poison',
        name: 'GURPS.status.Poison',
        order: 700,
      },
      burn: {
        img: 'systems/gurps/icons/statuses/x-burning.webp',
        id: 'burn',
        name: 'GURPS.status.Burn',
        order: 700,
      },
      suffocate: {
        img: 'systems/gurps/icons/statuses/condition-suffocate.webp',
        id: 'suffocate',
        name: 'GURPS.status.Suffocate',
        order: 710,
      },
      disabled: {
        img: 'systems/gurps/icons/statuses/dd-condition-unconscious.webp',
        id: 'disabled',
        name: 'GURPS.status.Disable',
        order: 700,
      },
      blind: {
        img: 'systems/gurps/icons/statuses/dd-condition-blinded.webp',
        id: 'blind',
        name: 'GURPS.status.Blind',
        order: 700,
      },
      deaf: {
        img: 'systems/gurps/icons/statuses/dd-condition-deafened.webp',
        id: 'deaf',
        name: 'GURPS.status.Deaf',
        order: 700,
      },
      grapple: {
        img: 'systems/gurps/icons/statuses/path-condition-grappled.webp',
        id: 'grapple',
        name: 'GURPS.status.Grapple',
        order: 700,
      },
      silence: {
        img: 'systems/gurps/icons/statuses/x-silenced.webp',
        id: 'silence',
        name: 'GURPS.status.Silence',
        order: 700,
      },
      disarmed: {
        img: 'systems/gurps/icons/statuses/disarmed.webp',
        id: 'disarmed',
        name: 'GURPS.status.Disarmed',
        order: 700,
      },
      mild_pain: {
        // README No such condition in Basic -- map to Moderate Pain with HPT?
        img: 'systems/gurps/icons/statuses/condition-pain1.webp',
        id: 'mild_pain',
        name: 'GURPS.status.MildPain',
        order: 810,
      },
      moderate_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain2.webp',
        id: 'moderate_pain',
        name: 'GURPS.status.ModeratePain2',
        order: 820,
      },
      moderate_pain2: {
        // README No such condition in Basic -- map to Terrible Pain with HPT?
        img: 'systems/gurps/icons/statuses/condition-pain3.webp',
        id: 'moderate_pain2',
        name: 'GURPS.status.ModeratePain3',
        order: 830,
      },
      severe_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain4.webp',
        id: 'severe_pain',
        name: 'GURPS.status.SeverePain4',
        order: 840,
      },
      severe_pain2: {
        img: 'systems/gurps/icons/statuses/condition-pain5.webp',
        id: 'severe_pain2',
        name: 'GURPS.status.SeverePain5',
        order: 850,
      },
      terrible_pain: {
        img: 'systems/gurps/icons/statuses/condition-pain6.webp',
        id: 'terrible_pain',
        name: 'GURPS.status.TerriblePain',
        order: 860,
      },
      agony: {
        img: 'systems/gurps/icons/statuses/path-condition-helpless.webp',
        id: 'agony',
        name: 'GURPS.status.Agony',
        order: 870,
      },
      // ----- Movement -----
      fly: {
        img: 'systems/gurps/icons/statuses/x-flying.webp',
        id: 'fly',
        name: 'GURPS.status.Fly',
        order: 900,
      },
      fall: {
        img: 'systems/gurps/icons/statuses/condition-fall.webp',
        id: 'fall',
        name: 'GURPS.status.Fall',
        order: 900,
      },
      pinned: {
        img: 'systems/gurps/icons/statuses/path-condition-pinned.webp',
        id: 'pinned',
        name: 'GURPS.status.Pin',
        order: 900,
      },
      stealth: {
        img: 'systems/gurps/icons/statuses/x-stealth.webp',
        id: 'stealth',
        name: 'GURPS.status.Stealth',
        order: 900,
      },
      waiting: {
        img: 'systems/gurps/icons/statuses/x-low-light-vision.webp',
        id: 'waiting',
        name: 'GURPS.status.Wait',
        order: 900,
      },
      sprint: {
        img: 'systems/gurps/icons/statuses/x-haste.webp',
        id: 'sprint',
        name: 'GURPS.status.Sprint',
        order: 900,
      },
      // ---- ----
      num1: {
        img: 'systems/gurps/icons/statuses/number-1.webp',
        id: 'num1',
        name: 'GURPS.status.Counter1',
        order: 2000,
      },
      num2: {
        img: 'systems/gurps/icons/statuses/number-2.webp',
        id: 'num2',
        name: 'GURPS.status.Counter2',
        order: 2001,
      },
      num3: {
        img: 'systems/gurps/icons/statuses/number-3.webp',
        id: 'num3',
        name: 'GURPS.status.Counter3',
        order: 2002,
      },
      num4: {
        img: 'systems/gurps/icons/statuses/number-4.webp',
        id: 'num4',
        name: 'GURPS.status.Counter4',
        order: 2003,
      },
      num5: {
        img: 'systems/gurps/icons/statuses/number-5.webp',
        id: 'num5',
        name: 'GURPS.status.Counter5',
        order: 2004,
      },
      num6: {
        img: 'systems/gurps/icons/statuses/number-6.webp',
        id: 'num6',
        name: 'GURPS.status.Counter6',
        order: 2005,
      },
      num7: {
        img: 'systems/gurps/icons/statuses/number-7.webp',
        id: 'num7',
        name: 'GURPS.status.Counter7',
        order: 2006,
      },
      num8: {
        img: 'systems/gurps/icons/statuses/number-8.webp',
        id: 'num8',
        name: 'GURPS.status.Counter8',
        order: 2007,
      },
      num9: {
        img: 'systems/gurps/icons/statuses/number-9.webp',
        id: 'num9',
        name: 'GURPS.status.Counter9',
        order: 2008,
      },
      num10: {
        img: 'systems/gurps/icons/statuses/number-10.webp',
        id: 'num10',
        name: 'GURPS.status.Counter10',
        order: 2009,
      },
      'bad+1': {
        img: 'systems/gurps/icons/statuses/BAD+1.webp',
        id: 'bad+1',
        name: 'GURPS.status.Bad+1',
        order: 1060,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad+1',
            type: 'add',
          },
        ],
      },
      'bad+2': {
        img: 'systems/gurps/icons/statuses/BAD+2.webp',
        id: 'bad+2',
        name: 'GURPS.status.Bad+2',
        order: 1070,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad+2',
            type: 'add',
          },
        ],
      },
      'bad+3': {
        img: 'systems/gurps/icons/statuses/BAD+3.webp',
        id: 'bad+3',
        name: 'GURPS.status.Bad+3',
        order: 1080,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad+3',
            type: 'add',
          },
        ],
      },
      'bad+4': {
        img: 'systems/gurps/icons/statuses/BAD+4.webp',
        id: 'bad+4',
        name: 'GURPS.status.Bad+4',
        order: 1090,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad+4',
            type: 'add',
          },
        ],
      },
      'bad+5': {
        img: 'systems/gurps/icons/statuses/BAD+5.webp',
        id: 'bad+5',
        name: 'GURPS.status.Bad+5',
        order: 1100,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad+5',
            type: 'add',
          },
        ],
      },
      'bad-1': {
        img: 'systems/gurps/icons/statuses/BAD-1.webp',
        id: 'bad-1',
        name: 'GURPS.status.Bad-1',
        order: 1050,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad-1',
            type: 'add',
          },
        ],
      },
      'bad-2': {
        img: 'systems/gurps/icons/statuses/BAD-2.webp',
        id: 'bad-2',
        name: 'GURPS.status.Bad-2',
        order: 1040,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad-2',
            type: 'add',
          },
        ],
      },
      'bad-3': {
        img: 'systems/gurps/icons/statuses/BAD-3.webp',
        id: 'bad-3',
        name: 'GURPS.status.Bad-3',
        order: 1030,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad-3',
            type: 'add',
          },
        ],
      },
      'bad-4': {
        img: 'systems/gurps/icons/statuses/BAD-4.webp',
        id: 'bad-4',
        name: 'GURPS.status.Bad-4',
        order: 1020,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad-4',
            type: 'add',
          },
        ],
      },
      'bad-5': {
        img: 'systems/gurps/icons/statuses/BAD-5.webp',
        id: 'bad-5',
        name: 'GURPS.status.Bad-5',
        order: 1010,
        changes: [
          {
            key: 'system.conditions.self.modifiers',
            value: 'GURPS.status.Bad-5',
            type: 'add',
          },
        ],
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
          type: 'add',
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
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
          type: 'add',
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
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
          type: 'add',
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
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
          type: 'add',
          tags: [dxTag, iqTag, hitTag, spellTag, skillTag],
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
          type: 'add',
          tags: [defenseTag],
        },
        {
          key: 'system.conditions.maneuver',
          value: 'do_nothing',
          type: 'custom',
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
          type: 'add',
          tags: [defenseTag],
        },
        {
          key: 'system.conditions.maneuver',
          value: 'do_nothing',
          type: 'custom',
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
          type: 'add',
          tags: [dxTag],
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
          type: 'add',
          tags: [attributesTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionNauseaDef',
          type: 'add',
          tags: [defenseTag],
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
          type: 'add',
          tags: [dxTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionCoughIQ',
          type: 'add',
          tags: [iqTag],
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
          type: 'add',
          tags: [dxTag, iqTag, perTag],
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
          type: 'add',
          tags: [dxTag, iqTag, perTag],
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
          type: 'add',
          tags: [dxTag, iqTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionTipsyCR',
          type: 'add',
          tags: [crTag],
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
          type: 'add',
          tags: [dxTag, iqTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierAfflictionDrunkCR',
          type: 'add',
          tags: [crTag],
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
          type: 'add',
          tags: [dxTag, iqTag, crTag],
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
          type: 'add',
          tags: [dxTag, iqTag, crTag],
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
          type: 'add',
          tags: [dxTag, iqTag, crTag],
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
          type: 'add',
          tags: [dxTag, iqTag, crTag],
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
          type: 'add',
          tags: [dxTag, iqTag, crTag],
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
          type: 'add',
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: { requiresConfig: true, pdfref: 'GURPS.pdfHazardPain' },
        },
      },
    },
    suffocate: {
      changes: [
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifierSuffocate',
          type: 'add',
          tags: [dxTag, iqTag, crTag],
        },
      ],
      flags: {
        gurps: {
          effect: {
            pdfref: 'GURPS.pdfSuffocation',
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
          type: 'add',
          tags: [hitTag],
        },
        {
          key: 'system.conditions.self.modifiers',
          value: 'GURPS.modifiersBlindDefend',
          type: 'add',
          tags: [defenseTag],
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
  'system.conditions.reeling': 'GURPS.status.Reeling',
  'system.conditions.self.modifiers': 'GURPS.selfModifiers',
  'system.conditions.target.modifiers': 'GURPS.targetModifiers',
  'system.moveoverride.maneuver': 'GURPS.moveManeuver',
  'system.moveoverride.posture': 'GURPS.movePosture',
  'system.attributes.ST.import': 'GURPS.strength',
}
