import { Application, HandlebarsApplicationMixin } from '@gurps-types/foundry/index.js'
import { MeleeAttackModel } from '@module/action/melee-attack.js'
import { RangedAttackModel } from '@module/action/ranged-attack.js'
import { HitLocationEntryV2 } from '@module/actor/data/hit-location-entry.js'
import { CombatOption } from '@module/combat/types.js'
import { ModelCollection } from '@module/data/model-collection.js'
import GurpsWiring from '@module/gurps-wiring.js'
import { ModifierLiterals } from '@module/modifier-bucket/tooltip-window.js'
import { getRollTypeFromAction, ROLL_TYPE, rollTypeTagSettings } from '@module/tagged-modifiers/tagged-modifiers.js'
import { MessageMode } from '@module/util/foundry-utils.js'
import { i18nFallback } from '@module/util/i18nFallback.js'
import { systemPath } from '@module/util/misc.js'
import * as Settings from '@module/util/miscellaneous-settings.js'

import { CanRollResult, canConsumeAction } from './canRoll.js'
import { rollData } from './dieroll.js'
import { OtfDamageAction, OtfRollAction } from './types.js'

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
  messageMode: MessageMode
  attack?: MeleeAttackModel | RangedAttackModel
}

interface SimpleDieRollConfirmationData {
  type: 'simpleRoll'
  messages: string[]
  action: OtfRollAction
  actor?: Actor.Implementation | null
  token?: Token | null
  formula: string
  name: string
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

type ModifierData = { title: string; class: string; modifiers: string[] }[]

export type RollConfirmationData = DieRollConfirmationData | DamageRollConfirmationData | SimpleDieRollConfirmationData

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
    currentModifiers: Modifier[]
    modifierData: ModifierData
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
    currentModifiers: Modifier[]
    modifierData: ModifierData
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
    //we need to close the instance if open before reusing, so that the modifier bucket is reset
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
      resizable: false,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      removeMod: RollConfirmationDialog.#onClickRemoveMod,
      cancel: RollConfirmationDialog.#onCancelButton,
      roll: RollConfirmationDialog.#onRollButton,
    },
  }

  override get title(): string {
    return game.i18n?.localize('GURPS.confirmRoll') ?? 'Roll Confirmation'
  }

  static override PARTS = {
    roll: {
      template: systemPath('templates/roll-confirmation/confirmation-roll.hbs'),
    },
    damage: {
      template: systemPath('templates/roll-confirmation/confirmation-damage-roll.hbs'),
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
      case 'simpleRoll':
        options.parts = ['damage', 'footer']
        break
    }
  }

  rollTypeData: Record<ROLL_TYPE, { itemIcon: string; itemColor: string; rollTypeName: string }> = {
    [ROLL_TYPE.MELEE]: {
      itemIcon: 'fa-solid fa-sword',
      itemColor: 'rgb(12,79,119)',
      rollTypeName: game.i18n?.localize('GURPS.melee') ?? '',
    },
    [ROLL_TYPE.RANGED]: {
      itemIcon: 'fa-solid fa-crosshairs',
      itemColor: 'rgb(12,79,119)',
      rollTypeName: game.i18n?.localize('GURPS.ranged') ?? '',
    },
    [ROLL_TYPE.PARRY]: {
      itemIcon: 'fa-solid fa-swords',
      itemColor: '#9a5f16',
      rollTypeName: game.i18n?.localize('GURPS.parry') ?? '',
    },
    [ROLL_TYPE.BLOCK]: {
      itemIcon: 'fa-solid fa-shield-halved',
      itemColor: '#9a5f16',
      rollTypeName: game.i18n?.localize('GURPS.block') ?? '',
    },
    [ROLL_TYPE.DAMAGE]: {
      itemIcon: 'fa-solid fa-dice',
      itemColor: '#015401',
      rollTypeName: '',
    },
    [ROLL_TYPE.SKILL]: {
      itemIcon: 'fa-solid fa-book',
      itemColor: '#015401',
      rollTypeName: game.i18n?.localize('GURPS.skill') ?? '',
    },
    [ROLL_TYPE.SPELL]: {
      itemIcon: 'fa-solid fa-wand-magic-sparkles',
      itemColor: '#6f63d9',
      rollTypeName: game.i18n?.localize('GURPS.spell') ?? '',
    },
    [ROLL_TYPE.DODGE]: {
      itemIcon: 'fa-solid fa-person-running-fast',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.dodge') ?? '',
    },
    [ROLL_TYPE.ST]: {
      itemIcon: 'fa-solid fa-dumbbell',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.attributesSTNAME') ?? '',
    },
    [ROLL_TYPE.DX]: {
      itemIcon: 'fa-solid fa-person-running',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.attributesDXNAME') ?? '',
    },
    [ROLL_TYPE.IQ]: {
      itemIcon: 'fa-solid fa-brain',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.attributesIQNAME') ?? '',
    },
    [ROLL_TYPE.HT]: {
      itemIcon: 'fa-solid fa-heart',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.attributesHTNAME') ?? '',
    },
    [ROLL_TYPE.WILL]: {
      itemIcon: 'fa-solid fa-brain',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.attributesWILLNAME') ?? '',
    },
    [ROLL_TYPE.PER]: {
      itemIcon: 'fa-solid fa-signal-stream',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.attributesPERNAME') ?? '',
    },
    [ROLL_TYPE.FRIGHT_CHECK]: {
      itemIcon: 'fa-solid fa-face-scream',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.frightcheck') ?? '',
    },
    [ROLL_TYPE.VISION]: {
      itemIcon: 'fa-solid fa-eye',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.vision') ?? '',
    },
    [ROLL_TYPE.HEARING]: {
      itemIcon: 'fa-solid fa-ear',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.hearing') ?? '',
    },
    [ROLL_TYPE.TASTE_SMELL]: {
      itemIcon: 'fa-solid fa-nose',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.tastesmell') ?? '',
    },
    [ROLL_TYPE.TOUCH]: {
      itemIcon: 'fa-solid fa-hand-point-up',
      itemColor: '#620707',
      rollTypeName: game.i18n?.localize('GURPS.touch') ?? '',
    },
    [ROLL_TYPE.CR]: {
      itemIcon: 'fa-solid fa-head-side-gear',
      itemColor: '#c5360b',
      rollTypeName: game.i18n?.localize('GURPS.ControlRoll') ?? '',
    },
    [ROLL_TYPE.UNKNOWN]: {
      itemIcon: 'fa-solid fa-dice',
      itemColor: '#620707',
      rollTypeName: '',
    },
  }

  #getRollData(rollType: ROLL_TYPE) {
    const { itemIcon, itemColor, rollTypeName } = this.rollTypeData[rollType]
    const displayRollType =
      rollTypeName !== '' && this._data.type === 'roll' ? this._data.formula || this._data.name : rollTypeName

    return { itemIcon, itemColor, rollTypeName: displayRollType }
  }

  #getModiferData(rollType: ROLL_TYPE): ModifierData {
    const result: ModifierData = []

    const genericModifiers = ['+1', '+2', '+3', '+4', '+5', '-1', '-2', '-3', '-4', '-5'].map(
      it => GURPS.modules.Otf.parselink(it).text
    )

    result.push({
      title: game.i18n?.localize('GURPS.modifierOthers') ?? '',
      class: 'cr-generic-modifiers',
      modifiers: genericModifiers,
    })

    if (rollType === ROLL_TYPE.RANGED || rollType === ROLL_TYPE.MELEE) {
      result.unshift({
        title: game.i18n?.localize('GURPS.modifiers_.hitLocations') ?? '',
        class: 'cr-hitLocations',
        modifiers: this.#getHitLocations() ?? [],
      })
    }

    if (rollType === ROLL_TYPE.RANGED || rollType === ROLL_TYPE.VISION || rollType === ROLL_TYPE.PER) {
      result.unshift({
        title: game.i18n?.localize('GURPS.modifierRangeTitle') ?? '',
        class: 'cr-speedRange',
        modifiers: GURPS.rangeObject.ranges
          .filter(it => it.penalty < 0)
          .map(
            it =>
              GURPS.modules.Otf.parselink(`" ${it.penalty} ${it.max.toLocaleString()} yd" ${it.penalty} ${it.moddesc}`)
                .text
          ),
      })
    }

    if (rollType === ROLL_TYPE.VISION || rollType === ROLL_TYPE.PER) {
      const modifiersRaw = [...ModifierLiterals.LightingModifiers]
      const title = modifiersRaw.shift() ?? ''
      const modifiers = modifiersRaw.map(it => GURPS.modules.Otf.parselink(it).text)

      result.unshift({
        title: title,
        class: 'cr-lightning',
        modifiers: modifiers,
      })
    }

    if (rollType === ROLL_TYPE.RANGED) {
      const coverModifiers = [
        game.i18n?.localize('GURPS.modifierCoverHead') ?? '',
        game.i18n?.localize('GURPS.modifierCoverHeadShoulder') ?? '',
        game.i18n?.localize('GURPS.modifierCoverHalfExposed') ?? '',
        game.i18n?.localize('GURPS.modifierCoverLight') ?? '',
        game.i18n?.localize('GURPS.modifierCoverBehindFigure') ?? '',
        game.i18n?.localize('GURPS.modifierCoverProne') ?? '',
        game.i18n?.localize('GURPS.modifierCoverProneHeadUp') ?? '',
        game.i18n?.localize('GURPS.modifierCoverProneHeadDown') ?? '',
        game.i18n?.localize('GURPS.modifierCoverCrouch') ?? '',
        game.i18n?.localize('GURPS.modifierCoverThroughHex') ?? '',
      ].map(it => GURPS.modules.Otf.parselink(it).text)

      result.unshift({
        title: game.i18n?.localize('GURPS.modifierCover') ?? '',
        class: 'cr-cover',
        modifiers: coverModifiers,
      })
    }

    if (
      ![
        ROLL_TYPE.MELEE,
        ROLL_TYPE.RANGED,
        ROLL_TYPE.DAMAGE,
        ROLL_TYPE.PARRY,
        ROLL_TYPE.BLOCK,
        ROLL_TYPE.DODGE,
        ROLL_TYPE.SPELL,
        ROLL_TYPE.UNKNOWN,
      ].includes(rollType)
    ) {
      const modifiersRaw = [...ModifierLiterals.TaskDifficultyModifiers]
      const title = modifiersRaw.shift() ?? ''
      const modifiers = modifiersRaw.map(it => GURPS.modules.Otf.parselink(it).text)

      result.unshift({
        title: title,
        class: 'cr-task-difficulty',
        modifiers: modifiers,
      })
    }

    const modifierTypes = rollTypeTagSettings[rollType]
    const rollModifiers = GURPS.modules.Combat.allEnabledOptions()
      .filter(it => !it.rollTypes || it.rollTypes.some(tag => modifierTypes.includes(tag)))
      .map(it => RollConfirmationDialog.#combatOptionOtf(it))

    if (rollModifiers.length !== 0) {
      result.unshift({
        title: game.i18n?.localize('GURPS.modifiers_.rollModifiers') ?? '',
        class: 'cr-rollModifiers',
        modifiers: rollModifiers,
      })
    }

    return result
  }

  #getHitLocations() {
    const target = game.user?.targets.first()

    if (target?.actor?.system.hitlocationsV2) {
      const locations = target.actor.system.hitlocationsV2

      return makeHilLocationModifiers(locations)
    } else if (this._data.actor?.system.hitlocationsV2) {
      const locations = this._data.actor.system.hitlocationsV2

      return makeHilLocationModifiers(locations)
    }

    return undefined

    function makeHilLocationModifiers(locations: ModelCollection<HitLocationEntryV2>) {
      return locations
        .filter(it => it.penalty !== 0)
        .map(it => `${it.penalty.signedString()} ${it.where}`)
        .map(it => GURPS.modules.Otf.parselink(it).text)
    }
  }

  static #combatOptionOtf(option: CombatOption) {
    const label = game.i18n?.localize(`GURPS.modifiers_.${option.id}`)

    return GURPS.modules.Otf.parselink(`${option.mod} ${label}${option.suffix ?? ''}`).text
  }

  override async _prepareContext(
    _options: foundry.applications.api.ApplicationV2.RenderOptions
  ): Promise<RollConfirmationDialog.RenderContext> {
    const gmUser = game.users?.find((it: User) => it.isGM && it.active)
    const token = this._data.token
    const tokenImage = token?.document.texture.src ?? this._data.actor?.img ?? gmUser?.avatar ?? ''
    const isVideo = tokenImage.includes('webm') || tokenImage.includes('mp4')
    const tokenName = (token?.name || this._data.actor?.name) ?? gmUser?.name ?? ''
    const currentModifiers = GURPS.ModifierBucket.modifierStack.modifierList

    if (this._data.type === 'roll') {
      const actor = this._data.actor
      // Get Math Info
      const totalMods = GURPS.ModifierBucket.currentSum()
      const operator = totalMods >= 0 ? '+' : '-'
      const totalRoll = this._data.origTarget + totalMods

      const item = this._data.item
      const itemImage = item?.img || ''
      const { targetColor, rollChance } = rollData(totalRoll)

      const targetRoll = this._data.name + (this._data.origTarget > 0 ? `-${this._data.origTarget}` : '')
      const rollType = getRollTypeFromAction(this._data.action, this._data.attack)
      const { itemIcon, itemColor, rollTypeName } = this.#getRollData(rollType)

      const settingsAllowAfterMaxActions = game.settings?.get(
        GURPS.SYSTEM_NAME,
        Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS
      )
      const settingsUseMaxActions = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_MAX_ACTIONS)
      const dontShowMaxActions =
        settingsUseMaxActions === 'Disable' ||
        (!this._data.canRollResult.isCombatant && settingsUseMaxActions === 'AllCombatant') ||
        settingsAllowAfterMaxActions === 'Allow'

      const canConsume = dontShowMaxActions
        ? undefined
        : canConsumeAction(this._data.action, actor, this._data.attack, this._data.item)

      const consumeActionIcon = dontShowMaxActions
        ? undefined
        : !this._data.canRollResult.hasActions
          ? '<i class="fa-solid fa-exclamation"></i>'
          : canConsume
            ? '<i class="fa-solid fa-plus"></i>'
            : '<i class="fa-solid fa-check"></i>'

      const consumeActionLabel = dontShowMaxActions
        ? undefined
        : !this._data.canRollResult.hasActions
          ? game.i18n?.localize('GURPS.noActionsAvailable')
          : canConsume
            ? game.i18n?.localize('GURPS.willConsumeAction')
            : game.i18n?.localize('GURPS.isFreeAction')

      const consumeActionColor = dontShowMaxActions
        ? undefined
        : !this._data.canRollResult.hasActions
          ? 'rgb(215,185,33)'
          : canConsume
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
        rollType: rollTypeName,
        itemImage: itemImage,
        itemColor,
        itemIcon,
        consumeActionIcon,
        consumeActionColor,
        consumeActionLabel,
        targetRoll: targetRoll,
        currentModifiers,
        modifierData: this.#getModiferData(rollType),
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
    } else if (this._data.type === 'damage')  {
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
      const armorDivisorNumber = action.formula?.match(armorDivisorRegex)?.[1]
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
        currentModifiers,
        modifierData: this.#getModiferData(ROLL_TYPE.DAMAGE),
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
      const displayFormula = this._data.formula
      const usingDiceAdd = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS) ?? false
      const bucketTotal = GURPS.ModifierBucket.currentSum()

      return {
        type: 'damage',
        messages: this._data.messages,
        isVideo,
        tokenImage,
        tokenName,
        damageRoll: displayFormula,
        originalFormula: displayFormula,
        usingDiceAdd,
        targetRoll: this._data.name,
        useMinDamage: false,
        bucketRoll: bucketTotal !== 0 ? `(${bucketTotal > 0 ? '+' : ''}${bucketTotal})` : '',
        bucketRollColor: bucketTotal > 0 ? 'darkgreen' : bucketTotal < 0 ? 'darkred' : '#a8a8a8',
        currentModifiers,
        modifierData: this.#getModiferData(ROLL_TYPE.UNKNOWN),
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

  protected override async _onRender(
    context: foundry.applications.api.ApplicationV2.RenderContext,
    options: foundry.applications.api.ApplicationV2.RenderOptions
  ): Promise<void> {
    super._onRender(context, options)
    GurpsWiring.hookupAllEvents(this.element)
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

  static async #onClickRemoveMod(
    this: RollConfirmationDialog,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault()
    const index = target.dataset.index

    GURPS.ModifierBucket.modifierStack.removeIndex(index)
    GURPS.ModifierBucket.refresh()
  }

  /*
      Only one Roll Confirmation Dialog can be Open at one time, so we reuse the instance.
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
