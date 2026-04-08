import { Document, fields } from '@gurps-types/foundry/index.js'
import { CollectionField } from '@module/data/fields/collection-field.js'
import { type ItemMetadata } from '@module/item/data/base.js'
import { EquipmentV1 } from '@module/item/legacy/equipment-adapter.js'
import { ItemType } from '@module/item/types.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { parseItemKey } from '@util/object-utils.js'
import { makeRegexPatternFrom, recurselist } from '@util/utilities.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { ContainerUtils } from '../data/mixins/container-utils.js'
import { ModelCollection } from '../data/model-collection.js'
import { ImportSettings } from '../importer/index.js'
import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { TokenActions } from '../token-actions.js'

import { HitLocationEntry } from './actor-components.js'
import { type ActorMetadata } from './data/base.js'
import { DamageActionSchema } from './data/character-components.js'
import { HitLocationEntryV2 } from './data/hit-location-entry.js'
import { HitLocationEntryV1 } from './legacy/hit-location-entryv1.js'
import Maneuvers from './maneuver.js'
import { runSourceMigrations } from './migrate.js'
import { ActorType, CanRollResult, CheckInfo } from './types.js'

function DamageModule() {
  return GURPS.modules.Damage
}

export const MoveModes = {
  Ground: 'GURPS.moveModeGround',
  Air: 'GURPS.moveModeAir',
  Water: 'GURPS.moveModeWater',
  Space: 'GURPS.moveModeSpace',
}

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
  declare pseudoCollections: Record<string, ModelCollection>

  // Narrowed view of this.system for characterV2 logic.
  private get modelV2() {
    return this.system as Actor.SystemOfType<ActorType.Character>
  }

  /* ---------------------------------------- */

  // Settings getter with default fallback
  private getSetting(key: string, fallback: string): string
  private getSetting(key: string, fallback: boolean): boolean
  private getSetting(key: string, fallback: number): number
  private getSetting<T>(key: string, fallback: T): T
  private getSetting<T>(key: string, fallback: T): T {
    const val = (game.settings as any)!.get(GURPS.SYSTEM_NAME, key)

    return (val ?? fallback) as T
  }

  /* ---------------------------------------- */

  isOfType<SubType extends Actor.SubType>(...types: SubType[]): this is Actor.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Actor.SubType)
  }

  /* ---------------------------------------- */

  protected override _configure(options = {}) {
    super._configure(options)

    const collections: Record<string, ModelCollection> = {}
    const model = CONFIG[this.documentName].dataModels[this._source.type]
    const embedded = (model as unknown as gurps.MetadataOwner)?.metadata?.embedded ?? {}

    for (const [documentName, fieldPath] of Object.entries(embedded)) {
      const data = foundry.utils.getProperty(this._source, fieldPath) as AnyObject
      const field = model.schema.getField(fieldPath.slice('system.'.length)) as CollectionField

      collections[documentName] = new (field.constructor as typeof CollectionField).implementation(
        documentName as any,
        this,
        data
      )
    }

    Object.defineProperty(this, 'pseudoCollections', { value: Object.seal(collections), writable: false })
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * Get an array of all Users who are owners of this Actor.
   * NOTE: Changed from getOwners() in old system.
   * @returns An array of User instances who are owners of this Actor.
   */
  get owners(): User.Implementation[] {
    return game.users?.filter(user => user.isOwner) ?? []
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * Alias of accessor owners.
   * @returns An array of User instances who are owners of this Actor.
   */
  getOwners(): User.Implementation[] {
    return this.owners
  }

  /* ---------------------------------------- */

  static override async createDialog(
    data?: Actor.CreateDialogData,
    createOptions?: Actor.Database.DialogCreateOptions,
    options?: Actor.CreateDialogOptions
  ): Promise<Actor.Stored | null | undefined> {
    const isDevMode = GURPS.modules.Dev?.settings.enableNonProductionDocumentTypes ?? false

    if (!isDevMode) {
      options ||= {}
      const allTypes = Actor.TYPES
      const excludeTypes = [
        'base',
        // ActorType.LegacyCharacter,
        // ActorType.LegacyEnemy,
        ActorType.GcsCharacter,
        ActorType.GcsLoot,
      ]

      // Disable non-production Actor types if developer mode is off.
      // @ts-expect-error: Improper types
      options.types = allTypes.filter(type => !excludeTypes.includes(type))
    }

    return super.createDialog(data, createOptions, options)
  }

  /* ---------------------------------------- */

  override getEmbeddedDocument<EmbeddedName extends gurps.Pseudo.EmbeddedCollectionName<'Actor' | 'Item'>>(
    embeddedName: EmbeddedName,
    id: string,
    options?: Document.GetEmbeddedDocumentOptions
  ): gurps.Pseudo.EmbeddedDocument<'Actor' | 'Item', EmbeddedName> {
    const { invalid = false, strict = true } = options ?? {}

    const metadata = (this.system?.constructor as any).metadata as ActorMetadata

    const systemEmbeds = metadata.embedded ?? {}

    if (embeddedName in systemEmbeds) {
      return this.getEmbeddedCollection(embeddedName as keyof PseudoDocumentConfig.Embeds['Actor']).get(id, {
        invalid,
        strict,
      }) as any
    }

    const holderItem: Item.Implementation | null =
      (this.system[metadata.embeddedHolderField as keyof typeof this.system] as Item.Implementation) ?? null

    if (holderItem) {
      const itemMetadata = (holderItem.system?.constructor as any).metadata as ItemMetadata

      if (itemMetadata.embedded && embeddedName in itemMetadata.embedded) {
        const holderResult = holderItem.getEmbeddedDocument(
          embeddedName as gurps.Pseudo.EmbeddedCollectionName<'Item'>,
          id,
          { invalid, strict }
        )

        if (holderResult) return holderResult
      }
    }

    return super.getEmbeddedDocument(embeddedName as Actor.Embedded.CollectionName, id, { invalid, strict }) as any
  }

  /* ---------------------------------------- */

  override getEmbeddedCollection<EmbeddedName extends Actor.Embedded.CollectionName>(
    embeddedName: EmbeddedName
  ): Actor.Embedded.CollectionFor<EmbeddedName>
  override getEmbeddedCollection<EmbeddedName extends keyof PseudoDocumentConfig.Embeds['Actor']>(
    embeddedName: EmbeddedName
  ): ModelCollection<PseudoDocumentConfig.Embeds['Actor'][EmbeddedName]>
  override getEmbeddedCollection(embeddedName: string): unknown {
    return (
      this.pseudoCollections[embeddedName] ?? super.getEmbeddedCollection(embeddedName as Actor.Embedded.CollectionName)
    )
  }

  /* ---------------------------------------- */

  override async createEmbeddedDocuments<EmbeddedName extends Actor.Embedded.Name>(
    embeddedName: EmbeddedName,
    data: Document.CreateDataForName<EmbeddedName>[] | undefined,
    operation?: Document.Database.CreateOperationForName<EmbeddedName>
  ): Promise<Array<Document.StoredForName<EmbeddedName>>>
  override async createEmbeddedDocuments<EmbeddedName extends keyof PseudoDocumentConfig.Embeds['Actor']>(
    embeddedName: EmbeddedName,
    data: gurps.Pseudo.EmbeddedCreateData<'Actor', EmbeddedName>[] | undefined,
    operation?: Partial<gurps.Pseudo.CreateOperation>
  ): Promise<Array<PseudoDocumentConfig.Embeds['Actor'][EmbeddedName]>>
  override async createEmbeddedDocuments(
    embeddedName: string,
    data?: unknown[],
    operation?: object
  ): Promise<unknown[]> {
    const metadata = (this.system?.constructor as any).metadata as ActorMetadata

    if (metadata.embedded && embeddedName in metadata.embedded) {
      const cls = GURPS.CONFIG.PseudoDocument.Types[embeddedName as keyof typeof GURPS.CONFIG.PseudoDocument.Types]

      return cls.createDocuments(data as any[], { parent: this, ...operation })
    } else if (metadata.embeddedHolderField) {
      const holderItem: Item.Implementation | null =
        (this.system[metadata.embeddedHolderField as keyof typeof this.system] as Item.Implementation) ?? null

      if (holderItem) {
        const itemMetadata = (holderItem.system?.constructor as any).metadata as ItemMetadata

        if (itemMetadata.embedded && embeddedName in itemMetadata.embedded) {
          const cls = GURPS.CONFIG.PseudoDocument.Types[embeddedName as keyof typeof GURPS.CONFIG.PseudoDocument.Types]

          return cls.createDocuments(data as any[], { ...operation, parent: holderItem })
        }
      }
    }

    return super.createEmbeddedDocuments(embeddedName as Actor.Embedded.Name, data as never, operation as never)
  }

  /* ---------------------------------------- */

  override async deleteEmbeddedDocuments<EmbeddedName extends Actor.Embedded.Name>(
    embeddedName: EmbeddedName,
    ids: Array<string>,
    operation?: Document.Database.DeleteOperationForName<EmbeddedName>
  ): Promise<Array<Document.StoredForName<EmbeddedName>>>
  override async deleteEmbeddedDocuments<EmbeddedName extends keyof PseudoDocumentConfig.Embeds['Actor']>(
    embeddedName: EmbeddedName,
    ids: Array<string>,
    operation?: Partial<PseudoDocument.DeleteOperation>
  ): Promise<Array<PseudoDocumentConfig.Embeds['Actor'][EmbeddedName]>>
  override async deleteEmbeddedDocuments(
    embeddedName: string,
    ids: Array<string>,
    operation?: object
  ): Promise<unknown[]> {
    const systemEmbeds = (this.system?.constructor as any).metadata.embedded ?? {}

    if (embeddedName in systemEmbeds) {
      const cls = GURPS.CONFIG.PseudoDocument.Types[embeddedName as keyof typeof GURPS.CONFIG.PseudoDocument.Types]

      return cls.deleteDocuments(ids, { parent: this, ...operation })
    }

    return super.deleteEmbeddedDocuments(embeddedName as Actor.Embedded.Name, ids as never, operation as never)
  }

  /* ---------------------------------------- */

  getItemAttacks(options: { attackType: 'melee' }): MeleeAttackModel[]
  getItemAttacks(options: { attackType: 'ranged' }): RangedAttackModel[]
  getItemAttacks(options: { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(
    options: { attackType: 'melee' | 'ranged' | 'both' } = { attackType: 'both' }
  ): (MeleeAttackModel | RangedAttackModel)[] {
    const attacks: (MeleeAttackModel | RangedAttackModel)[] = []

    for (const item of this.items) {
      if (options.attackType === 'melee') {
        attacks.push(...(item as Item.Implementation).getItemAttacks({ attackType: 'melee' }))
      } else if (options.attackType === 'ranged') {
        attacks.push(...(item as Item.Implementation).getItemAttacks({ attackType: 'ranged' }))
      } else {
        attacks.push(...(item as Item.Implementation).getItemAttacks({ attackType: 'both' }))
      }
    }

    return attacks
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * Special GURPS logic: Only one Posture effect can be active at a time. If a new Posture effect is applied,
   * the existing one will be toggled (off).
   */
  override async toggleStatusEffect(
    statusId: string,
    options?: Actor.ToggleStatusEffectOptions
  ): Promise<ActiveEffect.Implementation | boolean | undefined> {
    const status = CONFIG.statusEffects.find(effect => effect.id === statusId)

    if (!status) throw new Error(`Invalid status ID "${statusId}" provided to GurpsActorV2#toggleStatusEffect`)

    // TODO See if isPostureEffect can be moved to status.
    if (this.isPostureEffect(status)) {
      // If the status effect is a posture, remove all other postures first
      const postureEffects = this.getAllActivePostureEffects().filter(postureEffect =>
        postureEffect.statuses.find(effectStatus => effectStatus !== statusId)
      )

      for (const it of postureEffects) {
        await super.toggleStatusEffect(it.statuses.first()!, options)
      }

      await this.deleteEmbeddedDocuments(
        'ActiveEffect',
        postureEffects.map(postureEffect => postureEffect.id!),
        { parent: this }
      )
    }

    return super.toggleStatusEffect(statusId, options)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  private isPostureEffect(status: object): boolean {
    return foundry.utils.getProperty(status, 'flags.gurps.effect.type') === 'posture'
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  private getAllActivePostureEffects() {
    return this.effects.filter(activeEffect => this.isPostureEffect(activeEffect))
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
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
  /*  Accessors                               */
  /* ---------------------------------------- */

  get currentMoveMode() {
    return this.modelV2.currentMoveMode
  }

  /**
   * NOTE: Both character and characterV2
   */
  get _additionalResources() {
    return this.modelV2.additionalresources
  }

  /**
   * NOTE: Both character and characterV2.
   */
  get displayname() {
    let name = this.name

    if (!!this.token && this.token.name != name) name = this.token.name + '(' + name + ')'

    return name
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get hitLocationsWithDR(): HitLocationEntry[] {
    return this.modelV2.hitLocationsWithDR
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get _hitLocationRolls(): Record<string, HitLocationEntryV1> {
    return this.modelV2._hitLocationRolls
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get defaultHitLocation(): string {
    return this.getSetting('default-hitlocation', '')
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * NOTE: Not technically an accessor but here for parity with the old system.
   */
  getTorsoDr(): Record<string, any> | undefined {
    return this.torsoDr
  }

  get torsoDr(): HitLocationEntryV2 | undefined {
    return this.modelV2.torsoDR
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * @returns An array of temporary effects that are applied to the actor.
   * This is overriden for CharacterModel where maneuvers are moved to the top of the
   * array.
   */
  override get temporaryEffects(): ActiveEffect.Implementation[] {
    return this.modelV2.getTemporaryEffects(super.temporaryEffects)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get usingQuintessence(): boolean {
    return this.getSetting(Settings.SETTING_USE_QUINTESSENCE, false)
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  override prepareBaseData() {
    super.prepareBaseData()

    this.doForEachEmbedded(pd => pd.prepareBaseData())
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  override prepareDerivedData() {
    super.prepareDerivedData()

    this.doForEachEmbedded(pd => pd.prepareDerivedData())
  }

  /* ---------------------------------------- */

  /** Iterate through all embedded pseudo-documents and execute a function */
  doForEachEmbedded(fn: (pd: PseudoDocument) => void) {
    const embedded = this.modelV2?.metadata?.embedded ?? {}

    for (const documentName of Object.keys(embedded)) {
      for (const pseudoDocument of this.getEmbeddedCollection(
        documentName as keyof PseudoDocumentConfig.Embeds['Actor']
      )) {
        fn(pseudoDocument)
      }
    }
  }

  /* ---------------------------------------- */

  override prepareEmbeddedDocuments(): void {
    super.prepareEmbeddedDocuments()
    const isTypeData = this.system instanceof foundry.abstract.TypeDataModel

    if (isTypeData) this.system.prepareEmbeddedDocuments()
  }

  /* ---------------------------------------- */
  /*  Data Migration                          */
  /* ---------------------------------------- */

  static override migrateData(source: AnyMutableObject): AnyMutableObject {
    // NOTE: Legacy Item Type
    if (source.type === 'enemy') source.type = ActorType.Character

    runSourceMigrations(source)

    return super.migrateData(source)
  }

  /* ---------------------------------------- */
  /*  Legacy Functionality                    */
  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  async internalUpdate(data: Actor.UpdateData, context?: Record<string, any>): Promise<this | undefined> {
    return this.update(data, { ...context, render: false })
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  async addTaggedRollModifiers(
    chatThing: string,
    optionalArgs: { obj?: AnyObject },
    attack?: Record<string, any>
  ): Promise<boolean> {
    return this.modelV2.addTaggedRollModifiers(chatThing, optionalArgs, attack as MeleeAttackModel | RangedAttackModel)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   *
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
    action: { type: string; name: string; orig: string; overridetxt?: string; attrkey: string },
    chatthing: string,
    formula: string,
    thing: string
  ): { name: string; uuid: string | null; itemId: string | null; fromItem: string | null; pageRef: string | null } {
    return this.modelV2.findUsingAction(action, chatthing, formula, thing)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  async changeDR(drFormula: string, locations: string[]) {
    return this.modelV2.changeDR(drFormula, locations)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   *
   * Check if a roll can be performed.
   * NOTE: there doesn't seem to be much reason for this method to be in the Actor class.
   * Consider moving it to roll or elsewhere.
   */
  async canRoll(
    // TODO: replace with action
    action: AnyObject, // Action parsed from OTF
    token: Token.Implementation, // Actor Token
    chatThing?: string, // String representation of the action
    actorComponent?: AnyObject // Actor Component for the action
  ): Promise<CanRollResult> {
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

    if (!isCombatActive || !isCombatant) return result

    const needTarget = !isSlam && (isAttack || action.isSpellOnly || action.type === 'damage')
    const checkForTargetSettings = this.getSetting(Settings.SETTING_ALLOW_TARGETED_ROLLS, 'Allow')

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
      const checkManeuverSetting = this.getSetting(Settings.SETTING_ALLOW_ROLL_BASED_ON_MANEUVER, 'Warn')

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
    const checkMaxActionsSetting = this.getSetting(Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS, 'Warn')
    const maxActions = this.modelV2.conditions.actions.maxActions ?? 1
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
    const maxBlocks = this.modelV2.conditions.actions.maxBlocks ?? 1

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
      const checkCombatStartedSetting = this.getSetting(Settings.SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START, 'Warn')

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
   * NOTE: Both character and characterV2
   *
   * Check if the current action consumes an action slot from the actor.
   * False by default to handle things like attribute rolls.
   */
  canConsumeAction(action: AnyObject, chatThing?: string, actorComponent?: AnyObject): boolean {
    if (!action && !chatThing) return false

    const useMaxActions = this.getSetting(Settings.SETTING_USE_MAX_ACTIONS, 'Disable')

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
   * NOTE: Both character and characterV2.
   *
   * This method is called when "system.conditions.maneuver" changes on the actor (via the update method)
   */
  async replaceManeuver(maneuverId: string) {
    this.getDependentTokens().forEach(token => token.object?.setManeuver(maneuverId))
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * TODO The behavior of replacePosture and replaceManeuver are different. The maneuver one updates tokens, while this
   * one toggles status effects. Consider unifying the behavior.
   */
  async replacePosture(postureId: string) {
    const id = postureId === GURPS.StatusEffectStanding ? this.modelV2.conditions.posture : postureId

    this.toggleStatusEffect(id)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  isEffectActive(effect: ActiveEffect.Implementation | { id: string }): boolean {
    return this.effects.some(activeEffect => activeEffect.id === effect.id)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2
   */
  get damageAccumulators(): any[] | null {
    return this.modelV2.conditions.damageAccumulators ?? null
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async accumulateDamageRoll(action: fields.SchemaField.InitializedData<DamageActionSchema>): Promise<void> {
    return this.modelV2.accumulateDamageRoll(action)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async incrementDamageAccumulator(index: number): Promise<void> {
    return this.modelV2.incrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async decrementDamageAccumulator(index: number): Promise<void> {
    return this.modelV2.decrementDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async clearDamageAccumulator(index: number): Promise<void> {
    return this.modelV2.clearDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async applyDamageAccumulator(index: number): Promise<void> {
    return this.modelV2.applyDamageAccumulator(index)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  findEquipmentByName(pattern: string, otherFirst = false): [Item.Implementation | null, string | null] | null {
    // Removed leading slashes
    const patterns = makeRegexPatternFrom(pattern.replace(/^\/+/, ''))
      // Remove leading ^
      .substring(1)
      // Split by /
      .split('/')
      // Apply ^ to each pattern
      .map(patternFragment => new RegExp('^' + patternFragment, 'i'))

    const carriedItem = this.modelV2.equipmentV2.carried.find((equipmentItem: Item.OfType<ItemType.Equipment>) =>
      patterns.some(pattern => pattern.test(equipmentItem.name))
    )
    const otherItem = this.modelV2.equipmentV2.other.find((equipmentItem: Item.OfType<ItemType.Equipment>) =>
      patterns.some(pattern => pattern.test(equipmentItem.name))
    )

    const carriedResult: [Item.OfType<ItemType.Equipment>, string] | null = carriedItem
      ? [carriedItem ?? null, carriedItem.id ?? '']
      : null
    const otherResult: [Item.OfType<ItemType.Equipment>, string] | null = otherItem
      ? [otherItem ?? null, otherItem.id ?? '']
      : null

    return otherFirst ? (otherResult ?? carriedResult ?? null) : (carriedResult ?? otherResult ?? null)
  }

  /* ---------------------------------------- */

  async updateEqtCountV2(id: string, count: number) {
    const equipment = this.modelV2.allEquipmentV2.find(equipmentItem => equipmentItem.id === id)
    const updateData: Record<string, any> = { _id: id, system: { count } }

    // If modifying the quantity of an item should automatically force imports to ignore the imported quantity,
    // set ignoreImportQty to true.
    if (ImportSettings.ignoreQuantityOnImport) {
      updateData.system.ignoreImportQty = true
    }

    if (equipment) {
      await this.updateEmbeddedDocuments('Item', [updateData], { parent: this })

      return equipment
    } else {
      throw new Error(`GURPS | Equipment with ID ${id} not found in actor ${this.name}`)
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  isEmptyActor(): boolean {
    return false
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async runOTF(otf: string): Promise<void> {
    const action = GURPS.parselink(otf)

    await GURPS.performAction(action.action!, this)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  getChecks(checkType: string): {
    data: CheckInfo[] | Record<string, CheckInfo> | Record<string, CheckInfo[]>
    size: number
  } {
    return this.modelV2.getChecks(checkType)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async _sanityCheckItemSettings(actorComp: AnyObject): Promise<boolean> {
    let canEdit = false
    const message = 'GURPS.settingNoEquipAllowedHint'

    if (actorComp.itemid) canEdit = true

    if (!canEdit) {
      const phrases = game.i18n!.localize(message)
      const body = phrases
        .split('.')
        .filter(phrase => !!phrase)
        .map(phrase => `${phrase.trim()}.`)
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
   * NOTE: Both character and characterV2.
   *
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
      recurselist(list, (value: any, parentKey: string, _depth: number) => {
        const exists = include ? !!value?.[key]?.includes?.(id) : value?.[key] === id

        if (exists) traitKey = `system.${sysKey}.` + parentKey
      })
    }

    return traitKey
  }

  /**
   * NOTE: Both character and characterV2.
   */
  async toggleExpand(path: string, expandOnly: boolean = false) {
    const obj = foundry.utils.getProperty(this, path) as any

    // Check if object implements IContainable interface and call toggleOpen
    if (ContainerUtils.isToggleable(obj)) await obj.toggleOpen(expandOnly)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async refreshDR() {
    await this.changeDR('+0', [])
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * Reorder an item in the actor's item list. This function moves the item at sourceKey to be just before the item at
   * targetKey.
   * @param sourceKey A full path up to the index, such as "system.skills.123456"
   * @param targetkey A full path up to the index, such as "system.skills.654321"
   * @param object The object to move
   * @param isSrcFirst Whether the source key comes first
   *
   * @deprecated Use moveItem() instead
   */
  async reorderItem(sourceKey: string, targetkey: string) {
    return await this.moveItem(sourceKey, targetkey)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async updateEqtCount(eqtkey: string, count: number) {
    const eqt = foundry.utils.getProperty(this, eqtkey) as EquipmentV1
    const item = eqt.equipmentV2

    await this.updateEqtCountV2(item.id!, count)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async handleEquipmentDrop(dragData: EquipmentDropData): Promise<boolean> {
    // Drag and drop on same actor is handled by moveEquipment().
    if (dragData.actorid === this.id) return false

    if (!dragData.itemid) {
      ui.notifications?.warn(game.i18n!.localize('GURPS.cannotDragNonFoundryEqt'))

      return false
    }

    // TODO: Why is dragging from unlinked tokens disallowed?
    if (!dragData.isLinked) {
      ui.notifications?.warn(
        `You cannot drag from an unlinked token. The source token must have 'Link Actor Data' checked.`
      )

      return false
    }

    const srcActor = game.actors!.get(dragData.actorid) as GurpsActorV2<Actor.SubType> | undefined

    if (!srcActor) return false
    const eqt = foundry.utils.getProperty(srcActor, dragData.key) as EquipmentV1

    if (
      (!!eqt.contains && Object.keys(eqt.contains).length > 0) ||
      (!!eqt.collapsed && Object.keys(eqt.collapsed).length > 0)
    ) {
      ui.notifications?.warn('You cannot transfer an Item that contains other equipment.')

      return false
    }

    let count: number | null = eqt.count

    if (count && count > 1) {
      count = await this.promptEquipmentQuantity(eqt.name, game.i18n!.format('GURPS.TransferTo', { name: this.name }))
    }

    if (!count) return false

    if (count! > eqt.count) count = eqt.count

    // If the two actors are owned by the same user...
    if (this.isOwner && srcActor?.isOwner) {
      // Search the target actor (this) for an item with the same name.
      const existing = this.findEquipmentByName(eqt.name, false)

      if (existing) {
        // If found, increment the count of the existing item.
        // @ts-expect-error - equipmentV2 system type not fully typed
        await this.updateEqtCountV2(existing[0].id!, existing[0].system.eqt.count + count)
      } else {
        // If not found, create a new item with the specified count.
        await this.#createEquipment(eqt.equipmentV2.toObject(false), count)
      }

      // Adjust the source actor's equipment.
      if (count >= eqt.count) await srcActor.items.get(dragData.key)?.delete()
      else await srcActor.updateEqtCount(dragData.key, +eqt.count - count)
    } else {
      // The two actors are not owned by the same user.
      const destowner = game.users?.players.find(player => this.testUserPermission(player, 'OWNER'))

      if (destowner) {
        // Send a request to the owner of the destination actor to add the item.
        ui.notifications?.info(`Asking ${this.name} if they want ${eqt.name}`)

        dragData.itemData.system.eqt.count = count // They may not have given all of them

        game.socket?.emit('system.gurps', {
          type: 'dragEquipment1',
          srckey: dragData.key,
          srcuserid: game.user!.id,
          srcactorid: dragData.actorid,
          destuserid: destowner.id,
          destactorid: this.id,
          itemData: dragData.itemData,
          count: +count,
        })
      } else ui.notifications?.warn(game.i18n!.localize('GURPS.youDoNotHavePermission'))
    }

    return false
  }

  /* ---------------------------------------- */

  async #createEquipment(
    eqt: Record<string, any>,
    count: number,
    parent: Item.OfType<ItemType.Equipment> | null = null
  ) {
    const { _id: _omit, ...itemData } = foundry.utils.duplicate(eqt) as Record<string, any>

    itemData.system.containedBy = parent?.id ?? null
    itemData.system.count = count
    itemData.system.carried = true // Default to carried when transferring.
    await this.createEmbeddedDocuments('Item', [itemData as Item.CreateData], { parent: this })
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   *
   * @deprecated Use moveItem() instead
   */
  async moveEquipment(sourcekey: string, targetkey: string, shiftkey: boolean = false) {
    return await this.moveItem(sourcekey, targetkey, shiftkey)
  }

  /* ---------------------------------------- */

  /**
   * Handles EITHER legacy or new-style item movement within the actor's items.
   * @param sourcekey using legacy Equipment, such as 'system.equipment.carried.00112' or new-style 'system.equipmentV2.carried.0'
   * @param targetkey using legacy format, such as 'system.equipment.other.00000.contains.00123' or new-style 'system.equipmentV2.other.0.contains.0'
   * @param split true if the user wants to split the item quantity.
   */
  async moveItem(sourcekey: string, targetkey: string, split: boolean = false) {
    if (sourcekey == targetkey) return

    // Convert the legacy key format to the new format.
    sourcekey = this.#convertLegacyItemKey(sourcekey)
    targetkey = this.#convertLegacyItemKey(targetkey)

    // Parse the source and target keys.
    const [sourceCollection, sourceIndex, sourcePath] = parseItemKey(sourcekey)
    const [targetCollection, targetIndex_, targetPath_] = parseItemKey(targetkey)
    let targetIndex = targetIndex_
    let targetPath = targetPath_

    const allowed =
      targetCollection.startsWith('system.equipmentV2') && sourceCollection.startsWith('system.equipmentV2')

    if (!allowed) {
      if (targetCollection !== sourceCollection) {
        // TODO: Maybe this should fail quietly? Or it should pop up a warning to the user?
        throw new Error(
          `Cannot reorder items between different collections: ${sourceCollection} and ${targetCollection}`
        )
      }
    }

    // Get the item to move.
    const item = foundry.utils.getProperty(this, sourcekey) as Item.Implementation

    // If Item is equipmentV2, check if we should split the item's quantity.
    if (item && item.type === ItemType.Equipment && split) {
      if (await this.#splitEquipment(sourcekey, targetkey)) return
    }

    // Set isSrcFirst to true if the source comes before the target in the same container.
    let isSrcFirst = false

    if (sourceCollection === targetCollection) {
      if (sourcePath === targetPath && sourceIndex! < targetIndex!) isSrcFirst = true
    }

    // If the item is being dropped onto a same-named item, check if we should merge them.
    if (
      item.type === ItemType.Equipment &&
      (await this.checkForMerge(item as Item.OfType<ItemType.Equipment>, targetkey))
    )
      return

    let where: 'before' | 'inside' | 'after' | null = null

    if (targetkey === targetCollection)
      where = 'after' // Dropping on the collection itself, so add to the end.
    else
      where = await this.resolveDropPosition(
        item as Item.OfType<ItemType.Equipment | ItemType.Trait | ItemType.Skill | ItemType.Spell>
      )

    if (!where) return

    // Get the source array contents
    const sourceArray = foundry.utils.getProperty(
      this,
      sourcePath ? [sourceCollection, sourcePath].join('.') : sourceCollection
    ) as Item.Implementation[]

    // Adjust the target index if dropping before and the source comes before the target.
    if (where === 'before' && isSrcFirst && targetIndex && targetIndex > 0) targetIndex--
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
      ) as Item.Implementation[]

    // Remove the item from the source array.
    sourceArray.splice(sourceIndex!, 1)

    // If targetIndex is undefined, set to to add to the end of the array.
    targetIndex ??= targetArray.length

    // Set the parent and add the item to the target.
    let containedBy = null

    if (targetPath) {
      const container = foundry.utils.getProperty(
        this,
        targetCollection + '.' + targetPath.replace(/\.contains$/, '') // Get rid of the final '.contains'.
      ) as Item.Implementation

      containedBy = container.id
    }

    const updates: Record<string, any>[] = []
    const update = {
      _id: item.id,
      sort: targetIndex,
      system: {
        containedBy: containedBy ?? null,
      },
    } as Item.UpdateData

    if (item.isOfType(ItemType.Equipment)) {
      // @ts-expect-error: wrong type for _id provided by fvtt-types
      update.system!._carried = targetCollection === 'system.equipmentV2.carried'
    }

    updates.push(update)

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

  private async resolveDropPosition(
    item: Item.OfType<ItemType.Equipment | ItemType.Trait | ItemType.Skill | ItemType.Spell>
  ): Promise<'before' | 'inside' | 'after' | null> {
    return await foundry.applications.api.DialogV2.wait({
      window: { title: item.name },
      content: `<p>${game.i18n!.localize('GURPS.dropResolve')}</p>`,
      buttons: [
        {
          action: 'before',
          icon: 'fa-solid fa-turn-left-down',
          label: 'GURPS.dropBefore',
          default: true,
        },
        {
          action: 'inside',
          icon: 'fas fa-sign-in-alt',
          label: 'GURPS.dropInside',
        },
      ],
    })
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

  /**
   * @param key such as 'system.equipment.carried.00000.contains.00123'. May also parse keys ending with a property,
   *  such as 'system.equipment.carried.00000.contains.00123.weight'.
   * @returns [
   *  string - primary component collection, such as 'system.equipment.carried',
   *  number - index (as a number) of the final segment of the path (such as 123 in the example),
   *  path - path within the collection, such as '00000.contains'.
   *  property - final property if the key ends with a property rather than an index, otherwise undefined.
   * ]
   */
  /**
   * Ask the user if they want to split the quantity of the item and put some in targetkey, leaving the rest in srckey.
   * @param srckey
   * @param targetkey
   * @returns true if split was handled.
   */
  async #splitEquipment(srckey: string, targetkey: string): Promise<boolean> {
    const sourceItem = (foundry.utils.getProperty(this, srckey) as Item.OfType<ItemType.Equipment>) ?? null

    if (!sourceItem || !sourceItem.system || sourceItem.system.count <= 1) return false // Nothing to split

    const count = (await this.promptEquipmentQuantity(sourceItem.name, game.i18n!.localize('GURPS.splitQuantity'))) ?? 0

    if (count <= 0) return true // Didn't want to split.
    if (count >= sourceItem.system.count) return false // Not a split, but a move.

    // Could be a list such as 'system.equipment.other' or an item such as 'system.equipment.other.1'.
    // If it ends in '.other' or '.carried', parent is null.
    let parent = null

    if (!targetkey.match(/^system\.equipmentV2\.(other|carried)$/)) {
      parent = (foundry.utils.getProperty(this, targetkey) as Item.OfType<ItemType.Equipment>) ?? null
    }

    // Copy item and save.
    await this.#createEquipment(sourceItem.toObject(false), count, parent)

    // Update src equipment count (sourceItem.eqt.count - count)
    await this.updateEqtCountV2(sourceItem.id!, sourceItem.system.count - count)

    return true
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  private async promptEquipmentQuantity(eqt: string, title: string): Promise<number | null> {
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
          // @ts-expect-error - DialogV2 callback button.form.elements not fully typed
          callback: (_, button, __) => parseInt(button.form!.elements.qty.valueAsNumber),
        },
      ],
    })

    return result
  }

  /* ---------------------------------------- */

  private async checkForMerge(item: Item.OfType<ItemType.Equipment>, targetkey: string): Promise<boolean> {
    // If dropping on an item of the same name and type, ask if they want to merge.
    const targetItem = (foundry.utils.getProperty(this, targetkey) as Item.OfType<ItemType.Equipment>) ?? null

    if (!targetItem || targetItem.type !== ItemType.Equipment || targetItem.name !== item.name) return false

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
      await this.updateEqtCountV2(targetItem.id!, targetItem.system.count + item.system.count)
      // Delete the source item.
      await item.delete()

      return true
    }

    return false
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  _findEqtkeyForId(key: string, id: any): string | undefined {
    const equipment = [...this.modelV2.equipmentV2.carried, ...this.modelV2.equipmentV2.other]

    return equipment.find((item: Record<string, any>) => item[key] === id)?.id ?? undefined
  }

  /* ---------------------------------------- */

  /**
   * Both for new and legacy actors, add a new item to the actor.
   */
  async addNewItemData(itemData: Record<string, any>, targetKey: string | null = null) {
    if (targetKey) {
      targetKey = this.#convertLegacyItemKey(targetKey)
      const parent = foundry.utils.getProperty(this, targetKey) as Item.OfType<ItemType.Equipment> | null

      if (parent && parent.isOfType(ItemType.Equipment)) {
        itemData.system.containedBy = parent.id
      }
    }

    this.#createEquipment(itemData, itemData.system.eqt.count ?? 1, null)
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  async setMoveDefault(value: string) {
    return (this.system as Actor.SystemOfType<ActorType.Character>).setMoveDefault(value)
  }

  /**
   * Both for new and legacy actors, add a new item to the actor.
   */
  handleDamageDrop(damageData: any) {
    if (game.user?.isGM || !DamageModule().settings.onlyGMsCanOpenADD()) {
      const dialog = new GURPS.ApplyDamageDialog(this, damageData)

      dialog.render(true)
    } else ui.notifications?.warn(game.i18n?.localize('GURPS.invalidUserForDamageWarning') ?? '')
  }
}

export { GurpsActorV2 }
