import { MeleeAttackModel } from '@module/action/melee-attack.js'
import { RangedAttackModel } from '@module/action/ranged-attack.js'
import { Combat } from '@module/combat/index.js'
import { TokenActions } from '@module/token-actions.js'
import * as Settings from '@module/util/miscellaneous-settings.js'

import { OtfActionType, OtfRollAction } from "./types.js"



export interface CanRollResult {
  canRoll: boolean
  isSlam: boolean
  hasActions: boolean
  isCombatant: boolean
  message?: string
  targetMessage?: string
  maxActionMessage?: string
  maxAttackMessage?: string
  maxBlockmessage?: string
  maxParryMessage?: string
  rollBeforeStartMessage?: string
}

 export async  function canRoll(
    action: OtfRollAction, // Action parsed from OTF
    actor: Actor.Implementation,
    token: Token.Implementation | null, // Actor Token
    attack?: MeleeAttackModel |  RangedAttackModel,
    item?: Item.Implementation,
  ): Promise<CanRollResult> {
    const isAttack = action.type === OtfActionType.attack
    const isDefense =
      (action.type === OtfActionType.attribute && action.attribute === 'dodge') ||
      action.type === OtfActionType.weaponParry ||
      action.type === OtfActionType.weaponBlock
    const isAttribute = action.type === OtfActionType.attribute
    const isSlam =
      action.type === OtfActionType.damage &&
      (action.orig as string).includes('slam') &&
      (action.orig as string).includes('@')
    const isCombatActive = game.combat?.active === true
    const isCombatant = actor.inCombat
    const isCombatStarted = isCombatActive && game.combat.started === true

    const result: Awaited<ReturnType<typeof canRoll>> = {
      canRoll: true,
      isSlam,
      hasActions: true,
      isCombatant,
    }

    if (!isCombatActive || !isCombatant || !actor.isNewActorType) return result

    //why do we require a target for spells? there are plenty  of spells that don't need a target.
    const needTarget = !isSlam && (isAttack || (action.type === OtfActionType.skillSpell && action.isSpellOnly) || action.type === OtfActionType.damage)

    const checkForTargetSettings = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_ALLOW_TARGETED_ROLLS) ?? 'Allow'

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
      const maneuver = game.i18n?.localize(Combat.Maneuvers.getManeuver(actions.currentManeuver).label) ?? ''
      const rollTypeLabel = game.i18n?.localize(isAttack ? 'GURPS.attackRoll' : 'GURPS.defenseRoll') ?? ''
      const checkManeuverSetting = Combat.getRollBasedOnManeuverPolicy('Warn')

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
    const checkMaxActionsSetting = game.settings?.get(
      GURPS.SYSTEM_NAME,
      Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS) ?? 'Warn'
  
    const maxActions = actor.system.conditions?.actions.maxActions ?? 1
    const extraActions = actions.extraActions ?? 0
    const canConsume = canConsumeAction(action, actor, attack, item)

    if (
      !isAttack &&
      !isDefense &&
      !isAttribute &&
      actions.totalActions >= maxActions + extraActions &&
      canConsume
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxActionMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxActionsReached`)
          : ''
    }

    // Same as above, but for maximum attacks per round
    // using things like Extra Attack
    const itemExtraAttacks = attack?.extraAttacks ?? 0
    //rapid strike bonus don't exist on attacks (should it?)
    //const rapidStrikeBonus = attack?.rapidStrikeBonus ?? 0

    if (
      isAttack &&
      canConsume &&
      Math.max(actions.totalAttacks, actions.totalActions) >=
        maxActions + extraActions + (actions.extraAttacks ?? 0) + itemExtraAttacks //+ rapidStrikeBonus
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxAttackMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxAttacksReached`)
          : ''
    }

    // Same as above, but for maximum blocks per round
    const maxBlocks = actor.system.conditions?.actions.maxBlocks ?? 1

    if (
      isDefense &&
      canConsume &&
      action.type === OtfActionType.weaponBlock &&
      actions.totalBlocks >= maxBlocks + (actions.extraBlocks ?? 0) + extraActions
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxBlockmessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxBlocksReached`)
          : ''
    }

    // Same as above, but for maximum parries per round
    if (
      isDefense &&
      canConsume &&
      action.type === OtfActionType.weaponParry &&
      actions.totalParries >= extraActions + (actions.maxParries ?? 0)
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxParryMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxParriesReached`)
          : ''
    }

    // Check if combat has started
    if (!isCombatStarted) {
      const checkCombatStartedSetting = game.settings?.get(
        GURPS.SYSTEM_NAME,
        Settings.SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START) ?? 'Warn'

      result.canRoll = result.canRoll && checkCombatStartedSetting !== 'Forbid'
      result.rollBeforeStartMessage =
        checkCombatStartedSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkCombatStartedSetting.toLowerCase()}RollsBeforeCombatStarted`)
          : ''
    }

    return result
  }

  /* ---------------------------------------- */

  /**
   * Check if the current action consumes an action slot from the actor.
   * False by default to handle things like attribute rolls.
   */
  export function canConsumeAction(
    action: OtfRollAction,
    actor: Actor.Implementation,
    attack?: MeleeAttackModel | RangedAttackModel,
    item?: Item.Implementation
  ): boolean {

    const useMaxActions = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_MAX_ACTIONS) ?? 'Disable'

    if (useMaxActions === 'Disable') return false

    const isCombatant = actor.inCombat

    if (!isCombatant && useMaxActions === 'AllCombatant') return false

    const isDodge = action.type === OtfActionType.attribute && action.attribute === 'dodge'
    const isAttack = action.type === OtfActionType.attack
    const isDefense =
      isDodge || action?.type === OtfActionType.weaponParry || action?.type === OtfActionType.weaponBlock 
     
    const isSkill = (action?.type === OtfActionType.skillSpell && action.isSkillOnly)
    const isSpell = (action?.type === OtfActionType.skillSpell && action.isSpellOnly)

    const actionIsMarkedAsConsume: boolean | null = ((attack ?? item?.system)?.consumeAction as boolean | undefined) ?? null

    if ((isSpell || isAttack || isDefense) && !isDodge) {
      return actionIsMarkedAsConsume !== null ? actionIsMarkedAsConsume : true
    } else if (isSkill) {
      return actionIsMarkedAsConsume !== null ? actionIsMarkedAsConsume : false
    }

    return false
  }