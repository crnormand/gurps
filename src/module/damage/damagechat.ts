import { addBucketToDamage, applyDicePlusAddsToDamage, parseDamageFormula } from '@module/damage/addBucketToDamage.js'
import { GurpsRoll } from '@module/modifier-bucket/bucket-app.js'
import { ActionFuncContext } from '@module/otf/actionFuncs.js'
import { applyModifierDescription } from '@module/otf/description-utilities.js'
import { calculateMessageMode } from '@module/otf/dieroll.js'
import { FoundryUtils } from '@module/util/foundry-utils.js'
import { d6ify, generateUniqueId, isNiceDiceEnabled, makeElementDraggable } from '@util/utilities.js'

import { DragDropType } from '../drag-drop-types.js'

//parsed dice data from a damage roll formula, such as 3d-1x5(2) or 1d-2+3
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
}

//result of a single damage roll
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
  loaded: boolean
}

// context Data for the damage chat message. This is used to render the damage chat message template.
type ChatContextData = {
  draggableData: DamageRollData[]
  rolled: boolean
  dice: string
  modifiedDice: string
  damageTypeText: string
  modifiers: Modifier[]
  userTarget: string | undefined
  userTargetId: string | null
  hitlocation: string | null
  numtimes: string
}

// Message data for the damage chat message. flags.gurps.transfer is used for damage drag-and-drop. The damage roll data is stored in the payload.
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

export async function createDamageChatMessage(
  actor: Actor.Implementation | null,
  actionFormula: string,
  damagetype: string,
  event: ActionFuncContext | null,
  overrideText: string | null,
  targets: string[],
  extdamagetype: string | null,
  hitlocation: string | null,
  isBlindRoll: boolean
) {
  const chatContextData = await prepareChatData(
    actor,
    actionFormula,
    damagetype,
    event,
    overrideText,
    targets,
    extdamagetype,
    hitlocation
  )

  if (!chatContextData) {
    return
  }

  await _createChatMessage(actor, chatContextData, isBlindRoll, event)
}

async function _createChatMessage(
  actor: Actor.Implementation | null,
  chatContextData: ChatContextData,
  isBlindRoll: boolean,
  event: ActionFuncContext | null
) {
  const messageMode = calculateMessageMode(FoundryUtils.MessageMode, isBlindRoll, event)
  const html = await foundry.applications.handlebars.renderTemplate(
    'systems/gurps/templates/damage-message.hbs',
    chatContextData
  )

  const speaker = ChatMessage.getSpeaker({ actor: actor as Actor.Stored })

  const messageData: MessageData = {
    user: game.user?.id,
    speaker: speaker,
    content: html,
    rolls: [chatContextData.draggableData[0].roll], // only need to stringify when sending to chat
    blind: messageMode.isBlind,
  }

  messageData.flags = {
    gurps: {
      transfer: {
        type: DragDropType.DAMAGE,
        payload: chatContextData.draggableData,
        userTarget: chatContextData.userTargetId,
      },
    },
  }

  if (isNiceDiceEnabled()) {
    show3DDice(chatContextData.draggableData)
  } else {
    messageData.sound = CONFIG.sounds.dice
  }

  // @ts-expect-error: not sure how this is supposed to work
  ChatMessage.applyMode(messageData, messageMode.value)

  const options = { messageMode: messageMode.value }

  // @ts-expect-error: Create Options for Chat Messages seems not to be properly typed
  ChatMessage.create(messageData, options)
}

function show3DDice(rollData: DamageRollData[]) {
  const rolls = rollData.map(data => data.roll)
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
): Promise<ChatContextData | null> {
  const draggableData = []
  const diceFormula = applyDicePlusAddsToDamage(diceText, true)
  const dice = getDiceData(diceFormula, damageType, [], overrideDiceText, extdamagetype)

  if (dice == null) return null

  const modifedDiceFormula = addBucketToDamage(diceText, true)
  const targetmods = GURPS.ModifierBucket.applyMods()
  const modifiedDice = getDiceData(modifedDiceFormula, damageType, [], null, extdamagetype)

  if (modifiedDice == null) return null

  const repeats =
    (tokenNames?.length ?? 0) > 0
      ? (tokenNames ?? [''])
      : event?.data?.repeat > 1
        ? Array.from(Array(event?.data.repeat), (_, i) => `${i}`)
        : ['']

  // Resolve any modifier descriptors (such as *Costs 1FP)
  const descriptions = targetmods.filter(it => !!it.desc).map(it => it.desc)

  for (const tokenName of repeats) {
    draggableData.push(await executeDamageRoll(actor, modifiedDice, tokenName, [], hitlocation))

    //apply costs to actor
    for (const it of descriptions) {
      await applyModifierDescription(actor, it)
    }
  }

  const chatContextData = makeChatContextData(dice, modifiedDice, targetmods, draggableData)

  return chatContextData
}

function makeChatContextData(
  diceData: DiceData,
  modifiedDice: DiceData,
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
    modifiedDice: modifiedDice.diceText,
    damageTypeText: `${damageType} `,
    modifiers: targetmods,
    userTarget: userTarget?.name,
    userTargetId: userTarget?.id ?? null,
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

  const parsed = parseDamageFormula(originalDiceText)

  if (!parsed) return null

  const diceText = parsed.rollFormula + (parsed.hasMinDamage ? '!' : '')

  const multiplier = parsed.multiplier ?? 1
  const divisor = parsed.armorDivisor ?? 0

  const adds1 =
    parsed.add +
    (parsed.addMargin === '+@margin' ? (GURPS.lastTargetedRoll?.margin ?? 0) : 0) -
    (parsed.addMargin === '-@margin' ? (GURPS.lastTargetedRoll?.margin ?? 0) : 0)
  const adds2 = 0

  const rolled = !!parsed.dice
  const formula = rolled ? d6ify(parsed.rollFormula, '[Damage]') : parsed.rollFormula // GURPS dice (assume 6)

  const displayText = overrideDiceText || diceText // overrideDiceText used when actual formula isn't 'pretty' SW+2 vs 1d6+1+2

  if (damageType === '' || damageType === null) damageType = 'dmg'

  const min = damageType !== 'cr' || parsed.hasMinDamage ? 1 : 0

  const modifier = targetmods.reduce((sum, mod) => sum + mod.modint, 0)

  const additionalText = '' + (multiplier > 1 ? `×${multiplier}` : '') + (divisor != 0 ? ` (${divisor})` : '')

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
  const rolledTotal = roll.total || 0

  const loaded = roll.isLoaded

  const b378 = rolledTotal < diceData.min && diceData.damageType !== 'cr'
  const rollTotal = rolledTotal < diceData.min ? diceData.min : rolledTotal

  const damage = rollTotal * diceData.multiplier

  const needsLineOne = (roll.dice.length > 0 && roll.dice[0].results.length > 1) || diceData.adds1 !== 0
  const needsLineTwo = targetmods.length > 0 || diceData.multiplier > 1
  const diceResults =
    roll.dice.length > 0 ? `Rolled (${roll.dice[0].results.map(it => it.result)})` : diceValue.toString()
  const addSign = diceData.adds1 < 0 ? ' −' : diceData.adds1 > 0 ? ' +' : ''
  const addValue = diceData.adds1 !== 0 ? ` ${Math.abs(diceData.adds1)}` : ''
  const addStar = (b378 ?? !needsLineTwo) ? '*' : ''
  const explainLineOne = needsLineOne ? `${diceResults}${addSign}${addValue} = ${dicePlusAdds}.${addStar}` : null

  const modifierSign = diceData.modifier < 0 ? '−' : '+'
  const modifierValue = Math.abs(diceData.modifier)
  const addStar2 = b378 ? '*' : ''
  const explainLineTwo = needsLineTwo
    ? diceData.multiplier === 1
      ? `Total = ${dicePlusAdds} ${modifierSign} ${modifierValue} = ${damage}.${addStar2}`
      : modifierValue === 0
        ? `Total = ${dicePlusAdds} × ${diceData.multiplier} = ${damage}.${addStar2}`
        : `Total = (${dicePlusAdds} ${modifierSign} ${modifierValue}) × ${diceData.multiplier} = ${damage}.${addStar2}`
    : null

  const hasExplanation = needsLineOne || needsLineTwo

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
    loaded: loaded,
  }

  return contentData
}

let damageDragImage: HTMLImageElement | null = null

export function preloadDamageDragImage() {
  const img = new Image()

  img.src = 'systems/gurps/icons/blood-splatter-clipart-small.webp'
  damageDragImage = img // used in DamageChat._dropCanvasData
}

export async function renderDamageChat(app: ChatMessage, html: HTMLElement, _msg: any) {
  if (!html.querySelector('.damage-chat-message')) return // this is not a damage chat message

  const transfer = app.flags.gurps?.transfer

  if (!transfer) return

  // for each damage-message, set the drag-and-drop events and data
  const damageMessages = html.querySelectorAll('.damage-message')

  if (!!damageMessages && damageMessages.length > 0) {
    for (let index = 0; index < damageMessages.length; index++) {
      const message = damageMessages[index] as HTMLElement
      const payload = transfer.payload[index]

      makeElementDraggable(message, DragDropType.DAMAGE, 'dragging', payload, damageDragImage ?? undefined, [30, 30])
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
      damageDragImage ?? undefined,
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
