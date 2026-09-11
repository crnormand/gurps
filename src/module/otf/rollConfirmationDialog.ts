import {  Application, HandlebarsApplicationMixin } from '@gurps-types/foundry/index.js'
import { CanRollResult } from '@module/actor/types.js'
import { MessageMode } from '@module/util/foundry-utils.js'
import { i18nFallback } from '@module/util/i18nFallback.js'
import { systemPath } from '@module/util/misc.js'
import * as Settings from '@module/util/miscellaneous-settings.js'

import { OtfActionType, OtfDamageAction, OtfRollAction } from './types.js'

interface DieRollConfirmationData {
  type: 'roll'
  messages: string[]
  action: OtfRollAction
  actor: Actor.Implementation
  token?: Token.Implementation
  item?: Item.Implementation
  origTarget: number
  formula: string
  canRollResult: CanRollResult
  name: string
  obj: any //toDo Type better
  messageMode: MessageMode
}

interface DamageRollConfirmationData {
  type: 'damage'
  messages: string[]
  action: OtfDamageAction
  actor?: Actor.Implementation | null
  token?: Token | null
  displayFormula: string
  messageMode: MessageMode
}

type RollConfirmationData = DieRollConfirmationData | DamageRollConfirmationData

namespace RollConfirmationDialog {
  export interface RollRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
    type: 'roll'
    messages: string[]
    isVideo: boolean
    tokenImage: string
    tokenName: string
    target: number
    targetColor: string
    operator: string
    totalMods: number
    totalRoll: number
    rollChance: string
    rollType: string
    itemImage: string
    itemColor: string
    itemIcon: string
    consumeActionIcon?: string
    consumeActionColor?: string
    consumeActionLabel?: string
    targetRoll: string
    buttons: any[]
  }
  export interface DamageRenderContext extends foundry.applications.api.ApplicationV2.RenderContext {
    type: 'damage'
    messages: string[]
    isVideo: boolean
    tokenImage: string
    tokenName: string
    damageRoll: string
    originalFormula?: string
    damageTypeLabel?: string
    damageTypeIcon?: string
    damageTypeColor?: string
    otfDamageText?: string
    multiplierNumber?: string
    armorDivisorNumber?: string
    useMinDamage: boolean
    damageCost?: string
    usingDiceAdd: boolean
    targetRoll: string
    bucketRoll: string
    bucketRollColor: string
    buttons: any[]
  }

  export type RenderContext = RollRenderContext | DamageRenderContext
}

class RollConfirmationDialog extends HandlebarsApplicationMixin(Application) {
  constructor(data: RollConfirmationData) {
    super()
    this._data = data

    this._submit = async (_result: boolean) => {}
  }

  async reset(data: RollConfirmationData) {
    await this.close()
    this._data = data
  }

  setSubmit(submit: (result: boolean) => Promise<void>) {
    this._submit = submit
  }

  _data: RollConfirmationData
  _submit: (result: boolean) => Promise<void>

  static override DEFAULT_OPTIONS = {
    tag: 'form',
    classes: ['standard-form', 'cr-dialog'],
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      cancel: RollConfirmationDialog.#onCancelButton,
      roll: RollConfirmationDialog.#onRollButton,
    },
  }

  override get title(): string {
    return game.i18n?.localize('GURPS.confirmRoll') ?? 'Roll Confirmation'
  }

  static override PARTS = {
    roll: {
      template: systemPath('templates/confirmation-roll2.hbs'),
    },
    damage: {
      template: systemPath('templates/confirmation-damage-roll2.hbs'),
    },
    footer: {
      template: 'templates/generic/form-footer.hbs',
    },
  }

  override _configureRenderOptions(options: { parts?: string[] | undefined }) {
    super._configureRenderOptions(options)

    switch (this._data.type) {
      case 'roll':
        options.parts = ['roll', 'footer']
        break
      case 'damage':
        options.parts = ['damage', 'footer']
        break
    }
  }

  static rollData = (target: number) => {
    let targetColor, rollChance

    if (target < 6) {
      targetColor = '#b30000'
      rollChance = game.i18n?.localize('GURPS.veryHardRoll')
    } else if (target < 11) {
      targetColor = '#cc6600'
      rollChance = game.i18n?.localize('GURPS.hardRoll')
    } else if (target < 14) {
      targetColor = '#fdfdbd'
      rollChance = game.i18n?.localize('GURPS.fairRoll')
    } else if (target < 17) {
      targetColor = '#5cbd58'
      rollChance = game.i18n?.localize('GURPS.easyRoll')
    } else {
      targetColor = '#0a8d0a'
      rollChance = game.i18n?.localize('GURPS.veryEasyRoll')
    }

    return { targetColor, rollChance: rollChance ?? '' }
  }

  actionData = () => {
    if (this._data.type !== 'roll') return { itemIcon: '', itemColor: '', rollType: '' }
    const action = this._data.action
    let itemIcon, itemColor, rollType

    switch (action.type) {
      case OtfActionType.attack:
        if (action.isMelee) {
          itemIcon = 'fa-solid fa-sword'
          itemColor = 'rgb(12,79,119)'
          rollType = game.i18n?.localize('GURPS.melee') ?? ''
        } else {
          itemIcon = 'fa-solid fa-crosshairs'
          itemColor = 'rgb(12,79,119)'
          rollType = game.i18n?.localize('GURPS.ranged') ?? ''
        }

        break

      case OtfActionType.weaponParry:
        itemIcon = 'fa-solid fa-swords'
        itemColor = '#9a5f16'
        rollType = game.i18n?.localize('GURPS.parry') ?? ''
        break

      case OtfActionType.weaponBlock:
        itemIcon = 'fa-solid fa-shield-halved'
        itemColor = '#9a5f16'
        rollType = game.i18n?.localize('GURPS.block') ?? ''
        break

      case OtfActionType.skillSpell:
        if (action.isSkillOnly) {
          itemIcon = 'fa-solid fa-book'
          itemColor = '#015401'
          rollType = game.i18n?.localize('GURPS.skill') ?? ''
        } else {
          itemIcon = 'fa-solid fa-wand-magic-sparkles'
          itemColor = '#6f63d9'
          rollType = game.i18n?.localize('GURPS.spell') ?? ''
        }

        break

      case OtfActionType.controlRoll:
        itemIcon = 'fa-solid fa-head-side-gear'
        itemColor = '#c5360b'
        rollType = game.i18n?.localize('GURPS.ControlRoll') ?? ''
        break

      case OtfActionType.attribute: {
        itemColor = '#620707'

        switch (action.attribute) {
          case 'ST':
            itemIcon = 'fa-solid fa-dumbbell'
            rollType = game.i18n?.localize('GURPS.attributesSTNAME') ?? ''
            break
          case 'DX':
            itemIcon = 'fa-solid fa-person-running'
            rollType = game.i18n?.localize('GURPS.attributesDXNAME') ?? ''
            break
          case 'HT':
            itemIcon = 'fa-solid fa-heart'
            rollType = game.i18n?.localize('GURPS.attributesHTNAME') ?? ''
            break
          case 'IQ':
            itemIcon = 'fa-solid fa-brain'
            rollType = game.i18n?.localize('GURPS.attributesIQNAME') ?? ''
            break
          case 'WILL':
            itemIcon = 'fa-solid fa-brain'
            rollType = game.i18n?.localize('GURPS.attributesWILLNAME') ?? ''
            break
          case 'Vision':
            itemIcon = 'fa-solid fa-eye'
            rollType = game.i18n?.localize('GURPS.vision') ?? ''
            break
          case 'PER':
            itemIcon = 'fa-solid fa-signal-stream'
            rollType = game.i18n?.localize('GURPS.attributesPERNAME') ?? ''
            break
          case 'Fright Check':
            itemIcon = 'fa-solid fa-face-scream'
            rollType = game.i18n?.localize('GURPS.frightcheck') ?? ''
            break
          case 'Hearing':
            itemIcon = 'fa-solid fa-ear'
            rollType = game.i18n?.localize('GURPS.hearing') ?? ''
            break
          case 'Taste Smell':
            itemIcon = 'fa-solid fa-nose'
            rollType = game.i18n?.localize('GURPS.tastesmell') ?? ''
            break
          case 'Touch':
            itemIcon = 'fa-solid fa-hand-point-up'
            rollType = game.i18n?.localize('GURPS.touch') ?? ''
            break
          case 'Dodge':
            itemIcon = 'fa-solid fa-person-running-fast'
            rollType = game.i18n?.localize('GURPS.dodge') ?? ''
            break
          default:
            itemIcon = 'fa-solid fa-dice'
            rollType = this._data.name ?? action.name.charAt(0).toUpperCase() + action.name.toLowerCase().slice(1)
        }

        break
      }

      case OtfActionType.roll:
      case OtfActionType.derivedRoll:
        itemIcon = 'fa-solid fa-dice'
        itemColor = '#015401'
        rollType = this._data.formula
        break

      case OtfActionType.damage:
      case OtfActionType.derivedDamage:
        itemIcon = 'fa-solid fa-dice' //toDo: damage type icon
        itemColor = '#015401' //toDo: damage type color
        rollType = this._data.formula
    }

    return { itemIcon, itemColor, rollType }
  }

  override async _prepareContext(
    _options: foundry.applications.api.ApplicationV2.RenderOptions
  ): Promise<RollConfirmationDialog.RenderContext> {
    const gmUser = game.users?.find((it: User) => it.isGM && it.active)
    const token = this._data.token
    const tokenImage = token?.document.texture.src ?? this._data.actor?.img ?? gmUser?.avatar ?? ''
    const isVideo = tokenImage.includes('webm') || tokenImage.includes('mp4')
    const tokenName = (token?.name || this._data.actor?.name) ?? gmUser?.name ?? ''

    if (this._data.type === 'roll') {
      const actor = this._data.actor
      // Get Math Info
      const totalMods = GURPS.ModifierBucket.currentSum()
      const operator = totalMods >= 0 ? '+' : '-'
      const totalRoll = this._data.origTarget + totalMods

      const item = this._data.item
      const itemImage = item?.img || ''
      const { targetColor, rollChance } = RollConfirmationDialog.rollData(totalRoll)

      const targetRoll = this._data.name + (this._data.origTarget > 0 ? `-${this._data.origTarget}` : '')
      const { itemIcon, itemColor, rollType } = this.actionData()

      const settingsAllowAfterMaxActions = game.settings?.get(
        GURPS.SYSTEM_NAME,
        Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS
      )
      const settingsUseMaxActions = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_MAX_ACTIONS)
      const dontShowMaxActions =
        settingsUseMaxActions === 'Disable' ||
        (!this._data.canRollResult.isCombatant && settingsUseMaxActions === 'AllCombatant') ||
        settingsAllowAfterMaxActions === 'Allow'

      const canConsumeAction = dontShowMaxActions
        ? undefined
        : actor.canConsumeAction(this._data.action, '', this._data.obj)

      const consumeActionIcon = dontShowMaxActions
        ? undefined
        : !this._data.canRollResult.hasActions
          ? '<i class="fa-solid fa-exclamation"></i>'
          : canConsumeAction
            ? '<i class="fa-solid fa-plus"></i>'
            : '<i class="fa-solid fa-check"></i>'

      const consumeActionLabel = dontShowMaxActions
        ? undefined
        : !this._data.canRollResult.hasActions
          ? game.i18n?.localize('GURPS.noActionsAvailable')
          : canConsumeAction
            ? game.i18n?.localize('GURPS.willConsumeAction')
            : game.i18n?.localize('GURPS.isFreeAction')

      const consumeActionColor = dontShowMaxActions
        ? undefined
        : !this._data.canRollResult.hasActions
          ? 'rgb(215,185,33)'
          : canConsumeAction
            ? 'rgba(20,119,180,0.7)'
            : 'rgba(51,114,68,0.7)'

      return {
        type: 'roll',
        messages: this._data.messages,
        isVideo,
        tokenImage,
        tokenName,
        target: this._data.origTarget,
        targetColor,
        operator,
        totalMods: Math.abs(totalMods),
        totalRoll: Math.max(totalRoll, 3),
        rollChance,
        rollType,
        itemImage: itemImage,
        itemColor,
        itemIcon,
        consumeActionIcon,
        consumeActionColor,
        consumeActionLabel,
        targetRoll: targetRoll,
        buttons: [
          {
            type: 'submit',
            icon: this._data.messageMode.isBlind ? 'fa-solid fa-eye-slash' : 'fa-solid fa-dice',
            label: this._data.messageMode.isBlind ? 'GURPS.blindRoll' : 'GURPS.roll',
            default: true,
            action: 'roll',
          },
          {
            type: 'submit',
            icon: 'fa-solid fa-xmark',
            label: 'GURPS.cancel',
            action: 'cancel',
          },
          // { type: "reset", action: "reset", icon: "fa-solid fa-undo", label: "SETTINGS.Reset" },
        ],
      }
    } else {
      const action = this._data.action
      const displayFormula = this._data.displayFormula
      const damageType = GURPS.DamageTables.translate(action.damagetype)
      const damageTypeLabel = i18nFallback(
        `GURPS.damageTypes.${GURPS.DamageTables.woundModifiers[damageType]?.label}`,
        damageType
      )
      const damageTypeIcon =
        GURPS.DamageTables.woundModifiers[damageType]?.icon || '<i class="fa-solid fa-dice-d6"></i>'
      const damageTypeColor = GURPS.DamageTables.woundModifiers[damageType]?.color || '#772e21'
      const targetRoll = action.orig
      const bucketTotal = GURPS.ModifierBucket.currentSum()
      const bucketRoll = bucketTotal !== 0 ? `(${bucketTotal > 0 ? '+' : ''}${bucketTotal})` : ''
      const bucketRollColor = bucketTotal > 0 ? 'darkgreen' : bucketTotal < 0 ? 'darkred' : '#a8a8a8'
      const useMinDamage = displayFormula.includes('!') && !displayFormula.startsWith('!')
      // Armor divisor can be (0.5) or (2) - need to regex to get the number
      const armorDivisorRegex = /\((\d*\.?\d+)\)/
      const armorDivisorNumber = action.extdamagetype?.match(armorDivisorRegex)?.[1]
      // Multiplier damage is x2, X3 or *4 - need to regex to get the number
      const multiplierRegex = /(?<=[xX*])\d+(\.\d+)?/
      const multiplierNumber = displayFormula.match(multiplierRegex)?.[0]
      const originalFormula = action.formula.match(/\d+d[+-]?\d*/)?.[0]
      const damageCost = action.costs?.split(' ').pop() || ''
      const otfDamageText = !!action.overridetxt && action.overridetxt !== action.formula ? action.overridetxt : ''
      const usingDiceAdd = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS) ?? false

      return {
        type: 'damage',
        messages: this._data.messages,
        isVideo,
        tokenImage,
        tokenName,
        damageRoll: displayFormula,
        originalFormula,
        damageTypeLabel,
        damageTypeIcon,
        damageTypeColor,
        otfDamageText,
        multiplierNumber,
        armorDivisorNumber,
        useMinDamage,
        damageCost,
        usingDiceAdd,
        targetRoll,
        bucketRoll,
        bucketRollColor,
        buttons: [
          {
            type: 'submit',
            icon: this._data.messageMode.isBlind ? 'fa-solid fa-eye-slash' : 'fa-solid fa-dice',
            label: this._data.messageMode.isBlind ? 'GURPS.blindRoll' : 'GURPS.roll',
            default: true,
            action: 'roll',
          },
          {
            type: 'submit',
            icon: 'fa-solid fa-xmark',
            label: 'GURPS.cancel',
            action: 'cancel',
          },
          // { type: "reset", action: "reset", icon: "fa-solid fa-undo", label: "SETTINGS.Reset" },
        ],
      }
    }
  }

  static async #onRollButton(this: RollConfirmationDialog, event: PointerEvent, _target: HTMLElement): Promise<void> {
    event.preventDefault()
    await this._submit(true)
    this.close({ submitted: true })
  }

  static async #onCancelButton(this: RollConfirmationDialog, event: PointerEvent, _target: HTMLElement): Promise<void> {
    event.preventDefault()
    await this._submit(false)
    this.close({ submitted: true })
  }

  /*
      Only one Roll Confimation Dialog can be Open at one time, so wie reuse the instance.
    */
  static instance: RollConfirmationDialog | null = null

  static async wait(data: RollConfirmationData) {
    if (this.instance === null) {
      this.instance = new this(data)
    } else {
      await this.instance.reset(data)
    }

    const dialog = this.instance

    return new Promise<boolean>(resolve => {
      const submit = async (result: boolean) => resolve(result)

      dialog.setSubmit(submit)
      dialog.addEventListener('close', _event => resolve(false), { once: true })
      dialog.render({ force: true })
    })
  }
}


export { RollConfirmationDialog }
