'use strict'

import { addBucketToDamage } from '@module/damage/addBucketToDamage.js'
import { GurpsRoll } from '@module/modifier-bucket/bucket-app.js'
import { ActionFuncContext } from '@module/otf/actionFuncs.js'
import { applyModifierDescription } from '@module/otf/description-utilities.js'
import { calculateMessageMode } from '@module/otf/dieroll.js'
import { GurpsToken } from '@module/token/gurps-token.js'
import { FoundryUtils } from '@module/util/foundry-utils.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import selectTarget from '@module/util/select-target.js'
import { d6ify, generateUniqueId, isNiceDiceEnabled, makeElementDraggable } from '@util/utilities.js'

import { DragDropType } from '../drag-drop-types.js'

import { onlyGMsCanOpenADD } from './settings.js'

type DiceData = {
  formula: string
  rolled: boolean
  modifier: number
  diceText: string
  damageType: string
  extdamagetype: string | null
  multiplier: number
  divisor: number
  adds1: number
  adds2: number
  min: number
  loaded?: boolean
}

export type DamageRollData = {
  id: string
  attacker: string | null
  dice: string
  damageType: string
  damageTypeText: string
  damageModifier: string | null
  armorDivisor: number
  damage: number
  hasExplanation: boolean
  explainLineOne: string | null
  explainLineTwo: string | null
  isB378: boolean
  roll: GurpsRoll
  target: string
  hitlocation: string | null
}

type ChatContextData = {
  draggableData: DamageRollData[]
  rolled: boolean
  dice: string
  loaded: boolean
  damageTypeText: string
  modifiers: string[]
  userTarget: string | undefined
  hitlocation: string | null
  numtimes: string
}

type MessageData = {
  user?: string
  speaker: ChatMessage.SpeakerData
  content: string
  rolls: GurpsRoll[]
  blind: boolean
  sound?: string
  flags?: {
    gurps?: {
      transfer?: {
        type: DragDropType
        payload: DamageRollData[]
        userTarget: string | null
      }
    }
  }
}

export async function prepareChatData(
  actor: Actor.Implementation | null,
  diceText: string,
  damageType: string,
  event: ActionFuncContext | null,
  overrideDiceText: string | null,
  tokenNames: string[] | undefined,
  extdamagetype: string | null = null,
  hitlocation: string | null = null
) {
  const draggableData = []
  const diceFormula = addBucketToDamage(diceText, true)
  const targetmods = GURPS.ModifierBucket.applyMods()
  const dice = getDiceData(diceFormula, damageType, [], overrideDiceText, extdamagetype)

  if (dice == null) return

  const repeats =
    (tokenNames?.length ?? 0) > 0
      ? (tokenNames ?? [''])
      : event?.data?.repeat > 1
        ? Array.from(Array(event?.data.repeat), (_, i) => `${i}`)
        : ['']

  // Resolve any modifier descriptors (such as *Costs 1FP)
  const descriptions = targetmods.filter(it => !!it.desc).map(it => it.desc)

  for (const tokenName of repeats) {
    draggableData.push(await executeDamageRoll(actor, dice, tokenName, targetmods, hitlocation))

    //apply costs to actor
    for (const it of descriptions) {
      await applyModifierDescription(actor, it)
    }
  }

  const chatContextData = makeChatContextData(dice, targetmods, draggableData)

  return chatContextData
}

export function makeChatContextData(
  diceData: DiceData,
  targetmods: Modifier[],
  draggableData: DamageRollData[]
): ChatContextData {
  const userTarget = game.user?.targets.values().next().value

  let damageType = diceData.damageType === 'dmg' ? '' : diceData.damageType

  damageType = diceData.extdamagetype ? `${damageType} ${diceData.extdamagetype}` : damageType

  return {
    draggableData: draggableData,
    rolled: diceData.rolled,
    dice: diceData.diceText,
    loaded: diceData.loaded ?? false,
    damageTypeText: `${damageType} `,
    modifiers: targetmods.map(it => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
    userTarget: userTarget?.name,
    hitlocation: draggableData[0].hitlocation,
    numtimes: draggableData.length > 1 ? ' x' + draggableData.length : '',
  }
}

export function getDiceData(
  originalDiceText: string,
  damageType: string,
  targetmods: Modifier[],
  overrideDiceText: string | null,
  extdamagetype: string | null
): DiceData | null {
  // format for diceText:
  //
  // '<dice>d+<adds1>+<adds2>x<multiplier>(<divisor>)'
  //
  // - Multipliers are integers that appear after a multiplication sign (x, X, *, or ×).
  //
  // - Armor divisors are decimal numbers in parentheses: (2), (5), (0.2), (0.5). (Accept
  //    an optional space between the armor divisor and the preceding characters.)
  //
  // Examples: 3d, 1d-1, 3dx5, 3d-1x5, 2d(2), 5d-1(0.2), 3dx2(5), 4d-1x4(5).
  //
  // Added support for a second add, such as: 1d-2+3 -- this was to support damage expressed
  // using basic damage syntax, such as "sw+3" (which could translate to '1d-2+3', for exmaple).

  originalDiceText = originalDiceText.replace('−', '-')
  const result = DamageChat.fullRegex.exec(originalDiceText)

  if (!result) {
    ui.notifications?.warn(`Invalid Dice formula: "${originalDiceText}"`)

    return null
  }

  let diceText = result.groups?.roll || ''

  if (originalDiceText.slice(-1) === '!') diceText = diceText + '!'
  diceText = diceText.replace('−', '-') // replace minus (&#8722;) with hyphen

  const multiplier = result.groups?.mult ? parseFloat(result.groups.mult) : 1
  const divisor = result.groups?.divisor ? parseFloat(result.groups.divisor) : 0

  let adds1 = 0
  let temp = result.groups?.adds1 ? result.groups.adds1 : ''

  if (!!temp && temp !== '') {
    const match = temp.match(/([+-])@margin/)

    if (match) {
      const mrg = GURPS.lastTargetedRoll?.margin || 0

      if (match[1] == '+') temp = '' + mrg
      else {
        if (mrg <= 0) temp = '' + mrg
        else temp = '-' + mrg
      }
    }

    temp = temp.startsWith('+') ? temp.slice(1) : temp
    adds1 = parseInt(temp)
  }

  let adds2 = 0

  temp = result.groups?.adds2 ? result.groups.adds2 : ''

  if (!!temp && temp !== '') {
    temp = temp.startsWith('+') ? temp.slice(1) : temp
    adds2 = parseInt(temp)
  }

  let formula = diceText
  let rolled = false

  if (result.groups?.D) {
    rolled = true
    if (result.groups.D === 'd') formula = d6ify(diceText, '[Damage]') // GURPS dice (assume 6)
  }

  const displayText = overrideDiceText || diceText // overrideDiceText used when actual formula isn't 'pretty' SW+2 vs 1d6+1+2
  let min = 1

  if (damageType === '' || damageType === null) damageType = 'dmg'
  if (damageType === 'cr') min = 0

  if (formula.slice(-1) === '!') {
    formula = formula.slice(0, -1)
    min = 1
  }

  let modifier = 0

  for (const mod of targetmods) {
    modifier += mod.modint
  }

  let additionalText = ''

  if (multiplier > 1) {
    additionalText += `×${multiplier}`
  }

  if (divisor != 0) {
    additionalText += ` (${divisor})`
  }

  const diceData = {
    formula: formula,
    rolled: rolled,
    modifier: modifier,
    diceText: displayText + additionalText,
    damageType: damageType,
    extdamagetype: extdamagetype,
    multiplier: multiplier,
    divisor: divisor,
    adds1: adds1,
    adds2: adds2,
    min: min,
  }

  // console.log(diceData)
  return diceData
}

export async function executeDamageRoll(
  actor: Actor.Implementation | null,
  diceData: DiceData,
  tokenName: string,
  targetmods: Modifier[],
  hitlocation: string | null
): Promise<DamageRollData> {
  const roll = Roll.create(diceData.formula + `+${diceData.modifier}`) as GurpsRoll

  await roll.evaluate()

  return createDamageRollData(actor, diceData, tokenName, targetmods, hitlocation, roll)
}

export function createDamageRollData(
  actor: Actor.Implementation | null,
  diceData: DiceData,
  tokenName: string,
  targetmods: Modifier[],
  hitlocation: string | null,
  roll: GurpsRoll
): DamageRollData {
  const diceValue = parseInt(roll.result.split(' ')[0]) // in 0.8.X, result is string, so must make into int
  const dicePlusAdds = diceValue + diceData.adds1 + diceData.adds2
  let rollTotal = roll.total || 0

  diceData.loaded = roll.isLoaded

  let b378 = false

  if (rollTotal < diceData.min) {
    rollTotal = diceData.min

    if (diceData.damageType !== 'cr') {
      b378 = true
    }
  }

  const damage = rollTotal * diceData.multiplier

  let explainLineOne = null

  if ((roll.dice.length > 0 && roll.dice[0].results.length > 1) || diceData.adds1 !== 0) {
    let tempString = ''

    if (roll.dice.length > 0) {
      tempString = roll.dice[0].results.map(it => it.result).join()
      tempString = `Rolled (${tempString})`
    } else {
      tempString = diceValue.toString()
    }

    if (diceData.adds1 !== 0) {
      const sign = diceData.adds1 < 0 ? '−' : '+'
      const value = Math.abs(diceData.adds1)

      tempString = `${tempString} ${sign} ${value}`
    }

    if (diceData.adds2 !== 0) {
      const sign = diceData.adds2 < 0 ? '-' : '+'
      const value = Math.abs(diceData.adds2)

      tempString = `${tempString} ${sign} ${value}`
    }

    explainLineOne = `${tempString} = ${dicePlusAdds}.`
  }

  let explainLineTwo = null
  const sign = diceData.modifier < 0 ? '−' : '+'
  const value = Math.abs(diceData.modifier)

  if (targetmods.length > 0 && diceData.multiplier > 1) {
    explainLineTwo = `Total = (${dicePlusAdds} ${sign} ${value}) × ${diceData.multiplier} = ${damage}.`
  } else if (targetmods.length > 0) {
    explainLineTwo = `Total = ${dicePlusAdds} ${sign} ${value} = ${damage}.`
  } else if (diceData.multiplier > 1) {
    explainLineTwo = `Total = ${dicePlusAdds} × ${diceData.multiplier} = ${damage}.`
  }

  const hasExplanation = !!explainLineOne || !!explainLineTwo

  if (hasExplanation && b378) {
    if (explainLineTwo) explainLineTwo = `${explainLineTwo}*`
    else explainLineOne = `${explainLineOne}*`
  }

  const contentData: DamageRollData = {
    id: generateUniqueId(),
    attacker: actor?.id ?? game.user?.id ?? '',
    dice: diceData.diceText,
    damageType: diceData.damageType,
    damageTypeText: diceData.damageType === 'dmg' ? ' ' : `'${diceData.damageType}' `,
    damageModifier: diceData.extdamagetype,
    armorDivisor: diceData.divisor,
    damage: damage,
    hasExplanation: hasExplanation,
    explainLineOne: explainLineOne,
    explainLineTwo: explainLineTwo,
    isB378: b378,
    roll: roll,
    target: tokenName,
    hitlocation: hitlocation,
  }

  return contentData
}

/**
 * DamageChat is responsible for parsing a damage roll and rendering the appropriate chat message for
 * it.
 *
 * The chat message will contain a drag-and-droppable div that will be used to apply the damage to a
 * specific actor. This object takes care of binding the dragstart and dragend events to that div.
 */
export default class DamageChat {
  static damageDragImage: HTMLImageElement | null = null

  static async _renderDamageChat(app: ChatMessage, html: HTMLElement, _msg: any) {
    if (!html.querySelector('.damage-chat-message')) return // this is not a damage chat message

    const transfer = app.flags.gurps?.transfer

    if (!transfer) return

    // for each damage-message, set the drag-and-drop events and data
    const damageMessages = html.querySelectorAll('.damage-message')

    if (!!damageMessages && damageMessages.length > 0) {
      for (let index = 0; index < damageMessages.length; index++) {
        const message = damageMessages[index] as HTMLElement
        const payload = transfer.payload[index]

        makeElementDraggable(
          message,
          DragDropType.DAMAGE,
          'dragging',
          payload,
          DamageChat.damageDragImage ?? undefined,
          [30, 30]
        )
      }
    } // end-if (!!damageMessages && damageMessages.length)

    // for the damage-all-message, set the drag-and-drop events and data
    const allDamageMessage = html.querySelectorAll('.damage-all-message')

    if (!!allDamageMessage && allDamageMessage.length == 1) {
      const message = allDamageMessage[0] as HTMLElement

      makeElementDraggable(
        message,
        DragDropType.DAMAGE,
        'dragging',
        transfer.payload,
        DamageChat.damageDragImage ?? undefined,
        [30, 30]
      )
    }

    // If there was a target, enable the GM's apply button
    const button = html.querySelector('button.apply-all') as HTMLElement | null

    if (button == null) return

    button.style.display = 'none'

    if (!!transfer.userTarget && transfer.userTarget != null) {
      if (game.user?.isGM) {
        button.style.display = 'block'

        button.addEventListener('click', () => {
          // get actor from id
          const token = canvas?.tokens?.get(transfer.userTarget ?? '') // ...
          // get payload; its either the "all damage" payload or ...
          const actor = token?.actor

          if (actor) actor.handleDamageDrop(transfer.payload)
          else ui.notifications?.warn('Unable to find token with ID:' + transfer.userTarget)
        })
      }
    }
  }

  /**
   * TODO This method is called for damage, items, and equipment. It should NOT be defined here.
   * @param {Canvas} canvas
   * @param {{ type: string; x: number; y: number; payload: any; }} dropData
   */
  static async _dropCanvasData(
    canvas: foundry.canvas.Canvas,
    dropData: { type: string; x: number; y: number; payload: any }
  ) {
    switch (dropData.type) {
      case DragDropType.DAMAGE:
        await DamageChat._calculateAndSelectTargets(canvas, dropData)

        return false
    }

    return true
  }

  static async create(
    actor: Actor.Implementation | null,
    diceText: string,
    damageType: string,
    event: ActionFuncContext | null,
    overrideDiceText: string | null,
    tokenNames: string[] | undefined,
    extdamagetype: string | null = null,
    hitlocation: string | null = null,
    isBlindRoll: boolean = false
  ): Promise<void> {
    const message = new DamageChat()

    let targetmods: Modifier[] = []
    const draggableData = []
    let dice: DiceData | null = null
    let diceFormula = addBucketToDamage(diceText, true) // run before applyMods()
    const taggedSettings = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)

    if (!tokenNames || tokenNames.length == 0) tokenNames = ['']

    const oldAutoEmpty = GURPS.ModifierBucket.modifierStack.AUTO_EMPTY

    GURPS.ModifierBucket.modifierStack.AUTO_EMPTY = false

    for (const tokenName of tokenNames) {
      targetmods = GURPS.ModifierBucket.applyMods() // append any global mods

      let diceMods: Modifier[]

      if (taggedSettings?.autoAdd) {
        diceMods = []
      } else {
        diceFormula = diceText
        diceMods = targetmods
      }

      dice = message._getDiceData(diceFormula, damageType, diceMods, overrideDiceText, extdamagetype)
      if (dice == null) return

      if (!!event && event.data?.repeat > 1) for (let i = 0; i < event.data.repeat; i++) tokenNames.push('' + i)

      draggableData.push(await message._createDraggableSection(actor, dice, tokenName, targetmods, hitlocation))

      // Resolve any modifier descriptors (such as *Costs 1FP)
      const descriptions = targetmods.filter(it => !!it.desc).map(it => it.desc)

      for (const it of descriptions) {
        await applyModifierDescription(actor, it)
      }
    }

    if (dice == null) return

    // TODO add hitlocation to Chat message (e.g, something like 'Rolling 3d cut damage to Neck')
    message._createChatMessage(actor, dice, targetmods, draggableData, event, isBlindRoll)

    GURPS.ModifierBucket.clear()
    GURPS.ModifierBucket.modifierStack.AUTO_EMPTY = oldAutoEmpty
  }

  _getDiceData(
    originalDiceText: string,
    damageType: string,
    targetmods: Modifier[],
    overrideDiceText: string | null,
    extdamagetype: string | null
  ): DiceData | null {
    // format for diceText:
    //
    // '<dice>d+<adds1>+<adds2>x<multiplier>(<divisor>)'
    //
    // - Multipliers are integers that appear after a multiplication sign (x, X, *, or ×).
    //
    // - Armor divisors are decimal numbers in parentheses: (2), (5), (0.2), (0.5). (Accept
    //    an optional space between the armor divisor and the preceding characters.)
    //
    // Examples: 3d, 1d-1, 3dx5, 3d-1x5, 2d(2), 5d-1(0.2), 3dx2(5), 4d-1x4(5).
    //
    // Added support for a second add, such as: 1d-2+3 -- this was to support damage expressed
    // using basic damage syntax, such as "sw+3" (which could translate to '1d-2+3', for exmaple).

    const result = DamageChat.fullRegex.exec(originalDiceText)

    if (!result) {
      ui.notifications?.warn(`Invalid Dice formula: "${originalDiceText}"`)

      return null
    }

    let diceText = result.groups?.roll || ''

    if (originalDiceText.slice(-1) === '!') diceText = diceText + '!'
    diceText = diceText.replace('−', '-') // replace minus (&#8722;) with hyphen

    const multiplier = result.groups?.mult ? parseFloat(result.groups.mult) : 1
    const divisor = result.groups?.divisor ? parseFloat(result.groups.divisor) : 0

    let adds1 = 0
    let temp = result.groups?.adds1 ? result.groups.adds1 : ''

    if (!!temp && temp !== '') {
      const match = temp.match(/([+-])@margin/)

      if (match) {
        const mrg = GURPS.lastTargetedRoll?.margin || 0

        if (match[1] == '+') temp = '' + mrg
        else {
          if (mrg <= 0) temp = '' + mrg
          else temp = '-' + mrg
        }
      }

      temp = temp.startsWith('+') ? temp.slice(1) : temp
      adds1 = parseInt(temp)
    }

    let adds2 = 0

    temp = result.groups?.adds2 ? result.groups.adds2 : ''

    if (!!temp && temp !== '') {
      temp = temp.startsWith('+') ? temp.slice(1) : temp
      adds2 = parseInt(temp)
    }

    let formula = diceText
    let rolled = false

    if (result.groups?.D) {
      rolled = true
      if (result.groups.D === 'd') formula = d6ify(diceText, '[Damage]') // GURPS dice (assume 6)
    }

    const displayText = overrideDiceText || diceText // overrideDiceText used when actual formula isn't 'pretty' SW+2 vs 1d6+1+2
    let min = 1

    if (damageType === '' || damageType === null) damageType = 'dmg'
    if (damageType === 'cr') min = 0

    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    let modifier = 0

    for (const mod of targetmods) {
      modifier += mod.modint
    }

    let additionalText = ''

    if (multiplier > 1) {
      additionalText += `×${multiplier}`
    }

    if (divisor != 0) {
      additionalText += ` (${divisor})`
    }

    const diceData = {
      formula: formula,
      rolled: rolled,
      modifier: modifier,
      diceText: displayText + additionalText,
      damageType: damageType,
      extdamagetype: extdamagetype,
      multiplier: multiplier,
      divisor: divisor,
      adds1: adds1,
      adds2: adds2,
      min: min,
    }

    // console.log(diceData)
    return diceData
  }

  /**
   * This method creates the content of each draggable section with
   * damage rolled for a single target.
   */
  async _createDraggableSection(
    actor: Actor.Implementation | null,
    diceData: DiceData,
    tokenName: string,
    targetmods: Modifier[],
    hitlocation: string | null
  ): Promise<DamageRollData> {
    const roll = Roll.create(diceData.formula + `+${diceData.modifier}`) as GurpsRoll

    await roll.evaluate()

    const diceValue = parseInt(roll.result.split(' ')[0]) // in 0.8.X, result is string, so must make into int
    const dicePlusAdds = diceValue + diceData.adds1 + diceData.adds2
    let rollTotal = roll.total || 0

    diceData.loaded = roll.isLoaded

    let b378 = false

    if (rollTotal < diceData.min) {
      rollTotal = diceData.min

      if (diceData.damageType !== 'cr') {
        b378 = true
      }
    }

    const damage = rollTotal * diceData.multiplier

    let explainLineOne = null

    if ((roll.dice.length > 0 && roll.dice[0].results.length > 1) || diceData.adds1 !== 0) {
      let tempString = ''

      if (roll.dice.length > 0) {
        tempString = roll.dice[0].results.map(it => it.result).join()
        tempString = `Rolled (${tempString})`
      } else {
        tempString = diceValue.toString()
      }

      if (diceData.adds1 !== 0) {
        const sign = diceData.adds1 < 0 ? '−' : '+'
        const value = Math.abs(diceData.adds1)

        tempString = `${tempString} ${sign} ${value}`
      }

      if (diceData.adds2 !== 0) {
        const sign = diceData.adds2 < 0 ? '-' : '+'
        const value = Math.abs(diceData.adds2)

        tempString = `${tempString} ${sign} ${value}`
      }

      explainLineOne = `${tempString} = ${dicePlusAdds}.`
    }

    let explainLineTwo = null
    const sign = diceData.modifier < 0 ? '−' : '+'
    const value = Math.abs(diceData.modifier)

    if (targetmods.length > 0 && diceData.multiplier > 1) {
      explainLineTwo = `Total = (${dicePlusAdds} ${sign} ${value}) × ${diceData.multiplier} = ${damage}.`
    } else if (targetmods.length > 0) {
      explainLineTwo = `Total = ${dicePlusAdds} ${sign} ${value} = ${damage}.`
    } else if (diceData.multiplier > 1) {
      explainLineTwo = `Total = ${dicePlusAdds} × ${diceData.multiplier} = ${damage}.`
    }

    const hasExplanation = !!explainLineOne || !!explainLineTwo

    if (hasExplanation && b378) {
      if (explainLineTwo) explainLineTwo = `${explainLineTwo}*`
      else explainLineOne = `${explainLineOne}*`
    }

    const contentData: DamageRollData = {
      id: generateUniqueId(),
      attacker: actor?.id ?? game.user?.id ?? '',
      dice: diceData.diceText,
      damageType: diceData.damageType,
      damageTypeText: diceData.damageType === 'dmg' ? ' ' : `'${diceData.damageType}' `,
      damageModifier: diceData.extdamagetype,
      armorDivisor: diceData.divisor,
      damage: damage,
      hasExplanation: hasExplanation,
      explainLineOne: explainLineOne,
      explainLineTwo: explainLineTwo,
      isB378: b378,
      roll: roll,
      target: tokenName,
      hitlocation: hitlocation,
    }

    return contentData
  }

  async _createChatMessage(
    actor: Actor.Implementation | null,
    diceData: DiceData,
    targetmods: Modifier[],
    draggableData: DamageRollData[],
    event: ActionFuncContext | null,
    isBlindRoll: boolean
  ) {
    let userTarget = null

    if (game.user?.targets.size) {
      userTarget = game.user.targets.values().next().value
    }

    const messageMode = calculateMessageMode(FoundryUtils.MessageMode, isBlindRoll, event)

    let damageType = diceData.damageType === 'dmg' ? '' : diceData.damageType

    damageType = diceData.extdamagetype ? `${damageType} ${diceData.extdamagetype}` : damageType

    const html = await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/damage-message.hbs', {
      draggableData: draggableData,
      rolled: diceData.rolled,
      dice: diceData.diceText,
      loaded: diceData.loaded,
      damageTypeText: `${damageType} `,
      modifiers: targetmods.map(it => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
      userTarget: userTarget?.name,
      hitlocation: draggableData[0].hitlocation,
      numtimes: draggableData.length > 1 ? ' x' + draggableData.length : '',
    })

    const speaker = ChatMessage.getSpeaker({ actor: actor as Actor.Stored })

    const messageData: MessageData = {
      user: game.user?.id,
      speaker: speaker,
      content: html,
      rolls: [draggableData[0].roll], // only need to stringify when sending to chat
      blind: messageMode.isBlind,
    }

    messageData.flags = {
      gurps: {
        transfer: {
          type: DragDropType.DAMAGE,
          payload: draggableData,
          userTarget: userTarget ? userTarget.id : null,
        },
      },
    }

    if (isNiceDiceEnabled()) {
      const rolls = draggableData.map(data => data.roll)
      const throws = []
      const dice: { result: any; resultLabel: any; type: string; vectors: never[]; options: {} }[] = []

      rolls.shift() // The first roll will be handled by DSN's chat handler... the rest we will manually roll
      rolls.forEach(roll => {
        roll.dice.forEach(die => {
          const type = 'd' + die.faces

          die.results.forEach(result =>
            dice.push({
              result: result.result,
              resultLabel: result.result,
              type: type,
              vectors: [],
              options: {},
            })
          )
        })
      })
      throws.push({ dice: dice })

      if (dice.length > 0) {
        // The user made a "multi-damage" roll... let them see the dice!
        // @ts-expect-error - dice3d is added by Dice So Nice module and not in core types
        game.dice3d.show({ throws: throws })
      }
    } else {
      messageData.sound = CONFIG.sounds.dice
    }

    const options = { messageMode: messageMode.value }

    // @ts-expect-error: Create Options for Chat Messages seems not to be properly typed
    ChatMessage.create(messageData, options)
  }

  static async _calculateAndSelectTargets(canvas: Canvas, dropData: any) {
    // We need to know who is:
    // 1. The Attacker Actor: The actor that rolled the damage
    // 2. The Game User: The user which makes the drag
    // 3. The User existing Targets or the Token which user dropped the damage on
    const attackerActor = game.actors?.get(dropData.payload.attacker)
    const { user } = game

    if (!isValidUser(user, attackerActor)) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.invalidUserForDamageWarning') ?? '')

      return false
    }

    let selectedTokens = await DamageChat.selectTokensAtPosition(dropData.x, dropData.y)

    if (selectedTokens.length === 0) {
      selectedTokens = user?.targets.values().toArray() ?? []

      if (!selectedTokens || selectedTokens.length === 0) {
        ui.notifications?.warn(game.i18n?.localize('GURPS.selectTargetForDamageWarning') ?? '')

        return false
      }

      if (selectedTokens.length > 1)
        selectedTokens = await selectTarget(selectedTokens, { selectAll: true, single: false })
    }

    if (selectedTokens.length > 0) {
      for (const target of selectedTokens) {
        dropData.payload.token = target
        if (target.actor) await target.actor.handleDamageDrop(dropData.payload)
      }

      return false
    }

    return true

    function isValidUser(user: User | null | undefined, attackerActor?: Actor.Implementation) {
      if (game.user?.isGM) return true
      const userCanAdd = !onlyGMsCanOpenADD()
      const userOwnsAttacker = attackerActor ? user?.character === attackerActor : false

      if (!userOwnsAttacker) ui.notifications?.warn(game.i18n?.localize('GURPS.noUserForDamageWarning') ?? '')

      return userCanAdd && userOwnsAttacker
    }
  }

  static async selectTokensAtPosition(x: number, y: number, single = false) {
    // // Create a "reactangle" to represent the drop coordinates. It is really a point as width and height are 0.
    // const rect = new PIXI.Rectangle(dropData.x, dropData.y, 0, 0)

    // // Get all tokens under the point.
    // let selectedTokens = canvas.tokens.quadtree
    //   .getObjects(rect, {
    //     collisionTest: o => o.t.hitArea.contains(dropData.x - o.t.x, dropData.y - o.t.y),
    //   })
    //   .values()
    //   .toArray()

    // Get all tokens under the drop point. Use this instead of the quadtree approach because
    // GURPS Token Shapes and Movement manipulates the position of the tokens.
    let selectedTokens =
      (canvas?.tokens?.objects?.children.filter(token =>
        token.hitArea?.contains(x - token.x, y - token.y)
      ) as GurpsToken[]) ?? []

    if (selectedTokens.length > 1) selectedTokens = await selectTarget(selectedTokens, { single: single })

    return selectedTokens
  }

  static fullRegex =
    /^(?<roll>\d+(?<D>d\d*)?(?<adds1>[+-](?:\d+|@?\w+))?(?<adds2>[+-]\d+)?)(?:[×xX*](?<mult>\d+\.?\d*))?(?: ?\((?<divisor>-?\d+(?:\.\d+)?)\))?/
}


/*
let transfer = {
  dice: '3d+5',
  modifiers: [
	'+2 damage (Strong Attack)',
	'+2 damage (Mighty Blow) *Cost 1FP'
  ]
  damage: 21,
  damageType: 'cut',
  isB378: false
}
*/
