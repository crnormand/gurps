import { AnyObject } from 'fvtt-types/utils'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { TokenActions } from '../token-actions.js'
import Maneuvers from './maneuver.js'
import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { ModelCollection } from '../data/model-collection.js'
import { BaseActorModel } from './data/base.js'
import { Equipment, HitLocationEntry } from './actor-components.js'
import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'

import { TraitV1 } from '../item/legacy/trait-adapter.js'
import { makeRegexPatternFrom, recurselist } from '../../lib/utilities.js'
import { ReactionSchema } from './data/character-components.js'
import { EquipmentV1 } from 'module/item/legacy/equipment-adapter.js'
import { GurpsItemV2 } from 'module/item/gurps-item.js'
import { CharacterModel } from './data/character.js'

function getDamageModule() {
  return GURPS.module.Damage
}

// Legacy TODO
// TODO Uncaught (in promise) TypeError: this.actor.getEquippedParry is not a function

interface EquipmentDropData {
  actorid: string
  isLinked: boolean
  itemData: {
    _id: string
    type: string
    name: string
    sort: number
    system: Record<string, any>
  }
  itemid: string
  key: string
  type: string
  uuid: string
}

class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> {
  /* ---------------------------------------- */

  // Narrowed view of this.system for characterV2 logic.
  private get model(): Actor.SystemOfType<'characterV2'> {
    return this.system as Actor.SystemOfType<'characterV2'>
  }

  // Common guard for new actor subtypes.
  private get isNewActorType(): boolean {
    return this.isOfType('characterV2', 'enemy')
  }

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
    const attacks: (MeleeAttackModel | RangedAttackModel)[] = []
    for (const item of this.items) {
      // @ts-expect-error: Item type declarations may not expose getItemAttacks
      attacks.push(...item.getItemAttacks(options))
    }
    return attacks
  }

  /* ---------------------------------------- */

  getItemReactions(key: 'reactions' | 'conditionalmods'): foundry.data.fields.SchemaField.SourceData<ReactionSchema>[] {
    const out: foundry.data.fields.SchemaField.SourceData<ReactionSchema>[] = []
    for (const item of this.items) {
      if (!item.isOfType('featureV2')) continue
      out.push(...(item.system[key] ?? []))
    }
    return out
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
    return this.model.hitLocationsWithDR
  }

  /* ---------------------------------------- */

  get _hitLocationRolls() {
    return this.model._hitLocationRolls
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
    return this.model.torsoDR
  }

  /* ---------------------------------------- */

  /**
   * @returns An array of temporary effects that are applied to the actor.
   * This is overriden for CharacterModel where maneuvers are moved to the top of the
   * array.
   */
  override get temporaryEffects(): ActiveEffect.Implementation[] {
    return this.model.getTemporaryEffects(super.temporaryEffects)
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
    this.#forEachEmbedded(pd => pd.prepareBaseData())
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()
    this.#forEachEmbedded(pd => pd.prepareDerivedData())
  }

  /** Iterate through all embedded pseudo-documents and execute a function */
  #forEachEmbedded(fn: (pd: PseudoDocument) => void) {
    const embedded = (this.system as BaseActorModel)?.metadata?.embedded ?? {}
    for (const documentName of Object.keys(embedded)) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) fn(pseudoDocument)
    }
  }

  /* ---------------------------------------- */

  override prepareEmbeddedDocuments(): void {
    super.prepareEmbeddedDocuments()
    this.model.prepareEmbeddedDocuments()
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
    return this.model.addTaggedRollModifiers(chatThing, optionalArgs, attack)
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
    return this.model.findUsingAction(action, chatthing, formula, thing)
  }

  /* ---------------------------------------- */

  async changeDR(formula: string, locations: string[]) {
    this.model.changeDR(formula, locations)
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
    const maxActions = this.model.conditions.actions.maxActions ?? 1
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
    const maxBlocks = this.model.conditions.actions.maxBlocks ?? 1
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
    const id = postureId === GURPS.StatusEffectStanding ? this.model.conditions.posture : postureId
    this.toggleStatusEffect(id)
  }

  /* ---------------------------------------- */

  isEffectActive(effect: ActiveEffect.Implementation | { id: string }): boolean {
    return this.effects.some(e => e.id === effect.id)
  }

  /* ---------------------------------------- */

  get damageAccumulators(): any[] | null {
    if (this.isNewActorType) return this.model.conditions.damageAccumulators ?? null
    return null
  }

  /* ---------------------------------------- */

  // async accumulateDamageRoll(
  //   action: foundry.data.fields.SchemaField.InitializedData<DamageActionSchema>
  // ): Promise<void> {
  //   ;(this.system as Actor.SystemOfType<'characterV2'>).accumulateDamageRoll(action)
  // }

  /* ---------------------------------------- */

  async incrementDamageAccumulator(index: number): Promise<void> {
    this.model.incrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async decrementDamageAccumulator(index: number): Promise<void> {
    if (!this.isNewActorType) return
    this.model.decrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async clearDamageAccumulator(index: number): Promise<void> {
    if (!this.isNewActorType) return
    this.model.clearDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  async applyDamageAccumulator(index: number): Promise<void> {
    if (!this.isNewActorType) return
    this.model.applyDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  findEquipmentByName(pattern: string, otherFirst = false): [GurpsItemV2<'equipmentV2'>, string] | null {
    if (!this.isOfType('characterV2', 'enemy')) return null

    // Removed leading slashes
    const patterns = makeRegexPatternFrom(pattern.replace(/^\/+/, ''))
      // Remove leading ^
      .substring(1)
      // Split by /
      .split('/')
      // Apply ^ to each pattern
      .map(e => new RegExp('^' + e, 'i'))

    const carriedItem = this.model.equipmentV2.carried.find((e: GurpsItemV2<'equipmentV2'>) =>
      patterns.some(p => p.test(e.name))
    )
    const otherItem = this.model.equipmentV2.other.find((e: GurpsItemV2<'equipmentV2'>) =>
      patterns.some(p => p.test(e.name))
    )

    const carriedResult: [GurpsItemV2<'equipmentV2'>, string] | null = carriedItem
      ? [carriedItem ?? null, carriedItem.id ?? '']
      : null
    const otherResult: [GurpsItemV2<'equipmentV2'>, string] | null = otherItem
      ? [otherItem ?? null, otherItem.id ?? '']
      : null

    return otherFirst ? (otherResult ?? carriedResult ?? null) : (carriedResult ?? otherResult ?? null)
  }

  /* ---------------------------------------- */

  async updateEqtCountV2(id: string, count: number) {
    if (!this.isOfType('characterV2', 'enemy')) return null

    const equipment = this.model.allEquipmentV2.find(e => e.id === id)
    const updateData: Record<string, any> = { _id: id, system: { eqt: { count } } }

    // If modifying the quantity of an item should automatically force imports to ignore the imported quantity,
    // set ignoreImportQty to true.
    if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_AUTOMATICALLY_SET_IGNOREQTY) === true) {
      updateData.system.eqt.ignoreImportQty = true
    }

    if (equipment) {
      await this.updateEmbeddedDocuments('Item', [updateData], { parent: this })
      return equipment
    } else {
      throw new Error(`GURPS | Equipment with ID ${id} not found in actor ${this.name}`)
    }
  }

  /* ---------------------------------------- */

  isEmptyActor(): boolean {
    // return (this.system as Actor.SystemOfType<'characterV2'>).additionalresources.importname === null
    return false
  }

  /* ---------------------------------------- */

  async runOTF(otf: string): Promise<void> {
    const action = GURPS.parselink(otf)
    await GURPS.performAction(action.action, this)
  }

  /* ---------------------------------------- */

  getChecks(checkType: string) {
    return (this.system as Actor.SystemOfType<'characterV2'>).getChecks(checkType)
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
    return this.model?.additionalresources ?? {}
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

    sourcekey = this.#convertLegacyItemKey(sourcekey)
    targetkey = this.#convertLegacyItemKey(targetkey)

    let [sourceCollection, sourceIndex, sourcePath] = this.#parseReorderKey(sourcekey)
    let [targetCollection, targetIndex, targetPath] = this.#parseReorderKey(targetkey)

    if (targetCollection !== sourceCollection)
      // TODO: Maybe this should fail quietly? Or it should pop up a warning to the user?
      throw new Error(`Cannot reorder items between different collections: ${sourceCollection} and ${targetCollection}`)

    let sourceArray: any[] = (foundry.utils.getProperty(this, sourcePath) as any[]) ?? []
    let targetArray: any[] = sourceArray
    if (sourcePath !== targetPath) targetArray = (foundry.utils.getProperty(this, targetPath) as any[]) ?? []

    // Remove the object from the source array.
    let [movedObject] = sourceArray.splice(sourceIndex, 1)
    if (!movedObject) throw new Error(`No object found at source index ${sourceIndex}`)

    if (isSrcFirst && sourcePath === targetPath) targetIndex--
    if (targetIndex < 0) targetIndex = 0
    if (targetIndex > targetArray.length) targetIndex = targetArray.length

    // Update the moved object's containedBy property.
    const containedBy = targetArray[targetIndex]?.containedBy
    const updates: Record<string, any>[] = []
    updates.push({ _id: movedObject.id, system: { containedBy: containedBy ?? null } } as Item.UpdateData)

    // Insert the object into the target array at the correct position.
    targetArray.splice(targetIndex, 0, movedObject)

    // Update the sort property of each element in the two arrays.
    sourceArray.forEach(async (obj, index) => {
      updates.push({ _id: obj.id, sort: index })
    })

    if (sourceArray !== targetArray) {
      targetArray.forEach(async (obj, index) => {
        updates.push({ _id: obj.id, sort: index })
      })
    }
    await this.updateEmbeddedDocuments('Item', updates, { parent: this })
  }

  /* ---------------------------------------- */

  #convertLegacyItemKey(key: string) {
    key = key.replace(/^system\.ads/, 'system.adsV2')
    key = key.replace(/^system\.spells/, 'system.spellsV2')
    key = key.replace(/^system\.skills/, 'system.skillsV2')
    key = key.replace(/^system\.equipment\.carried/, 'system.equipmentV2.carried')
    key = key.replace(/^system\.equipment\.other/, 'system.equipmentV2.other')
    // For any substring like .12345., convert to parseInt(12345)
    return key.replace(/\.([0-9]+)/g, (_, num) => `.${parseInt(num)}`)
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

  async updateEqtCount(key: string, value: number) {
    const eqt = foundry.utils.getProperty(this, key) as EquipmentV1
    const item = eqt.equipmentV2
    await this.updateEqtCountV2(item.id!, value)
  }

  /* ---------------------------------------- */

  async deleteEquipment(key: string) {
    const eqt = foundry.utils.getProperty(this, key) as EquipmentV1
    const item = eqt.equipmentV2
    await this.deleteItem(item)
    return item
  }

  /* ---------------------------------------- */

  async deleteItem(item: GurpsItemV2) {
    // If the equipment is a container, delete the contained items first.
    if (item.contains) {
      for (const child of item.contents) {
        await this.deleteItem(child)
      }
    }

    await this.deleteEmbeddedDocuments('Item', [item.id!])
  }

  /* ---------------------------------------- */

  updateItemAdditionsBasedOn(eqt: Equipment, key: string) {
    // TODO In the new system I don't think we need this! Keep it until the code stops calling it.
    console.info('updateItemAdditionsBasedOn not implemented', { eqt, key })
  }

  /* ---------------------------------------- */

  async handleEquipmentDrop(dropData: EquipmentDropData): Promise<boolean> {
    // Drag and drop on same actor is handled by moveEquipment().
    if (dropData.actorid === this.id) return false

    if (!dropData.itemid) {
      ui.notifications?.warn(game.i18n!.localize('GURPS.cannotDragNonFoundryEqt'))
      return false
    }

    // TODO: Why is dragging from unlinked tokens disallowed?
    if (!dropData.isLinked) {
      ui.notifications?.warn(
        `You cannot drag from an unlinked token. The source token must have 'Link Actor Data' checked.`
      )
      return false
    }

    let srcActor = game.actors!.get(dropData.actorid)
    let eqt = foundry.utils.getProperty(srcActor!, dropData.key) as EquipmentV1

    if (
      (!!eqt.contains && Object.keys(eqt.contains).length > 0) ||
      (!!eqt.collapsed && Object.keys(eqt.collapsed).length > 0)
    ) {
      ui.notifications?.warn('You cannot transfer an Item that contains other equipment.')
      return false
    }

    let count: number | null = eqt.count
    if (count && count > 1) {
      count = await this.#promptEquipmentQuantity(eqt.name, game.i18n!.format('GURPS.TransferTo', { name: this.name }))
    }
    if (!count) return false

    if (count! > eqt.count) count = eqt.count

    // If the two actors are owned by the same user...
    if (this.isOwner && srcActor?.isOwner) {
      // Search the target actor (this) for an item with the same name.
      const existing = this.findEquipmentByName(eqt.name, false)
      if (existing) {
        // If found, increment the count of the existing item.
        await this.updateEqtCountV2(existing[0].id!, existing[0].system.eqt.count + count)
      } else {
        // If not found, create a new item with the specified count.
        await this.#createEquipment(eqt.equipmentV2.toObject(false), count)
      }

      // Adjust the source actor's equipment.
      if (count >= eqt.count) await srcActor.deleteEquipment(dropData.key)
      else await srcActor.updateEqtCount(dropData.key, +eqt.count - count)
    } else {
      // The two actors are not owned by the same user.
      let destowner = game.users?.players.find(p => this.testUserPermission(p, 'OWNER'))

      if (destowner) {
        // Send a request to the owner of the destination actor to add the item.
        ui.notifications?.info(`Asking ${this.name} if they want ${eqt.name}`)

        dropData.itemData.system.eqt.count = count // They may not have given all of them

        game.socket?.emit('system.gurps', {
          type: 'dragEquipment1',
          srckey: dropData.key,
          srcuserid: game.user!.id,
          srcactorid: dropData.actorid,
          destuserid: destowner.id,
          destactorid: this.id,
          itemData: dropData.itemData,
          count: +count,
        })
      } else ui.notifications?.warn(game.i18n!.localize('GURPS.youDoNotHavePermssion'))
    }
    return false
  }

  async #createEquipment(eqt: Record<string, any>, count: number, parent: GurpsItemV2<'equipmentV2'> | null = null) {
    const { _id: _omit, ...itemData } = foundry.utils.duplicate(eqt) as Record<string, any>
    itemData.system.containedBy = parent?.id ?? null
    itemData.system.eqt.count = count
    itemData.system.eqt.carried = true // Default to carried when transferring.
    await this.createEmbeddedDocuments('Item', [itemData as Item.CreateData], { parent: this })
  }

  /* ---------------------------------------- */

  /**
   *
   * @param sourcekey using legacy Equipment, such as 'system.equipment.carried.00112'.
   * @param targetkey using legacy format, such as 'system.equipment.other.00000.contains.00123'
   * @param shiftkey
   * @returns
   */
  async moveEquipment(sourcekey: string, targetkey: string, shiftkey: boolean) {
    if (sourcekey == targetkey) return

    // Convert the legacy key format to the new format.
    sourcekey = this.#convertLegacyItemKey(sourcekey)
    targetkey = this.#convertLegacyItemKey(targetkey)

    // If the Shift key is down, the user wants to split the amount of the item between the source and destination.
    if (shiftkey && (await this.#splitEquipment(sourcekey, targetkey))) return

    // Parse the source and target keys.
    let [sourceCollection, sourceIndex, sourcePath] = this.#parseItemKey(sourcekey)
    let [targetCollection, targetIndex, targetPath] = this.#parseItemKey(targetkey)

    // Get the item to move.
    let item = foundry.utils.getProperty(this, sourcekey) as GurpsItemV2<'equipmentV2'>

    // Set isSrcFirst to true if the source comes before the target in the same container.
    let isSrcFirst = false
    if (sourceCollection === targetCollection) {
      if (sourcePath === targetPath && sourceIndex! < targetIndex!) isSrcFirst = true
    }

    if (await this.#checkForMerge(item, targetkey)) return

    let where: 'before' | 'inside' | 'after' | null = null
    if (targetkey === targetCollection)
      where = 'after' // Dropping on the collection itself, so add to the end.
    else
      where = await foundry.applications.api.DialogV2.wait({
        window: { title: item.name },
        content: `<p>${game.i18n!.localize('GURPS.dropPlacement')}</p>`,
        buttons: [
          {
            action: 'before',
            icon: 'fa-solid fa-turn-left-down',
            label: 'GURPS.dropBefore',
            default: true,
          },
          {
            action: 'inside',
            icon: 'fa-solid fa-arrow-down-to-bracket',
            label: 'GURPS.dropInside',
          },
        ],
      })

    if (!where) return

    // Get the source array contents
    const sourceArray = foundry.utils.getProperty(
      this,
      sourcePath ? [sourceCollection, sourcePath].join('.') : sourceCollection
    ) as GurpsItemV2<'equipmentV2'>[]

    // Adjust the target index if dropping before and the source comes before the target.
    if (where === 'before' && isSrcFirst) targetIndex && targetIndex > 0 ? targetIndex-- : 0
    if (where === 'after' && !isSrcFirst) targetIndex = undefined // Add to the end of the array.

    // Dropping inside a container. Set the target to be the end of the container's contents.
    if (where === 'inside') {
      targetPath = `${targetPath ? targetPath + '.' + targetIndex + '.contains' : targetIndex + '.contains'}`
      targetIndex = undefined // Add to the end of the array.

      // Expand the target container if it is collapsed.
      await this.toggleExpand(targetkey, true)
    }

    // Get the target container contents.
    let targetArray = sourceArray
    if (targetCollection !== sourceCollection || targetPath !== sourcePath)
      targetArray = foundry.utils.getProperty(
        this,
        targetPath ? [targetCollection, targetPath].join('.') : targetCollection
      ) as GurpsItemV2<'equipmentV2'>[]

    // If targetIndex is undefined, set to to add to the end of the array.
    targetIndex ??= targetArray.length

    // Remove the item from the source array.
    sourceArray.splice(sourceIndex!, 1)

    // Set the parent and add the item to the target.
    let containedBy = null
    if (targetPath) {
      const container = foundry.utils.getProperty(
        this,
        targetCollection + '.' + targetPath.replace(/\.contains$/, '') // Get rid of the final '.contains'.
      ) as GurpsItemV2<'equipmentV2'>
      containedBy = container.id
    }

    let updates: Record<string, any>[] = []
    updates.push({
      _id: item.id,
      sort: targetIndex,
      system: {
        containedBy: containedBy ?? null,
        eqt: { carried: targetCollection === 'system.equipmentV2.carried', lastUpdate: new Date().toISOString() },
      },
    } as Item.UpdateData)

    // Insert the item into the target array at the correct position.
    targetArray.splice(targetIndex, 0, item)

    targetArray.forEach((obj, index) => {
      if (obj === item) return // Skip the moved item, already updated above.
      updates.push({ _id: obj.id, sort: index })
    })

    // Update the sort property of each element in the source arrays.
    if (sourceArray !== targetArray) {
      sourceArray.forEach((obj, index) => {
        updates.push({ _id: obj.id, sort: index })
      })
    }

    await this.updateEmbeddedDocuments('Item', updates, { parent: this })
  }

  /**
   *
   * @param key such as 'system.equipment.carried.00000.contains.00123'
   * @returns [
   *  string - primary component collection, such as 'system.equipment.carried',
   *  number - index (as a number) of the final segment of the path (such as 123 in the example),
   *  path - path within the collection, such as '00000.contains'.
   * ]
   */
  #parseItemKey(key: string): [string, number | undefined, string] {
    const components = key.split('.')

    const primaryComponentPath = [components[0], components[1], components[2]].join('.')
    const index = components[components.length - 1].match(/^\d+$/) ? parseInt(components.pop() ?? '0') : 0
    let path: string | null = components.join('.').replace(primaryComponentPath, '').replace(/^\./, '')

    return [primaryComponentPath, index, path]
  }

  /**
   * Ask the user if they want to split the quantity of the item and put some in targetkey, leaving the rest in srckey.
   * @param srckey
   * @param targetkey
   * @returns true if split was handled.
   */
  async #splitEquipment(srckey: string, targetkey: string): Promise<boolean> {
    let sourceItem = (foundry.utils.getProperty(this, srckey) as GurpsItemV2<'equipmentV2'>) ?? null
    if (!sourceItem || !sourceItem.eqt || sourceItem.eqt.count <= 1) return false // Nothing to split

    const count =
      (await this.#promptEquipmentQuantity(sourceItem.name, game.i18n!.localize('GURPS.splitQuantity'))) ?? 0
    if (count <= 0) return true // Didn't want to split.
    if (count >= sourceItem.eqt.count) return false // Not a split, but a move.

    // Could be a list such as 'system.equipment.other' or an item such as 'system.equipment.other.1'.
    // If it ends in '.other' or '.carried', parent is null.
    let parent = null
    if (!targetkey.match(/^system\.equipmentV2\.(other|carried)$/)) {
      parent = (foundry.utils.getProperty(this, targetkey) as GurpsItemV2<'equipmentV2'>) ?? null
    }

    // Copy item and save.
    await this.#createEquipment(sourceItem.toObject(false), count, parent)

    // Update src equipment count (sourceItem.eqt.count - count)
    await this.updateEqtCountV2(sourceItem.id!, sourceItem.eqt.count - count)

    return true
  }

  /* ---------------------------------------- */

  async #promptEquipmentQuantity(eqt: string, title: string): Promise<number | null> {
    // @ts-expect-error
    const result: number | null = await foundry.applications.api.DialogV2.wait({
      window: { title: title },
      content: await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/transfer-equipment.hbs', {
        eqt: eqt,
      }),
      buttons: [
        {
          action: 'ok',
          label: game.i18n!.localize('GURPS.ok'),
          icon: 'fa-solid fa-check',
          // @ts-expect-error
          callback: (_, button, __) => parseInt(button.form!.elements.qty.valueAsNumber),
        },
      ],
    })

    return result
  }

  /* ---------------------------------------- */

  async #checkForMerge(item: GurpsItemV2<'equipmentV2'>, targetkey: string): Promise<boolean> {
    // If dropping on an item of the same name and type, ask if they want to merge.
    let targetItem = (foundry.utils.getProperty(this, targetkey) as GurpsItemV2<'equipmentV2'>) ?? null
    if (!targetItem || targetItem.type !== 'equipmentV2' || targetItem.name !== item.name) return false

    const merge = await foundry.applications.api.DialogV2.wait({
      window: { title: `Merge Items` },
      content: `Merge the equipment named "${item.name}"?<p>This will add the quantities together and delete the source item.</p>`,
      buttons: [
        {
          action: 'merge',
          icon: 'fa-solid fa-check',
          label: `Merge`,
          default: true,
        },
        {
          action: 'cancel',
          icon: 'fa-solid fa-xmark',
          label: `Cancel`,
        },
      ],
    })

    if (merge === 'merge') {
      // Update the target item's count.
      await this.updateEqtCountV2(targetItem.id!, targetItem.system.eqt.count + item.system.eqt.count)
      // Delete the source item.
      await this.deleteItem(item)
      return true
    }

    return false
  }

  /* ---------------------------------------- */

  _findEqtkeyForId(key: string, id: any): string | undefined {
    const equipment = [
      ...(this.system as CharacterModel).equipmentV2.carried,
      ...(this.system as CharacterModel).equipmentV2.other,
    ] as Record<string, any>[]
    return equipment.find(item => item[key] === id)?.id
  }

  /* ---------------------------------------- */

  addNewItemData(itemData: Record<string, any>, targetKey: string | null = null) {
    if (targetKey) {
      targetKey = this.#convertLegacyItemKey(targetKey)
      const parent = foundry.utils.getProperty(this, targetKey) as GurpsItemV2<'equipmentV2'> | null
      if (parent && parent.isOfType('equipmentV2')) {
        itemData.system.containedBy = parent.id
      }
    }
    this.#createEquipment(itemData, itemData.system.eqt.count ?? 1, null)
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
    const array = foundry.utils.deepClone((this.system as Actor.SystemOfType<'characterV2'>)._source.hitlocationsV2)

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

    console.warn('Translating legacy ads data', { data })

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
