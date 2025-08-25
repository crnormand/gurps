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

  isOfType<SubType extends Actor.SubType>(...types: SubType[]): this is Actor.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Actor.SubType)
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

  // NOTE: STUB. Not convinced this is needed in the new system.
  //
  async openSheet(_newSheet: foundry.applications.api.ApplicationV2): Promise<void> {}

  /**
   * Special GURPS logic: Only one Posture effect can be active at a time. If a new Posture effect is applied,
   * the existing one will be toggled (off).
   */
  override async toggleStatusEffect(
    statusId: string,
    options?: Actor.ToggleStatusEffectOptions
  ): Promise<ActiveEffect.Implementation | boolean | undefined> {
    const status = CONFIG.statusEffects.find(effect => effect.id === statusId)
    if (!status) throw new Error(`Invalid status ID "${statusId}" provided to GurpsActor#toggleStatusEffect`)

    if (this.isPostureEffect(status)) {
      // If the status effect is a posture, remove all other postures first
      let postureEffects = this.getAllActivePostureEffects().filter(e => e.statuses.find(s => s !== statusId))
      for (const it of postureEffects) {
        await super.toggleStatusEffect(it.statuses.first()!, options)
      }
      // await this.deleteEmbeddedDocuments(
      //   'ActiveEffect',
      //   postureEffects.map(e => e.id!),
      //   { parent: this }
      // )
    }

    return await super.toggleStatusEffect(statusId, options)
  }

  /* ---------------------------------------- */

  private isPostureEffect(status: object): boolean {
    return foundry.utils.getProperty(status, 'flags.gurps.effect.type') === 'posture'
  }

  /* ---------------------------------------- */

  private getAllActivePostureEffects() {
    return this.effects.filter(e => this.isPostureEffect(e))
  }

  /* ---------------------------------------- */

  /**
   * Send a private chat message containing the specified text to all users
   * with ownership permission of this Actor document.
   * @param message - Message content to send
   */
  sendChatMessage(message: string) {
    foundry.applications.handlebars
      .renderTemplate('systems/gurps/templates/chat-processing.hbs', { lines: [message] })
      .then(content => {
        const whisper = this.owners.length > 0 ? this.owners.map(user => user.id) : null
        ChatMessage.create({ content, whisper })
      })
  }

  /* ---------------------------------------- */

  get hitLocationsWithDR() {
    return (this.system as Actor.SystemOfType<'characterV2'>).hitLocationsWithDR
  }

  /* ---------------------------------------- */
  /*  CRUD Operations                         */
  /* ---------------------------------------- */

  override async update(data: Actor.UpdateData, context: Actor.Database.UpdateOperation = {}): Promise<this> {
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
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  // TODO Remove this eventually.
  async internalUpdate(data: Actor.UpdateData): Promise<this> {
    console.warn('internalUpdate() is deprecated, use update() instead')
    console.trace('internalUpdate', data)
    return await this.update(data)
  }

  _hitLocationRolls() {
    return (this.system as Actor.SystemOfType<'characterV2'>)._hitLocationRolls
  }

  get defaultHitLocation(): string {
    return game.settings?.get('gurps', 'default-hitlocation') ?? ''
  }

  /* ---------------------------------------- */

  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: AnyObject
  ): Promise<boolean> {
    return (this.system as Actor.SystemOfType<'characterV2'>).addTaggedRollModifiers(chatThing, optionalArgs, attack)
  }

  /**
   * Parse roll info based on action type.
   */
  findUsingAction(
    action: { type: string; name: string; orig: string },
    chatthing: string,
    formula: string,
    thing: string
  ): { name: string; uuid: string | null; itemId: string | null; fromItem: string | null; pageRef: string | null } {
    return (this.system as Actor.SystemOfType<'characterV2'>).findUsingAction(action, chatthing, formula, thing)
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
   * @returns An array of temporary effects that are applied to the actor.
   * This is overriden for CharacterModel where maneuvers are moved to the top of the
   * array.
   */
  override get temporaryEffects(): ActiveEffect.Implementation[] {
    return (this.system as Actor.SystemOfType<'characterV2'>).getTemporaryEffects(super.temporaryEffects)
  }

  /**
   * This method is called when "system.conditions.maneuver" changes on the actor (via the update method)
   * @param {string} maneuverText
   */
  async replaceManeuver(maneuverId: string) {
    this.getDependentTokens().forEach(token => token.object?.setManeuver(maneuverId))
  }

  /* ---------------------------------------- */

  async replacePosture(postureId: string) {
    const id =
      postureId === GURPS.StatusEffectStanding
        ? (this.system as Actor.SystemOfType<'characterV2'>).conditions.posture
        : postureId
    this.toggleStatusEffect(id)
  }

  /* ---------------------------------------- */

  getChecks(checkType: string) {
    return (this.system as Actor.SystemOfType<'characterV2'>).getChecks(checkType)
  }

  /* ---------------------------------------- */

  get _additionalResources() {
    return (this.system as Actor.SystemOfType<'characterV2'>)?.additionalresources ?? {}
  }

  /* ---------------------------------------- */

  async changeDR(formula: string, locations: string[]) {
    ;(this.system as Actor.SystemOfType<'characterV2'>).changeDR(formula, locations)
  }

  /* ---------------------------------------- */

  async refreshDR() {
    await this.changeDR('+0', [])
  }
}

export { GurpsActorV2 }
