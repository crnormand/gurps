import { AnyObject } from 'fvtt-types/utils'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { TokenActions } from '../token-actions.js'
import Maneuvers from './maneuver.js'

// add type = 'characterV2' to ActorMetadata
type ActorMetadata = (typeof foundry.documents.BaseActor)['metadata'] & {
  type: 'characterV2'
}

class GurpsActorV2 extends Actor<Actor.SubType> {
  /* ---------------------------------------- */

  static override get metadata(): ActorMetadata {
    return {
      ...foundry.documents.BaseActor.metadata,
      type: 'characterV2',
    }
  }

  /* ---------------------------------------- */

  isOfType<T extends Actor.SubType>(...types: T[]): this is GurpsActorV2 & { type: T } {
    return types.includes(this.type as T)
  }

  /* ---------------------------------------- */

  // NOTE: changed from getOnwers() in old system
  get owners(): User.Implementation[] {
    return game.users?.filter(user => user.isOwner) ?? []
  }

  /** Alias of accessor owners */
  getOwners(): User.Implementation[] {
    console.warn('getOwners() is deprecated, use owners instead')
    return this.owners
  }

  /* ---------------------------------------- */

  override async update(data: Actor.UpdateData, context: any): Promise<this> {
    this.#translateLegacyHitlocationData(data)
    this.#translateLegacyEncumbranceData(data)

    // Call the parent class's update method
    await super.update(data, context)

    return this
  }

  /**
   * Translate legacy HitLocation data like "system.hitlocations.00003.import" to "system.hitlocationsV2.3.import".
   */
  #translateLegacyHitlocationData(data: Actor.UpdateData) {
    Object.keys(data)
      .filter(key => key.startsWith('system.hitlocations.'))
      .forEach(key => {
        // A key will be of the form "system.hitlocations.<index>.<field>". Map these to
        // "system.hitlocationsV2.<index>.<field>".
        const index = key.split('.')[2]
        let field = key.split('.').slice(3).join('.')
        let value = data[key as keyof typeof data]

        if (field === 'roll') field = 'rollText' // remap 'roll' to 'rollText'
        if (field === 'dr') field = '_dr' // remap 'dr' to '_dr'

        if (['import', 'penalty', '_dr', 'drMod', 'drItem', 'drCap'].includes(field)) {
          if (typeof value === 'string') {
            value = parseInt(value) || 0
          }
        }
        // @ts-expect-error
        data[`system.hitlocationsV2.${parseInt(index)}.${field}`] = value

        delete data[key as keyof typeof data]
      })
  }

  /**
   * Translate legacy Encumbrance current index from "system.encumbrance.2.current = true" to "system.additionalresources.currentEncumbrance = 2"
   */
  #translateLegacyEncumbranceData(data: Actor.UpdateData) {
    Object.keys(data)
      .filter(key => key.startsWith('system.encumbrance.'))
      .forEach(key => {
        const index = key.split('.')[2]
        const field = key.split('.').slice(3).join('.')
        const value = data[key as keyof typeof data]

        if (field === 'current' && value === true) {
          // @ts-expect-error
          data[`system.additionalresources.currentEncumbrance`] = index
        }

        delete data[key as keyof typeof data]
      })
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  // TODO Remove this eventually.
  async internalUpdate(data: Actor.UpdateData, context: any): Promise<this> {
    console.warn('internalUpdate() is deprecated, use update() instead')
    console.trace('internalUpdate', data)
    return await this.update(data, context)
  }

  /* ---------------------------------------- */

  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: AnyObject
  ): Promise<boolean> {
    if (this.isOfType('character', 'enemy')) {
      return (this.system as Actor.SystemOfType<'characterV2'>).addTaggedRollModifiers(chatThing, optionalArgs, attack)
    }
    console.warn('Actor is not a character or enemy.')
    return false
  }

  /**
   * Parse roll info based on action type.
   *
   * @param {object} action - Object from GURPS.parselink
   * @param {string} chatthing - internal code for roll
   * @param {string} formula - formula for roll
   * @param {string} thing - name of the source of the roll
   * @returns {{}} result
   * @returns {string} result.name - Name of the action which originates the roll
   * @returns {[string]} result.uuid - UUID of the actor component that originates the roll
   * @returns {[string]} result.itemId - ID of the item that originates the roll
   * @returns {[string]} result.fromItem - ID of the parent item of the item that originates the roll
   * @returns {[string]} result.pageRef - Page reference of the item that originates the roll
   */
  findUsingAction(
    action: { type: string; name: string; orig: string },
    chatthing: string,
    formula: string,
    thing: string
  ): { name: string; uuid: string | null; itemId: string | null; fromItem: string | null; pageRef: string | null } {
    if (this.isOfType('character', 'enemy')) {
      return (this.system as Actor.SystemOfType<'characterV2'>).findUsingAction(action, chatthing, formula, thing)
    }

    console.warn('Actor is not a character or enemy.')
    return {
      name: thing,
      uuid: null,
      itemId: null,
      fromItem: null,
      pageRef: null,
    }
  }

  /**
   * Check if a roll can be performed.
   */
  async canRoll(
    // TODO Replace with Action.
    action: AnyObject, // Action parsed from OTF.
    token: Token.Implementation, // Actor token.
    chatThing: string, // String representation of the Action.
    actorComponent?: AnyObject // Actor component for the action.
  ): Promise<{
    canRoll: boolean
    isSlam: boolean
    hasActions: boolean
    isCombatant: boolean
    message?: string
    targetMessage?: string
    maxActionMessage?: string
    maxAttackMessage?: string
    maxBlockMessage?: string
    maxParryMessage?: string
    rollBeforeStartMessage?: string
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
      game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_ALLOW_TARGETED_ROLLS) ?? 'Allow'

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
        game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_ALLOW_ROLL_BASED_ON_MANEUVER) ?? 'Warn'

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
      game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS) ?? 'Warn'
    const maxActions = (this.system as Actor.SystemOfType<'characterV2'>).conditions.actions.maxActions ?? 1
    const extraActions = actions.extraActions ?? 0
    const canConsumeAction = this.canConsumeAction(action, chatThing, actorComponent)

    if (
      !isAttack &&
      !isDefense &&
      !isAttribute &&
      actions.totalActions >= maxActions + extraActions &&
      canConsumeAction
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
    const itemExtraAttacks = actorComponent?.extraAttacks ?? 0
    const rapidStrikeBonus = actorComponent?.rapidStrikeBonus ?? 0

    if (
      isAttack &&
      canConsumeAction &&
      Math.max(actions.totalAttacks, actions.totalActions) >=
        maxActions + extraActions + (actions.extraAttacks ?? 0) + itemExtraAttacks + rapidStrikeBonus
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxAttackMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxAttacksReached`)
          : ''
    }

    // Same as above, but for maximum blocks per round
    const maxBlocks = (this.system as Actor.SystemOfType<'characterV2'>).conditions.actions.maxBlocks ?? 1
    if (
      isDefense &&
      canConsumeAction &&
      action.type === 'weapon-block' &&
      actions.totalBlocks >= maxBlocks + (actions.extraBlocks ?? 0) + extraActions
    ) {
      result.canRoll = result.canRoll && checkMaxActionsSetting !== 'Forbid'
      result.hasActions = false
      result.maxBlockMessage =
        checkMaxActionsSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkMaxActionsSetting.toLowerCase()}MaxBlocksReached`)
          : ''
    }

    // Same as above, but for maximum parries per round
    if (
      isDefense &&
      canConsumeAction &&
      action.type === 'weapon-parry' &&
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
      const checkCombatStartedSetting =
        game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START) ?? 'Warn'

      result.canRoll = result.canRoll && checkCombatStartedSetting !== 'Forbid'
      result.rollBeforeStartMessage =
        checkCombatStartedSetting !== 'Allow'
          ? game.i18n?.localize(`GURPS.${checkCombatStartedSetting.toLowerCase()}RollsBeforeCombatStarted`)
          : ''
    }

    return result
  }

  /**
   * Check if the current action consumes an action slot from the actor.
   * False by default to handle things like attribute rolls.
   */
  canConsumeAction(action: AnyObject, chatThing?: string, actorComponent?: AnyObject): boolean {
    if (!action && !chatThing) return false

    const useMaxActions = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_MAX_ACTIONS) ?? 'Disable'
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

  /**
   * This method is called when "system.conditions.maneuver" changes on the actor (via the update method)
   * @param {string} maneuverText
   */
  async replaceManeuver(maneuverText: string) {
    let tokens = this._findTokens()
    for (const t of tokens) await t.setManeuver(maneuverText)
  }

  _findTokens(): Token.Implementation[] {
    if (this.isToken && this.token?.layer) {
      let token = this.token.object
      return token ? [token] : []
    }
    return this.getActiveTokens()
  }
}

export { GurpsActorV2 }
