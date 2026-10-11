import { ActionFuncContext, actionFuncs } from './actionFuncs.js'
import { findBestActionInChain, findBestActionInChainSync } from './best-action.js'
import { CalcOnlyAction, OtfAction } from './types.js'

export async function executeOTF(
  inputstring: string,
  priv: boolean = false,
  event: ActionFuncContext | null = null,
  actor: Actor.Implementation | null = null,
  targets?: string[]
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
    const action = GURPS.modules.Otf.parselink(string)

    answer = false
    if (action?.action) {
      if (!event) event = { shiftKey: priv, ctrlKey: false, altKey: false, data: {} }
      const result = await performAction(action.action, actor || GURPS.LastActor, event, targets)

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
      throw new Error(
        `GURPS.modules.Otf.performAction(calcOnly) requires a synchronous action handler for type "${action.type}"`
      )
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

/**
 * @description Allow an On-the-Fly (OtF) command to be executed by a user.
 * This function prompts each user who is an owner of a token in the target list to confirm that the command should
 * be executed. If the user confirms, the command is executed.
 *
 * @param {Object} options - Options for the dialog.
 * @param {string} options.actor - The source of the OtF command.
 * @param {string} options.command - The command to execute.
 * @param {string} options.actorname - The name of the actor.
 * @param {Array} options.targets - The target tokens for the command.
 */
export function allowOtfExec(options: {actorId: string, command: string, actorname: string, targets: [string, string][]}) {
  options.targets.forEach(tuple => {
    const tokenActor = game.canvas?.tokens?.get(tuple[1])?.actor
    const tokenOwner = tuple[0] ? game.users?.get(tuple[0]) : game.user

    if (tokenOwner?.isSelf && tokenActor?.isOwner) {
      setTimeout(async () => {
        const proceed = await foundry.applications.api.DialogV2.confirm({
          content: `<div>${game.i18n?.format('GURPS.chatWantsToExecute', { command: options.command, name: tokenActor.name, source: options.actorname })}</div>`,
          rejectClose: false,
          modal: true,
        })

        if (proceed) {
          const old = GURPS.LastActor

          GURPS.SetLastActor(tokenActor)
          GURPS.modules.Otf.executeOTF(options.command).then(() => GURPS.SetLastActor(old))
        }
      }, 50)
    }
  })
}