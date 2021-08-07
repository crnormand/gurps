'use strict'

export default class GurpsActiveEffect extends ActiveEffect {
  static init() {
    CONFIG.ActiveEffect.documentClass = GurpsActiveEffect

    Hooks.on(
      'preCreateActiveEffect',
      async (
        /** @type {any} */ _effect,
        /** @type {{ duration: { combat: any; }; }} */ data,
        /** @type {any} */ _options,
        /** @type {any} */ _userId
      ) => {
        // Add combat id if necessary
        if (data.duration && !data.duration.combat && _game().combat) data.duration.combat = _game().combats?.active?.id
      }
    )

    Hooks.on(
      'createActiveEffect',
      async (/** @type {ActiveEffect} */ effect, /** @type {any} */ _data, /** @type {any} */ _userId) => {
        console.log('create ' + effect)
        if (effect.getFlag('gurps', 'requiresConfig') === true) {
          let dialog = new ActiveEffectConfig(effect)
          await dialog.render(true)
        }
        // effect.parent.applyActiveEffects()
      }
    )

    Hooks.on('applyActiveEffect', (actor, change, options, user) => {
      console.log([actor, change, options, user])
    })

    Hooks.on(
      'updateActiveEffect',
      (
        /** @type {ActiveEffect} */ effect,
        /** @type {any} */ _data,
        /** @type {any} */ _options,
        /** @type {any} */ _userId
      ) => {
        console.log('update ' + effect)
        // effect.parent.applyActiveEffects()
      }
    )

    Hooks.on(
      'deleteActiveEffect',
      (/** @type {string} */ effect, /** @type {any} */ _data, /** @type {any} */ _userId) => {
        console.log('delete ' + effect)
      }
    )

    Hooks.on('updateActor', (actor, data, options, user) => {
      // console.log(JSON.stringify(data))
      //actor.applyActiveEffects()
    })

    Hooks.on(
      'updateCombat',
      (
        /** @type {Combat} */ combat,
        /** @type {any} */ _data,
        /** @type {any} */ _options,
        /** @type {any} */ _userId
      ) => {
        // get previous combatant { round: 6, turn: 0, combatantId: 'id', tokenId: 'id' }
        // @ts-ignore
        let previous = combat.previous
        if (previous.tokenId) {
          let token = _canvas().tokens?.get(previous.tokenId)

          // go through all effects, removing those that have expired
          if (token && token.actor) {
            for (const effect of token.actor.effects) {
              let duration = effect.duration
              if (duration && !!duration.duration) {
                if (duration.remaining && duration.remaining <= 1) {
                  effect.delete()
                }
              }
            }
          }
        }
      }
    )
  }

  /**
   * @param {ActiveEffectData} data
   * @param {any} context
   */
  constructor(data, context) {
    super(data, context)

    this.context = context
  }

  get endCondition() {
    return this.getFlag('gurps', 'effect.endCondition')
  }

  get followup() {
    let data = /** @type {ActiveEffectData} */ (this.getFlag('gurps', 'effect.followup'))
    return new GurpsActiveEffect(data, this.context)
  }

  /**
   * @param {ActiveEffect} effect
   */
  static getName(effect) {
    return /** @type {string} */ (effect.getFlag('gurps', 'name'))
  }
}

/*
  {
    key: fields.BLANK_STRING,
    value: fields.BLANK_STRING,
    mode: {
      type: Number,
      required: true,
      default: CONST.ACTIVE_EFFECT_MODES.ADD,
      validate: m => Object.values(CONST.ACTIVE_EFFECT_MODES).includes(m),
      validationError: "Invalid mode specified for change in ActiveEffectData"
      },
      priority: fields.NUMERIC_FIELD
    }
*/
// -- Functions to get type-safe global references (for TS) --

function _game() {
  if (game instanceof Game) return game
  throw new Error('game is not initialized yet!')
}

function _canvas() {
  if (canvas) return canvas
  throw new Error('canvas is not initialized yet!')
}
