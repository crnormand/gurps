import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { TokenActions } from 'module/token-actions.js'
import Maneuvers from './maneuver.js'

class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> {
  /* ---------------------------------------- */

  isOfType<SubType extends Actor.SubType>(...types: SubType[]): this is ConfiguredActor<SubType>['document']
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Actor.SubType)
  }

  /* ---------------------------------------- */

  // NOTE: changed from getOnwers() in old system
  get owners(): User.Implementation[] {
    return game.users?.filter(user => user.isOwner) ?? []
  }

  /* ---------------------------------------- */

  // NOTE: STUB. Not convinced this is needed in the new system.
  //
  async openSheet(_newSheet: foundry.applications.api.ApplicationV2): Promise<void> {}

  /* ---------------------------------------- */

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareEmbeddedDocuments(): void {
    super.prepareEmbeddedDocuments()
    if (this.isOfType('character', 'enemy')) {
      ;(this.system as Actor.SystemOfType<'character'>).prepareEmbeddedDocuments()
    }
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  // TODO: review and refactor
  async changeDR(
    formula: string,
    locations: string[]
  ): Promise<{ changed: boolean; msg: string; warn?: string; info?: string }> {
    if (!this.isOfType('character', 'enemy'))
      return { changed: false, msg: '', warn: 'Actor is not a character or enemy.' }
    return this.system.changeDR(formula, locations)
  }

  /* ---------------------------------------- */

  // Check if a roll can be performed.
  async canRoll(
    // TODO: replace with action
    action: AnyObject, // Action parsed from OTF
    token: Token.Implementation, // Actor Token
    chatThing?: string, // String representation of the action
    actorComponent?: AnyObject // Actor Component for the action
  ): Promise<{
    canRoll: boolean
    isSlam: boolean
    hasActions: boolean
    isCombatant: boolean
    message?: string
    targetMessage?: string
    maxActionMessage?: string
    maxBlockmessage?: string
    maxParryMessage?: string
  }> {
    const isAttack = action.type === 'attack'
    const isDefense = action.attribute === 'dodge' || action.type === 'weapon-parry' || action.type === 'weapon-block'
    const isAttribute = action.type === 'attribute'
    const isSlam =
      action.type === 'damage' && (action.orig as string).includes('slam') && (action.orig as string).includes('@')
    const isCombatActive = game.combat?.active === true
    const isCombatant = this.inCombat
    const isCombatStarted = isCombatActive && game.combat.started === true

    const result: Awaited<ReturnType<typeof this.canRoll>> = {
      canRoll: true,
      isSlam,
      hasActions: true,
      isCombatant,
    }

    if (!isCombatActive || !isCombatant || !this.isOfType('character', 'enemy')) return result

    const needTarget = !isSlam && (isAttack || action.isSpellOnly || action.type === 'damage')
    const checkForTargetSettings =
      game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_ALLOW_TARGETED_ROLLS) ?? 'Allow'

    if (isCombatant && needTarget && game.user?.targets.size === 0) {
      result.canRoll = result.canRoll && checkForTargetSettings !== 'Forbid'
      result.targetMessage =
        checkForTargetSettings !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkForTargetSettings.toLowerCase()}NoTargetSelected`)
          : ''
    }

    if (!(token && isCombatActive && isCombatant && !isSlam)) return result

    const actions = await TokenActions.fromToken(token)

    // If the current maneuver is invalid for the action, add a warning message to the
    // result and set canRoll to false depending on the maneuver settings
    if ((!actions.canAttack && isAttack) || (!actions.canDefend && isDefense)) {
      const maneuver = game.i18n?.localize(Maneuvers.getManeuver(actions.currentManeuver).label) ?? ''
      const rollTypeLabel = game.i18n?.localize(isAttack ? 'GURPS.attackRoll' : 'GURPS.defenseRoll') ?? ''
      const checkManeuverSetting =
        game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_ALLOW_ROLL_BASED_ON_MANEUVER) ?? 'Warn'

      const message =
        checkManeuverSetting !== 'Allow'
          ? game.i18n?.format(`GURPS.${checkManeuverSetting.toLowerCase()}CannotRollWithManeuver`, {
              rollTypeLabel,
              maneuver,
            })
          : ''

      result.canRoll = result.canRoll && checkManeuverSetting !== 'Forbid'
      result.message = message
    }

    // If the maximum actions limit has been reached, add a warning message to the
    // result and set canRoll to false depending on the actions settings
    const checkMaxActionsSetting =
      game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS) ?? 'Warn'
    const maxActions = this.system.conditions.actions.maxActions ?? 1
    const extraActions = actions.extraActions ?? 0
    const canConsumeAction = this.canConsumeAction(action, chatThing, actorComponent)

    if (
      !isAttack &&
      !isDefense &&
      !isAttribute &&
      actions.totalActions >= maxActions + extraActions &&
      canConsumeAction
    ) {
    }

    return result
  }

  /* ---------------------------------------- */

  /**
   * Check if the current action consumes an action slot from the actor.
   * False by default to handle things like attribute rolls.
   */
  canConsumeAction(action: AnyObject, chatThing?: string, actorComponent?: AnyObject): boolean {
    if (!action && !chatThing) return false

    const useMaxActions = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_MAX_ACTIONS) ?? 'Disable'
    if (useMaxActions === 'Disable') return false

    const isCombatant = this.inCombat
    if (!isCombatant && useMaxActions === 'AllCombatant') return false

    const actionType = chatThing?.match(/(?<=@|)(\w+)(?=:)/g)?.[0].toLowerCase() ?? ''
    const isAttack = action?.type === 'attack' || ['m', 'r'].includes(actionType)
    const isDefense =
      action?.attribute === 'dodge' ||
      action?.type === 'weapon-parry' ||
      action?.type === 'weapon-block' ||
      ['dodge', 'p', 'b'].includes(actionType)
    const isDodge = action?.attribute === 'dodge' || actionType === 'dodge'
    const isSkill = (action?.type === 'skill-spell' && action.isSkillOnly) || actionType === 'sk'
    const isSpell = (action?.type === 'skill-spell' && action.isSpellOnly) || actionType === 'sp'

    const actionIsMarkedAsConsume: boolean | null = (actorComponent?.consumeAction as boolean | undefined) ?? null

    if ((isSpell || isAttack || isDefense) && !isDodge) {
      return actionIsMarkedAsConsume !== null ? actionIsMarkedAsConsume : true
    } else if (isSkill) {
      return actionIsMarkedAsConsume !== null ? actionIsMarkedAsConsume : false
    }

    return false
  }
}

export { GurpsActorV2 }
