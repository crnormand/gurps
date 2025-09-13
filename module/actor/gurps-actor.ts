import { AnyObject } from 'fvtt-types/utils'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { TokenActions } from '../token-actions.js'
import Maneuvers from './maneuver.js'
import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { ModelCollection } from '../data/model-collection.js'
import { BaseActorModel } from './data/base.js'
import { Equipment, HitLocationEntry } from './actor-components.js'
import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { CharacterModel } from './data/character.js'

import { TraitV1 } from '../item/legacy/trait-adapter.js'
import { makeRegexPatternFrom, recurselist } from '../../lib/utilities.js'
import { ReactionSchema } from './data/character-components.js'
import { GurpsItemV2 } from 'module/item/gurps-item.js'

function getDamageModule() {
  return GURPS.module.Damage
}

class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> {
  /* ---------------------------------------- */

  isOfType<SubType extends Actor.SubType>(...types: SubType[]): this is Actor.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Actor.SubType)
  }

  /* ---------------------------------------- */

  // NOTE: changed from getOwners() in old system
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
        // @ts-expect-error: Dynamic access to embedded collection
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
      acc.push(...((item.system as Item.SystemOfType<'featureV2'>)[key] ?? []))
      return acc
    }, [])
  }

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

    // TODO See if isPostureEffect can be moved to status.
    if (this.isPostureEffect(status)) {
      // If the status effect is a posture, remove all other postures first
      let postureEffects = this.getAllActivePostureEffects().filter(e => e.statuses.find(s => s !== statusId))
      for (const it of postureEffects) {
        await super.toggleStatusEffect(it.statuses.first()!, options)
      }

      await this.deleteEmbeddedDocuments(
        'ActiveEffect',
        postureEffects.map(e => e.id!),
        { parent: this }
      )
    }

    return super.toggleStatusEffect(statusId, options)
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
  /*  Migration                               */
  /* ---------------------------------------- */

  // static override migrateData(source: AnyMutableObject): AnyMutableObject {
  //   super.migrateData(source)
  //   migrateCharacter(source)
  //   return source
  // }

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
    return (this.system as CharacterModel).hitLocationsWithDR
  }

  /* ---------------------------------------- */

  get _hitLocationRolls() {
    return (this.system as CharacterModel)._hitLocationRolls
  }

  /* ---------------------------------------- */

  get defaultHitLocation(): string {
    return game.settings?.get('gurps', 'default-hitlocation') ?? ''
  }

  /* ---------------------------------------- */

  // NOTE: Not technically an accessor but here for parity with the old system.
  getTorsoDr(): number {
    return this.torsoDr
  }

  get torsoDr(): number {
    return (this.system as CharacterModel).torsoDR
  }

  /* ---------------------------------------- */

  /**
   * @returns An array of temporary effects that are applied to the actor.
   * This is overriden for CharacterModel where maneuvers are moved to the top of the
   * array.
   */
  override get temporaryEffects(): ActiveEffect.Implementation[] {
    return (this.system as CharacterModel).getTemporaryEffects(super.temporaryEffects)
  }

  /* ---------------------------------------- */

  get usingQuintessence(): boolean {
    return game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_QUINTESSENCE) ?? false
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
    ;(this.system as CharacterModel).prepareEmbeddedDocuments()
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  async internalUpdate(data: Actor.UpdateData, operation?: Actor.Database.UpdateOperation) {
    console.trace('internalUpdate', data)
    return this.update(data, { ...operation, render: false })
  }

  /* ---------------------------------------- */

  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: MeleeAttackModel | RangedAttackModel
  ): Promise<boolean> {
    return (this.system as CharacterModel).addTaggedRollModifiers(chatThing, optionalArgs, attack)
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
    return (this.system as CharacterModel).findUsingAction(action, chatthing, formula, thing)
  }

  /* ---------------------------------------- */

  async changeDR(formula: string, locations: string[]) {
    ;(this.system as CharacterModel).changeDR(formula, locations)
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

    if (!isCombatActive || !isCombatant || !this.isOfType('characterV2', 'enemy')) return result

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
    const maxActions = (this.system as CharacterModel).conditions.actions.maxActions ?? 1
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
    const maxBlocks = (this.system as CharacterModel).conditions.actions.maxBlocks ?? 1
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
        game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START) ?? 'Warn'

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
  async replaceManeuver(maneuverId: string) {
    this.getDependentTokens().forEach(token => token.object?.setManeuver(maneuverId))
  }

  /* ---------------------------------------- */

  async replacePosture(postureId: string) {
    const id = postureId === GURPS.StatusEffectStanding ? (this.system as CharacterModel).conditions.posture : postureId
    this.toggleStatusEffect(id)
  }

  /* ---------------------------------------- */

  isEffectActive(effect: ActiveEffect.Implementation | { id: string }): boolean {
    return this.effects.some(e => e.id === effect.id)
  }

  /* ---------------------------------------- */

  get damageAccumulators(): any[] | null {
    if (this.isOfType('character', 'enemy'))
      return (this.system as CharacterModel).conditions.damageAccumulators ?? null
    return null
  }

  /* ---------------------------------------- */

  // async accumulateDamageRoll(
  //   action: foundry.data.fields.SchemaField.InitializedData<DamageActionSchema>
  // ): Promise<void> {
  //   ;(this.system as CharacterModel).accumulateDamageRoll(action)
  // }

  /* ---------------------------------------- */

  async incrementDamageAccumulator(index: number): Promise<void> {
    ;(this.system as CharacterModel).incrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async decrementDamageAccumulator(index: number): Promise<void> {
    if (!this.isOfType('characterV2', 'enemy')) return
    ;(this.system as CharacterModel).decrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async clearDamageAccumulator(index: number): Promise<void> {
    if (!this.isOfType('characterV2', 'enemy')) return
    ;(this.system as CharacterModel).clearDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async applyDamageAccumulator(index: number): Promise<void> {
    if (!this.isOfType('characterV2', 'enemy')) return
    ;(this.system as CharacterModel).applyDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  findEquipmentByName(pattern: string, otherFirst = false): [Item.OfType<'equipment'>, string] | null {
    if (!this.isOfType('characterV2', 'enemy')) return null

    // Removed leading slashes
    const patterns = makeRegexPatternFrom(pattern.replace(/^\/+/, ''))
      // Remove leading ^
      .substring(1)
      // Split by /
      .split('/')
      // Apply ^ to each pattern
      .map(e => new RegExp('^' + e, 'i'))

    const carriedItem = (this.system as CharacterModel).equipment.carried.find((e: GurpsItemV2) =>
      patterns.some(p => p.test(e.name))
    )
    const otherItem = (this.system as CharacterModel).equipment.other.find((e: GurpsItemV2) =>
      patterns.some(p => p.test(e.name))
    )

    const carriedResult: [Item.OfType<'equipment'>, string] | null = carriedItem
      ? [carriedItem ?? null, carriedItem.id ?? '']
      : null
    const otherResult: [Item.OfType<'equipment'>, string] | null = otherItem
      ? [otherItem ?? null, otherItem.id ?? '']
      : null

    return otherFirst ? (otherResult ?? carriedResult ?? null) : (carriedResult ?? otherResult ?? null)
  }

  /* ---------------------------------------- */

  async updateEqtCountV2(id: string, count: number) {
    if (!this.isOfType('characterV2', 'enemy')) return null

    const equipment = (this.system as Actor.SystemOfType<'characterV2'>).allEquipmentV2.find(e => e.id === id)
    const updateData: Record<string, unknown> = { count }

    // If modifying the quantity of an item should automatically force imports to ignore the imported quantity,
    // set ignoreImportQty to true.
    if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_AUTOMATICALLY_SET_IGNOREQTY) === true) {
      updateData['ignoreImportQty'] = true
    }

    if (equipment) {
      // @ts-expect-error
      await this.updateEmbeddedDocuments('Item', [{ _id: id, ...updateData }], { parent: this })
      return equipment
    } else {
      throw new Error(`GURPS | Equipment with ID ${id} not found in actor ${this.name}`)
    }
  }

  /* ---------------------------------------- */

  isEmptyActor(): boolean {
    // return (this.system as CharacterModel).additionalresources.importname === null
    return false
  }

  /* ---------------------------------------- */

  async runOTF(otf: string): Promise<void> {
    const action = GURPS.parselink(otf)
    await GURPS.performAction(action.action, this)
  }

  /* ---------------------------------------- */

  getChecks(checkType: string) {
    return (this.system as CharacterModel).getChecks(checkType)
  }

  /* ---------------------------------------- */

  async _sanityCheckItemSettings(actorComp: AnyObject): Promise<boolean> {
    let canEdit = false
    let message = 'GURPS.settingNoEquipAllowedHint'
    if (!!actorComp.itemid) canEdit = true

    if (!canEdit) {
      const phrases = game.i18n!.localize(message)
      const body = phrases
        .split('.')
        .filter(p => !!p)
        .map(p => `${p.trim()}.`)
        .join('</p><p>')

      await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n!.localize('GURPS.settingNoEditAllowed') },
        content: `<p>${body}</p>`,
        ok: {
          label: 'GURPS.ok',
          icon: 'fa-solid fa-check',
        },
      })
    }
    return canEdit
  }

  /**
   * Finds the actor component key corresponding to the given ID.
   *
   * @param key - The key to search for in the trait objects.
   * @param id - The ID to match within the trait objects.
   * @param sysKey - The system.<key> to use for the search.
   * @param include - Whether to check equal or include in the search
   * @return The trait key if found, otherwise undefined.
   */
  _findSysKeyForId(key: string, id: string | undefined, sysKey: string, include: boolean = false): string | undefined {
    let traitKey: string | undefined = undefined
    const data = this.system as Record<string, any>
    const list = data[sysKey] as any
    if (list) {
      recurselist(list, (e: any, k: string, _d: number) => {
        const exists = include ? !!e?.[key]?.includes?.(id) : e?.[key] === id
        if (exists) traitKey = `system.${sysKey}.` + k
      })
    }
    return traitKey
  }

  async _updateItemFromForm(item: Item) {
    // I think this can be ignored because the underlying Item has already been updated, and the legacy ads list
    // is always derived from the Item data.
  }

  _removeItemAdditions(item: Item) {
    // Ignore this? We are deleting the item, and any derived data should be removed automatically.
  }

  async toggleExpand(path: string, expandOnly: boolean = false) {
    let obj = foundry.utils.getProperty(this, path)
    if (obj instanceof TraitV1) obj.traitV2.toggleCollapsed(expandOnly)
  }

  /* ---------------------------------------- */

  async refreshDR() {
    await this.changeDR('+0', [])
  }

  /* ---------------------------------------- */

  get _additionalResources() {
    return (this.system as CharacterModel)?.additionalresources ?? {}
  }

  /**
   * Reorder an item in the actor's item list. This function moves the item at sourceKey to be just before the item at
   * targetKey.
   * @param sourcekey A full path up to the index, such as "system.skills.123456"
   * @param targetkey A full path up to the index, such as "system.skills.654321"
   * @param object The object to move
   * @param isSrcFirst Whether the source key comes first
   */
  async reorderItem(sourcekey: string, targetkey: string, object: any, isSrcFirst: boolean) {
    console.log('Reorder item', { sourceKey: sourcekey, targetkey, object, isSrcFirst })

    sourcekey = this.#convertLegacyReorderKeys(sourcekey)
    targetkey = this.#convertLegacyReorderKeys(targetkey)

    let [sourceCollection, sourceIndex, sourcePath] = this.#parseReorderKey(sourcekey)
    let [targetCollection, targetIndex, targetPath] = this.#parseReorderKey(targetkey)

    if (targetCollection !== sourceCollection)
      throw new Error(`Cannot reorder items between different collections: ${sourceCollection} and ${targetCollection}`)

    let sourceArray: any[] = (foundry.utils.getProperty(this, sourcePath) as any[]) ?? []
    let targetArray: any[] = sourceArray
    if (sourcePath !== targetPath) targetArray = (foundry.utils.getProperty(this, targetPath) as any[]) ?? []

    // Remove the object from the source array
    let [movedObject] = sourceArray.splice(sourceIndex, 1)
    if (!movedObject) throw new Error(`No object found at source index ${sourceIndex}`)

    if (isSrcFirst && sourcePath === targetPath) targetIndex--
    if (targetIndex < 0) targetIndex = 0
    if (targetIndex > targetArray.length) targetIndex = targetArray.length

    // Update the moved object's containedBy property.
    const containedBy = targetArray[targetIndex]?.containedBy

    // await movedObject.update({ system: { containedBy: containedBy ?? null } })
    await this.updateEmbeddedDocuments(
      'Item',
      // @ts-expect-error
      [{ _id: movedObject.id, system: { containedBy: containedBy ?? null } }],
      { parent: this }
    )

    // Insert the object into the target array at the correct position
    targetArray.splice(targetIndex, 0, movedObject)

    // Update the sort property of each element in the two arrays
    sourceArray.forEach(async (obj, index) => {
      // await obj.update({ sort: index })
      // @ts-expect-error
      await this.updateEmbeddedDocuments('Item', [{ _id: obj.id, sort: index }], { parent: this })
    })

    if (sourceArray !== targetArray) {
      targetArray.forEach(async (obj, index) => {
        // await obj.update({ sort: index })
        // @ts-expect-error
        await this.updateEmbeddedDocuments('Item', [{ _id: obj.id, sort: index }], { parent: this })
      })
    }
  }

  /* ---------------------------------------- */

  #convertLegacyReorderKeys(key: string) {
    key = key.replace(/^system\.ads\./, 'system.adsV2.')
    key = key.replace(/^system\.skills\./, 'system.skillsV2.')
    // For any substring like .12345., convert to parseInt(12345)
    return key.replace(/\.([0-9]+)\./g, (_, num) => `.${parseInt(num)}.`)
  }

  /* ---------------------------------------- */

  #parseReorderKey(key: string): [string, number, string] {
    const components = key.split('.')
    const index = parseInt(components.pop()!)
    const path = components.join('.')
    const primaryComponentPath = components[0] + '.' + components[1]
    return [primaryComponentPath, index, path]
  }

  /* ---------------------------------------- */

  updateEqtCount(path: string, value: number) {
    // TODO Implement me!
    console.error('updateEqtCount not implemented', { path, value })
  }

  /* ---------------------------------------- */

  updateItemAdditionsBasedOn(eqt: Equipment, key: string) {
    // TODO Implement me!
    console.error('updateItemAdditionsBasedOn not implemented', { eqt, key })
  }

  /* ---------------------------------------- */

  handleEquipmentDrop(eqtData: any) {
    // TODO Implement me!
    console.error('handleEquipmentDrop not implemented', { eqtData })
  }

  /* ---------------------------------------- */
  /*  Actor Operations                        */
  /* ---------------------------------------- */
  handleDamageDrop(damageData: any) {
    if (game.user?.isGM || !getDamageModule().settings.onlyGMsCanOpenADD()) {
      const dialog = new GURPS.ApplyDamageDialog(this, damageData)
      dialog.render(true)
    } else ui.notifications?.warn(game.i18n?.localize('GURPS.invalidUserForDamageWarning') ?? '')
  }

  /* ---------------------------------------- */
  /*  CRUD Operations                         */
  /* ---------------------------------------- */

  override async update(data: Actor.UpdateData, context: Actor.Database.UpdateOperation = {}): Promise<this> {
    await this.#translateLegacyHitlocationData(data)
    await this.#translateLegacyEncumbranceData(data)
    await this.#translateHitLocationsV2(data)
    await this.#translateAdsData(data)

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

  // When updating any property of HitLocationV2, you have to update the entire array.
  #translateHitLocationsV2(data: Actor.UpdateData) {
    const regex = /^system\.hitlocationsV2\.(\d+)\..*/
    const array = foundry.utils.deepClone((this.system as CharacterModel)._source.hitlocationsV2)

    const changes = Object.keys(data).filter(key => key.startsWith('system.hitlocationsV2.')) ?? []

    for (const key of changes) {
      const value = data[key as keyof typeof data]
      const index = parseInt(key.replace(regex, '$1'))
      const field = key.replace(regex, '')

      // @ts-expect-error
      array[index][field] = value

      delete data[key as keyof typeof data]
    }

    // @ts-expect-error
    data['system.hitlocationsV2'] = array
  }

  /*
   * Translate legacy Advantages/Disadvantages data from "system.ads" to Item updates.
   *
   * We are either deleting the entire array or inserting the entire array. Updates are handled directly in the Item.
   */
  async #translateAdsData(data: Actor.UpdateData) {
    const deleteKey = Object.keys(data).includes('system.-=ads')
    const insertKey = Object.keys(data).includes('system.ads')
    if (!deleteKey && !insertKey) return

    // Handle delete of whole array:
    Object.keys(data)
      .filter(key => key === 'system.-=ads')
      .forEach(key => {
        // Delete all embedded Items of type "featureV2".
        const features = this.items.filter(item => item.isOfType('featureV2'))
        for (const feature of features) {
          feature.delete()
        }
        delete data[key as keyof typeof data]
      })

    // Handle insertion of the whole array:
    const regex = /^system\.ads$/
    const changes =
      Object.keys(data)
        .filter(key => key.match(regex))
        .sort() ?? []

    const array = this.items.filter(item => item.isOfType('featureV2'))
    if (array.length > 0) console.warn(`Existing array elements unexpected:`, { array, changes })

    for (const key of changes) {
      // @ts-expect-error
      const record: Record<string, TraitV1> = data[key as keyof typeof data]
      for (const value of Object.values(record)) {
        const trait = value.traitV2

        // Create the item and store it on the character.
        const newItem = await Item.create(trait, { parent: this })
        console.log(`Created new featureV2 Item for legacy ad:`, { trait, newItem })
      }
      delete data[key as keyof typeof data]
    }

    // @ts-expect-error
    data['system.ads'] = array
  }
}

export { GurpsActorV2 }
