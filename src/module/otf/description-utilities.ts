import { COSTS_REGEX } from '@util/parselink.js'
import { zeroFill } from '@util/utilities.js'

/**
 * If the desc contains *Cost ?FP or *Max:9 then perform action
 * @param {GurpsActor|User} actor
 * @param {string} description
 * @returns {null|number} an overriding MAX value if *Max is found, otherwise null.
 */
export async function applyModifierDescription(
  actor: Actor.Implementation,
  description: string
): Promise<number | null> {
  if (!description) return null

  await applyCostsModifier(actor, description)

  return applyMaxModifier(description)
}

/**
 * Handle *Costs modifiers in the description. This can be in the form of "*Costs ?FP", "*Costs 5 HP", "*Costs 3 tr1",
 * or "*Costs 2 tr(TRACKER NAME)". If the actor is not provided, show a warning notification that the cost was not
 * applied. If the cost type is not recognized, prompt the user to select either HP, FP, or a Tracker from a dropdown
 * list of available resources on the actor.
 *
 * @param actor
 * @param description
 */
async function applyCostsModifier(actor: Actor.Implementation, description: string): Promise<void> {
  const match = description.match(COSTS_REGEX)

  if (!match) return

  const cost = parseInt(match.groups!.cost, 10)
  const target = match.groups!.type

  if (!actor) {
    ui.notifications!.warn(game.i18n!.format('GURPS.otf.costNotAppliedNoActor', { points: `${cost}` }))

    return
  }

  // If a User object was passed instead of an Actor, skip applying costs.
  // Users have `isSelf === true` and do not expose the Actor `system` data structure.
  if ((actor as any).isSelf) {
    return
  }

  if (target.match(/^[hf]p/i)) {
    // Match "HP" or "FP" (case-insensitive).
    const key = target.toUpperCase()

    const resourceValue = foundry.utils.getProperty(actor, `system.${key}.value`) as number

    if (resourceValue === undefined || resourceValue === null) {
      ui.notifications!.warn(game.i18n!.format('GURPS.otf.resourceNotFound', { resource: key }))

      return
    }

    await actor.update({ [`system.${key}.value`]: resourceValue - cost })
  } else if (target.match(/^tr\d+/i)) {
    // Match "trNNNN" where NNNN is the tracker number.
    const key = zeroFill(Number(target.replace(/^tr/i, '')), 4)

    const trackerValue = foundry.utils.getProperty(actor, `system.additionalresources.tracker.${key}.value`) as number

    if (trackerValue === undefined || trackerValue === null) {
      ui.notifications!.warn(game.i18n!.format('GURPS.otf.trackerNotFound', { tracker: `tr${key}` }))

      return
    }

    await actor.update({
      [`system.additionalresources.tracker.${key}.value`]: trackerValue - cost,
    })
  } else if (target.match(/^tr\(.+\)/i)) {
    // Format "tr(TRACKER NAME)" where TRACKER NAME is the name of the tracker.
    let trackerName = target.replace(/^tr\((.+)\)/i, '$1').trim()

    // If trackerName is quoted, remove the quotes.
    if (
      (trackerName.startsWith('"') && trackerName.endsWith('"')) ||
      (trackerName.startsWith("'") && trackerName.endsWith("'"))
    ) {
      trackerName = trackerName.slice(1, -1)
    }

    const tracker = (actor.trackersByName as Record<string, any>)[trackerName]

    if (!tracker) {
      ui.notifications!.warn(game.i18n!.format('GURPS.otf.trackerNotFound', { tracker: trackerName }))

      return
    }

    const trackerCurrentValue = foundry.utils.getProperty(
      actor,
      `system.additionalresources.tracker.${tracker.key}.value`
    ) as number

    if (trackerCurrentValue === undefined || trackerCurrentValue === null) {
      ui.notifications!.warn(game.i18n!.format('GURPS.otf.trackerNotFound', { tracker: trackerName }))

      return
    }

    await actor.update({
      [`system.additionalresources.tracker.${tracker.key}.value`]: trackerCurrentValue - cost,
    })
  } else {
    // Build a list of possible resource pools based on the actor's HP, FP, and Trackers. Prompt the user to select one.
    const costs: Record<string, string> = {}
    const system = actor.system as any

    if (system.HP) costs[`system.HP.value`] = `${game.i18n!.localize('GURPS.HP')} (${system.HP.value})`
    if (system.FP) costs[`system.FP.value`] = `${game.i18n!.localize('GURPS.FP')} (${system.FP.value})`

    for (const [key, tracker] of Object.entries((system.additionalresources?.tracker ?? {}) as Record<string, any>)) {
      const trackerName = (tracker?.name ?? '').toString().trim()
      const label = trackerName !== '' ? trackerName : `Tracker ${key}`
      const value = tracker?.value ?? ''

      costs[`system.additionalresources.tracker.${key}.value`] = `${label} (${value})`
    }

    // If there are no valid costs, show a warning notification to the users that the cost was not applied.
    if (Object.keys(costs).length === 0) {
      ui.notifications!.warn(game.i18n!.format('GURPS.otf.costNotAppliedNoPools', { points: `${cost}` }))

      return
    }

    // Unknown resource type: prompt the user for either HP, FP, or a Tracker name.
    const defaultCostKey = costs[`system.FP.value`] ? 'system.FP.value' : Object.keys(costs)[0]
    const response = await askUserForEnergyPool(costs, defaultCostKey)

    if (!response || response === 'cancel') {
      ui.notifications!.warn(game.i18n!.format('GURPS.otf.costNotApplied', { points: `${cost}` }))

      return
    }

    const resourceValue = foundry.utils.getProperty(actor, response) as number

    if (resourceValue === undefined || resourceValue === null) {
      ui.notifications!.warn(game.i18n!.format('GURPS.otf.trackerNotFound', { tracker: response }))

      return
    }

    await actor.update({ [response]: resourceValue - cost })
  }
}

/**
 * Prompt the user to select an energy pool (HP, FP, or a Tracker) from a dropdown list of available resources on the
 * actor.
 * @param costs
 * @param defaultCostKey
 * @returns The selected energy pool key or null if the user cancels.
 */
async function askUserForEnergyPool(costs: Record<string, string>, defaultCostKey: string) {
  return await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n!.localize('GURPS.otf.selectEnergyPool') },
    content: `
            <label for="costType">${game.i18n!.localize('GURPS.otf.selectEnergyPoolDetail')}
              <select id="costType" name="costType" style="width: fit-content;">
                ${Object.entries(costs)
                  .map(([value, label]) => {
                    const escLabel = foundry.utils.escapeHTML(label)
                    const selected = value === defaultCostKey ? ' selected' : ''

                    return `<option value="${value}"${selected}>${escLabel}</option>`
                  })
                  .join('')}
              </select>
            </label>`,
    buttons: [
      {
        default: true,
        action: 'ok',
        label: 'GURPS.ok',
        icon: 'fa-solid fa-circle-check',
        // @ts-expect-error - No types for button.form.elements.
        callback: (_event, button, _dialog) => button.form?.elements?.costType?.value,
      },
      {
        action: 'cancel',
        label: 'GURPS.cancel',
        icon: 'fa-solid fa-times',
      },
    ],
  })
}

/**
 * @param desc
 * @returns {number|null} an overriding MAX value if *Max is found, otherwise null.
 */
function applyMaxModifier(desc: string): number | null {
  const parse = desc.replace(/.*\*max: ?(\d+).*/gi, '$1')

  if (parse !== desc) {
    return parseInt(parse)
  }

  return null // indicating no overriding MAX value
}
