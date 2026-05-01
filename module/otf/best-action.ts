export type Action = {
  type: string
  overridetxt?: string
  target?: number
  next?: Action
}

export type ActionChain = {
  action: Action | undefined
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
 * @param {Action} params.action - The initial action to evaluate, which may be part of a chain of actions.
 * @param {Actor.Implementation} params.actor - The actor performing the action, used for calculating skill levels.
 * @param {Event} params.event - The event that triggered the action, used for context in calculations.
 * @param {string[]} params.targets - The targets of the action, used for context in calculations.
 * @param {string} params.originalOtf - The original OTF string that generated the action, used for context in
 *    calculations.
 * @returns {Promise<Action|null>} The best action in the chain based on calculated levels, or null if no viable
 *    actions are found.
 */
export async function findBestActionInChain({
  action,
  actor,
  event,
  targets,
  originalOtf,
}: ActionChain): Promise<Action | null> {
  if (!action) return null

  const actions = []
  let overridetxt = action.overridetxt

  while (action) {
    action.overridetxt = overridetxt
    actions.push(action)
    action = action?.next
  }

  const resolvedActions: ({ target: number; thing?: string } | false)[] = []
  for (const a of actions) {
    const func = GURPS.actionFuncs[a.type]

    if (func.constructor.name === 'AsyncFunction') {
      resolvedActions.push(await func({ action: a, actor, event, targets, originalOtf, calcOnly: true }))
    } else {
      resolvedActions.push(
        func({ action: a, actor, event, targets, originalOtf, calcOnly: true }) as
          | { target: number; thing?: string }
          | false
      )
    }
  }

  const levels = resolvedActions.map(result => (result ? result.target : 0))

  if (!levels.some(level => level > 0)) {
    ui.notifications!.warn(game.i18n!.localize('GURPS.noViableSkill'))
    console.warn('No viable skill found in chain of actions:', actions)
    return null // actor does not have any of these skills
  }

  const bestLevel = Math.max(...levels)

  return actions[levels.indexOf(bestLevel)]
}
