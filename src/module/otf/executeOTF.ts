import { ActionFuncContext, actionFuncs } from './actionFuncs.js'
import { findBestActionInChain, findBestActionInChainSync } from './best-action.js'
import { CalcOnlyAction, OtfAction } from './types.js'

export async function executeOTF(
  inputstring: string,
  priv: boolean = false,
  event: ActionFuncContext | null = null,
  actor: Actor.Implementation | null = null
) {
  if (!inputstring) return false
  inputstring = inputstring.trim()
  if (inputstring[0] == '[' && inputstring[inputstring.length - 1] == ']')
    inputstring = inputstring.substring(1, inputstring.length - 1)

  // Stop splitting on double backslashes. This breaks when you have nested /chat commands, the inner ones with double backslashes.
  // Example: /if [ST] s:{/r [+@margin Successful ST roll]\\/r [Sk:"Forced Entry"]} cs:{...}]}
  // let strings = inputstring.split('\\\\')
  const strings = [inputstring]
  let answer = false

  for (let string of strings) {
    string = string.trim()
    const action = GURPS.parselink(string)

    answer = false
    if (action?.action) {
      if (!event) event = { shiftKey: priv, ctrlKey: false, data: {} }
      const result = await performAction(action.action, actor || GURPS.LastActor, event)

      answer = result
    } else ui.notifications?.warn(`"${string}" did not parse into a valid On-the-Fly formula`)
  }

  return answer
}

export function performAction(
  action: (OtfAction & CalcOnlyAction) | null,
  actor: Actor.Implementation | null,
  event?: ActionFuncContext | null,
  targets?: string[]
): { target: number; thing?: string }
export function performAction(
  action: OtfAction | null,
  actor?: Actor.Implementation | null,
  event?: ActionFuncContext | null,
  targets?: string[]
): Promise<boolean> | boolean

export function performAction(
  action: OtfAction | (OtfAction & CalcOnlyAction) | null,
  actor: Actor.Implementation | null = null,
  event: ActionFuncContext | null = null,
  targets: string[] = []
): Promise<boolean> | { target: number; thing?: string } | boolean {
  if (!action || !(action.type in actionFuncs)) return false

  if ('sourceId' in action && action.sourceId) {
    const originalActor = game.actors?.get(action.sourceId) as Actor.Implementation | undefined

    // If there is no (actor) GURPS.LastActor or the actor is the same as the original actor, use the original actor.
    if (!actor || actor.id === originalActor?.id) actor = originalActor ?? null
  }

  const originalOtf = action.orig
  const calcOnly = 'calcOnly' in action && action.calcOnly

  if (calcOnly) {
    if (['attribute', 'skill-spell'].includes(action.type)) {
      action = findBestActionInChainSync({ action, event, actor, targets, originalOtf })
    }

    if (!action) return { target: 0 }

    const result = actionFuncs[action.type]({ action, actor, event, targets, originalOtf, calcOnly })

    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      throw new Error(`GURPS.performAction(calcOnly) requires a synchronous action handler for type "${action.type}"`)
    }

    return result
  }

  return (async () => {
    let bestAction: OtfAction | null = action

    if (['attribute', 'skill-spell'].includes(action.type)) {
      bestAction = await findBestActionInChain({ action, event, actor, targets, originalOtf })
    }

    if (!bestAction) return false

    const result = await actionFuncs[bestAction.type]({
      action: bestAction,
      actor,
      event,
      targets,
      originalOtf,
      calcOnly,
    })

    if (typeof result === 'boolean') return result as boolean

    return false
  })()
}
