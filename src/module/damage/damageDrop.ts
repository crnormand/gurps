import { GurpsToken } from '@module/token/index.js'
import selectTarget from '@module/util/select-target.js'

import { onlyGMsCanOpenADD } from './settings.js'

export async function calculateAndSelectTargetsForDamage(canvas: Canvas, dropData: any) {
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

  let selectedTokens = await selectTokensAtPosition(dropData.x, dropData.y)

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

async function selectTokensAtPosition(x: number, y: number, single = false) {
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
