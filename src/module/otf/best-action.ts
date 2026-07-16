import { OtfAction } from '@module/otf/types.js'

export type ActionChain = {
  action: OtfAction | undefined
  actor: Actor.Implementation
  event: Event
  targets: string[]
  originalOtf: string
}

/**
 * Given an action that may be a chain of actions, calculate the "best" action in the chain by evaluating each action's
 * calculated level and returning the one with the highest level. If no actions have a positive level, return null.
 *
 * @param {Object} params
 * @param {OtfAction} params.action - The initial action to evaluate, which may be part of a chain of actions.
 * @param {Actor.Implementation} params.actor - The actor performing the action, used for calculating skill levels.
 * @param {Event} params.event - The event that triggered the action, used for context in calculations.
 * @param {string[]} params.targets - The targets of the action, used for context in calculations.
 * @param {string} params.originalOtf - The original OTF string that generated the action, used for context in
 *    calculations.
 * @returns {Promise<OtfAction|null>} The best action in the chain based on calculated levels, or null if no viable
 *    actions are found.
 */
export async function findBestActionInChain({
  action,
  actor,
  event,
  targets,
  originalOtf,
}: ActionChain): Promise<OtfAction | null> {
  if (!action || !action.type) return null

  const actions: OtfAction[] = []
  const overridetxt = action.overridetxt
  const suppressWarnings = action.suppressWarnings

  while (action) {
    action.overridetxt = overridetxt
    actions.push(action)
    action = action.next
  }

  const calculations = []

  for (const action of actions) {
    if (!action.type) continue

    const func = GURPS.actionFuncs[action.type]

    if (func.constructor.name === 'AsyncFunction') {
      calculations.push(await func({ action, actor, event, targets, originalOtf, calcOnly: true }))
    } else {
      calculations.push(func({ action, actor, event, targets, originalOtf, calcOnly: true }))
    }
  }

  const levels = calculations
    .map(result => (result instanceof Boolean ? { target: 0 } : (result as { target: number })))
    .map(result => (result ? result.target : 0))

  if (!levels.some(level => level > 0)) {
    if (!suppressWarnings) {
      ui.notifications!.warn(game.i18n!.localize('GURPS.noViableSkill'))
    }

    return null // actor does not have any of these skills
  }

  const bestLevel = Math.max(...levels)

  return actions[levels.indexOf(bestLevel)]
}

/**
 * Given an action that may be a chain of actions, calculate the "best" action in the chain by evaluating each action's
 * calculated level and returning the one with the highest level. If no actions have a positive level, return null.
 *
 * @param {Object} params
 * @param {OtfAction} params.action - The initial action to evaluate, which may be part of a chain of actions.
 * @param {Actor.Implementation} params.actor - The actor performing the action, used for calculating skill levels.
 * @param {Event} params.event - The event that triggered the action, used for context in calculations.
 * @param {string[]} params.targets - The targets of the action, used for context in calculations.
 * @param {string} params.originalOtf - The original OTF string that generated the action, used for context in
 *    calculations.
 * @returns {OtfAction|null} The best action in the chain based on calculated levels, or null if no viable
 *    actions are found.
 */
export function findBestActionInChainSync({ action, actor, event, targets, originalOtf }: ActionChain) {
  if (!action || !action.type) return null

  const actions = []
  const overridetxt = action.overridetxt
  const suppressWarnings = action.suppressWarnings

  while (action) {
    action.overridetxt = overridetxt
    actions.push(action)
    action = action.next
  }

  const calculations = actions.map(action =>
    GURPS.actionFuncs[action.type!]({ action: action, actor, event, targets, originalOtf, calcOnly: true })
  )

  const levels = calculations
    .map(result => (result instanceof Boolean ? { target: 0 } : (result as { target: number })))
    .map(result => (result ? result.target : 0))

  if (!levels.some(level => level > 0)) {
    if (!suppressWarnings) {
      ui.notifications!.warn(game.i18n!.localize('GURPS.noViableSkill'))
    }

    return null
  }

  const bestLevel = Math.max(...levels)

  return actions[levels.indexOf(bestLevel)]
}
