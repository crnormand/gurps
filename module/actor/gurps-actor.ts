import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { TokenActions } from '../token-actions.js'
import Maneuvers from './maneuver.js'
import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { ModelCollection } from '../data/model-collection.js'
import { BaseActorModel } from './data/base.js'
import { DamageActionSchema, ReactionSchema } from './data/character-components.js'
import { HitLocationEntry } from './data/hit-location-entry.js'
import { makeRegexPatternFrom } from '../../lib/utilities.js'
import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { migrateCharacter } from './migration/character-migration.js'
import { CharacterModel } from './data/character.js'

class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> {
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
    return this.owners
  }

  /* ---------------------------------------- */

  // NOTE: STUB. Not convinced this is needed in the new system.
  //
  async openSheet(_newSheet: foundry.applications.api.ApplicationV2): Promise<void> {}

  /* ---------------------------------------- */

  override getEmbeddedDocument<EmbeddedName extends Actor.Embedded.CollectionName>(
    embeddedName: EmbeddedName,
    id: string,
    { invalid, strict }: foundry.abstract.Document.GetEmbeddedDocumentOptions
  ): Actor.Embedded.DocumentFor<EmbeddedName> | undefined {
    const systemEmbeds = (this.system?.constructor as any).metadata.embedded ?? {}
    if (embeddedName in systemEmbeds) {
      const path = systemEmbeds[embeddedName]
      return (
        // @ts-expect-error: TODO: Revise types so pseudo-document collections are evaluated as valid.
        foundry.utils.getProperty(this, path).get(id, {
          invalid,
          strict,
        }) ?? null
      )
    }
    return super.getEmbeddedDocument(embeddedName, id, { invalid, strict })
  }

  /* ---------------------------------------- */

  /**
   * Obtain the embedded collection of a given pseudo-document type.
   */
  getEmbeddedPseudoDocumentCollection(embeddedName: string): ModelCollection<PseudoDocument> {
    const collectionPath = (this.system?.constructor as any).metadata.embedded?.[embeddedName]
    if (!collectionPath) {
      throw new Error(
        `${embeddedName} is not a valid embedded Pseudo-Document within the [${'type' in this ? this.type : 'base'}] ${this.documentName} subtype!`
      )
    }
    return foundry.utils.getProperty(this, collectionPath) as ModelCollection<PseudoDocument>
  }

  /* ---------------------------------------- */

  getItemAttacks(options: { attackType: 'melee' }): MeleeAttackModel[]
  getItemAttacks(options: { attackType: 'ranged' }): RangedAttackModel[]
  getItemAttacks(options: { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(options = { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[] {
    return this.items.reduce((acc: any[], item) => {
      // @ts-expect-error: Not sure why this isn't resolving correctly.
      acc.push(...item.getItemAttacks(options))
      return acc
    }, [])
  }

  /* ---------------------------------------- */

  getItemReactions(key: 'reactions' | 'conditionalmods'): foundry.data.fields.SchemaField.SourceData<ReactionSchema>[] {
    return this.items.reduce((acc: any[], item) => {
      acc.push(...((item.system as Item.SystemOfType<'feature'>)[key] ?? []))
      return acc
    }, [])
  }

  /* ---------------------------------------- */

  override async toggleStatusEffect(
    statusId: string,
    options?: Actor.ToggleStatusEffectOptions
  ): Promise<ActiveEffect.Implementation | boolean | undefined> {
    const status = CONFIG.statusEffects.find(effect => effect.id === statusId)
    if (!status) throw new Error(`Invalid status ID "${statusId}" provided to GurpsActor#toggleStatusEffect`)

    if (status.flags?.gurps?.effect?.type === 'posture') {
      // If the status effect is a posture, remove all other postures first
      const postureEffects = this.effects.filter(e => e.flags.gurps?.effect?.type === 'posture' && e.id !== statusId)
      await this.deleteEmbeddedDocuments(
        'ActiveEffect',
        postureEffects.map(e => e.id!),
        { parent: this }
      )
    }

    return super.toggleStatusEffect(statusId, options)
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
  /*  Migration                               */
  /* ---------------------------------------- */

  static override migrateData(source: AnyMutableObject): AnyMutableObject {
    super.migrateData(source)
    migrateCharacter(source)
    return source
  }

  /* ---------------------------------------- */
  /*  Accessors                               */
  /* ---------------------------------------- */

  get displayname() {
    let n = this.name
    if (!!this.token && this.token.name != n) n = this.token.name + '(' + n + ')'
    return n
  }

  /* ---------------------------------------- */

  get hitLocationsWithDR(): HitLocationEntry[] {
    if (this.isOfType('character', 'enemy')) {
      return this.system.hitLocationsWithDR
    }
    return []
  }

  /* ---------------------------------------- */

  get _hitLocationRolls() {
    if (!this.isOfType('character', 'enemy')) return {}
    return (this.system as Actor.SystemOfType<'character'>)._hitLocationRolls
  }

  /* ---------------------------------------- */

  get defaultHitLocation(): string {
    return game.settings?.get('gurps', 'default-hitlocation') ?? ''
  }

  /* ---------------------------------------- */

  // NOTE: Not technically an accessor but here for parity with the old system.
  getTorsoDr(): number {
    if (this.isOfType('character', 'enemy')) {
      return this.system.torsoDR
    }
    return 0
  }

  /* ---------------------------------------- */

  /**
   * @returns An array of temporary effects that are applied to the actor.
   * This is overriden for CharacterModel where maneuvers are moved to the top of the
   * array.
   */
  override get temporaryEffects(): ActiveEffect.Implementation[] {
    if (this.isOfType('character', 'enemy')) {
      return this.system.getTemporaryEffects(super.temporaryEffects)
    }
    return super.temporaryEffects
  }

  /* ---------------------------------------- */

  get usingQuintessence(): boolean {
    return game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_QUINTESSENCE) ?? false
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData() {
    super.prepareBaseData()
    const documentNames = Object.keys((this.system as BaseActorModel)?.metadata?.embedded ?? {})
    for (const documentName of documentNames) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
        pseudoDocument.prepareBaseData()
      }
    }
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()
    const documentNames = Object.keys((this.system as BaseActorModel)?.metadata?.embedded ?? {})
    for (const documentName of documentNames) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
        pseudoDocument.prepareDerivedData()
      }
    }
  }

  /* ---------------------------------------- */

  override prepareEmbeddedDocuments(): void {
    super.prepareEmbeddedDocuments()
    ;(this.system as BaseActorModel).prepareEmbeddedDocuments()
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  async internalUpdate(data: Actor.UpdateData | undefined, operation?: Actor.Database.UpdateOperation) {
    console.trace('internalUpdate', data)
    return this.update(data, { ...operation, render: false })
  }

  /* ---------------------------------------- */

  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: MeleeAttackModel | RangedAttackModel
  ): Promise<boolean> {
    if (this.isOfType('character', 'enemy')) {
      return this.system.addTaggedRollModifiers(chatThing, optionalArgs, attack)
    }
    console.warn('Actor is not a character or enemy.')
    return false
  }

  /* ---------------------------------------- */

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
      return (this.system as CharacterModel).findUsingAction(action, chatthing, formula, thing)
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

  /* ---------------------------------------- */

  // TODO: review and refactor
  async changeDR(
    formula: string,
    locations: string[]
  ): Promise<{ changed: boolean; msg: string; warn?: string; info?: string }> {
    if (this.isOfType('character', 'enemy')) {
      return this.system.changeDR(formula, locations)
    }
    return { changed: false, msg: '', warn: 'Actor is not a character or enemy.' }
  }

  /* ---------------------------------------- */

  // Check if a roll can be performed.
  // NOTE: there doesn't seem to be much reason for this method to be in the Actor class.
  // Consider moving it to roll or elsewhere.
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
    maxAttackMessage?: string
    maxBlockmessage?: string
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
    const maxBlocks = this.system.conditions.actions.maxBlocks ?? 1
    if (
      isDefense &&
      canConsumeAction &&
      action.type === 'weapon-block' &&
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
        game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START) ?? 'Warn'

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

  /* ---------------------------------------- */

  async replaceManeuver(maneuverId: string) {
    if (!this.isOfType('enemy', 'character')) return

    this.getDependentTokens().forEach(token => token.object?.setManeuver(maneuverId))
  }

  /* ---------------------------------------- */

  async replacePosture(postureId: string) {
    if (!this.isOfType('enemy', 'character')) return

    const id = postureId === GURPS.StatusEffectStanding ? this.system.conditions.posture : postureId
    this.toggleStatusEffect(id)
  }

  /* ---------------------------------------- */

  isEffectActive(effect: ActiveEffect.Implementation | { id: string }): boolean {
    return this.effects.some(e => e.id === effect.id)
  }

  /* ---------------------------------------- */

  get damageAccumulators() {
    if (this.isOfType('character', 'enemy'))
      return (this.system as Actor.SystemOfType<'character'>).conditions.damageAccumulators ?? null
    return null
  }

  /* ---------------------------------------- */

  async accumulateDamageRoll(
    action: foundry.data.fields.SchemaField.InitializedData<DamageActionSchema>
  ): Promise<void> {
    if (this.isOfType('character', 'enemy')) this.system.accumulateDamageRoll(action)
  }

  /* ---------------------------------------- */

  async incrementDamageAccumulator(index: number): Promise<void> {
    if (!this.isOfType('character', 'enemy')) return
    this.system.incrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async decrementDamageAccumulator(index: number): Promise<void> {
    if (!this.isOfType('character', 'enemy')) return
    this.system.decrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async clearDamageAccumulator(index: number): Promise<void> {
    if (!this.isOfType('character', 'enemy')) return
    this.system.clearDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async applyDamageAccumulator(index: number): Promise<void> {
    if (!this.isOfType('character', 'enemy')) return
    this.system.applyDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  findEquipmentByName(pattern: string, otherFirst = false): [Item.OfType<'equipment'>, string] | null {
    if (!this.isOfType('character', 'enemy')) return null

    // Removed leading slashes
    const patterns = makeRegexPatternFrom(pattern.replace(/^\/+/, ''))
      // Remove leading ^
      .substring(1)
      // Split by /
      .split('/')
      // Apply ^ to each pattern
      .map(e => new RegExp('^' + e, 'i'))

    const carriedItem = this.system.equipment.carried.find(e => patterns.some(p => p.test(e.name)))
    const otherItem = this.system.equipment.other.find(e => patterns.some(p => p.test(e.name)))

    const carriedResult: [Item.OfType<'equipment'>, string] | null = carriedItem
      ? [carriedItem ?? null, carriedItem.id ?? '']
      : null
    const otherResult: [Item.OfType<'equipment'>, string] | null = otherItem
      ? [otherItem ?? null, otherItem.id ?? '']
      : null

    return otherFirst ? (otherResult ?? carriedResult ?? null) : (carriedResult ?? otherResult ?? null)
  }

  /* ---------------------------------------- */

  async updateEqtCount(id: string, count: number) {
    if (!this.isOfType('character', 'enemy')) return null

    const equipment = (this.system as Actor.SystemOfType<'character'>).allEquipment.find(e => e.id === id)
    const updateData: Record<string, unknown> = { count }

    // If modifying the quantity of an item should automatically force imports to ignore the imported quantity,
    // set ignoreImportQty to true.
    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_AUTOMATICALLY_SET_IGNOREQTY) === true) {
      updateData['ignoreImportQty'] = true
    }

    if (equipment) {
      await this.updateEmbeddedDocuments('Item', [{ _id: id, ...updateData }], { parent: this })
      return equipment
    } else {
      throw new Error(`GURPS | Equipment with ID ${id} not found in actor ${this.name}`)
    }
  }

  /* ---------------------------------------- */

  isEmptyActor(): boolean {
    if (!this.isOfType('character', 'enemy')) return false
    return this.system.additionalresources.importname === null
  }

  /* ---------------------------------------- */

  async runOTF(otf: string): Promise<void> {
    const action = GURPS.parselink(otf)
    await GURPS.performAction(action.action, this)
  }

  /* ---------------------------------------- */

  getChecks(checkType: string) {
    if (!this.isOfType('character', 'enemy')) return null
    return (this.system as Actor.SystemOfType<'character'>).getChecks(checkType)
  }
}

export { GurpsActorV2 }
