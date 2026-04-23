import { fields, Document } from '@gurps-types/foundry/index.js'
import { CollectionField } from '@module/data/fields/collection-field.js'
import { ItemMetadata } from '@module/item/data/base.js'
import { ItemType } from '@module/item/types.js'
import { TypedPseudoDocument } from '@module/pseudo-document/typed-pseudo-document.js'
import { isObject } from '@module/util/guards.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { ContainerUtils } from '../data/mixins/container-utils.js'
import { ModelCollection } from '../data/model-collection.js'
import { ImportSettings } from '../importer/index.js'
import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { TokenActions } from '../token-actions.js'

import { ActorMetadata, BaseActorModel } from './data/base.js'
import { DamageActionSchema } from './data/character-components.js'
import { HitLocationEntryV2 } from './data/hit-location-entry.js'
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

class GurpsActorV2<SubType extends Actor.SubType> extends Actor<SubType> {
  declare pseudoCollections: {
    [K in keyof PseudoDocumentConfig.Embeds['Actor']]: ModelCollection<PseudoDocumentConfig.Embeds['Actor'][K]>
  }

  /* ---------------------------------------- */

  // Narrowed view of this.system for characterV2 logic.
  private get modelV2() {
    return this.system as Actor.SystemOfType<ActorType.Character>
  }

  /* ---------------------------------------- */

  /* ---------------------------------------- */

  // Common guard for new actor subtypes.
  get isNewActorType(): boolean {
    // NOTE: This is always true after migration, so always return `true`
    return true
    // return this.isOfType(ActorType.Character)
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

  static override getDefaultArtwork(actorData?: foundry.documents.BaseActor.CreateData): Actor.GetDefaultArtworkReturn {
    const { type } = actorData as unknown as { type: ActorType } & AnyObject
    const { img, texture } = super.getDefaultArtwork(actorData)

    const dataModel = CONFIG.Actor.dataModels[type]

    if (foundry.utils.isSubclass(dataModel, BaseActorModel)) {
      return dataModel.getDefaultArtwork(actorData)
    }

    return { img, texture }
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
      const excludeTypes = ['base', ActorType.GcsCharacter, ActorType.GcsLoot]

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
      this.pseudoCollections[embeddedName as keyof PseudoDocumentConfig.Embeds['Actor']] ??
      super.getEmbeddedCollection(embeddedName as Actor.Embedded.CollectionName)
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
    data ||= []
    const metadata = (this.system?.constructor as any).metadata as ActorMetadata

    if (metadata.embedded && embeddedName in metadata.embedded) {
      const cls = GURPS.CONFIG.PseudoDocument.Types[embeddedName as keyof typeof GURPS.CONFIG.PseudoDocument.Types]

      // NOTE: If the PseudoDocument is typed but the type is not specified, fall back to a createDialog for the first entry.
      if (foundry.utils.isSubclass(cls, TypedPseudoDocument)) {
        if (data.length === 1) {
          const dataEntry = data[0]

          if (isObject(dataEntry)) {
            const subTypes = Object.keys(
              GURPS.CONFIG.PseudoDocument.SubTypes[embeddedName as keyof typeof GURPS.CONFIG.PseudoDocument.SubTypes]
            )

            if (!('type' in dataEntry) || !subTypes.includes(dataEntry.type as string)) {
              const createdEntry = await cls.createDialog(dataEntry, { parent: this, ...operation })

              return createdEntry ? [createdEntry] : []
            }
          }
        }
      }

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
    const metadata = (this.system?.constructor as any).metadata as ActorMetadata

    if (metadata.embedded && embeddedName in metadata.embedded) {
      const cls = GURPS.CONFIG.PseudoDocument.Types[embeddedName as keyof typeof GURPS.CONFIG.PseudoDocument.Types]

      return cls.deleteDocuments(ids, { parent: this, ...operation })
    } else if (metadata.embeddedHolderField) {
      const holderItem: Item.Implementation | null =
        (this.system[metadata.embeddedHolderField as keyof typeof this.system] as Item.Implementation) ?? null

      if (holderItem) {
        const itemMetadata = (holderItem.system?.constructor as any).metadata as ItemMetadata

        if (itemMetadata.embedded && embeddedName in itemMetadata.embedded) {
          const cls = GURPS.CONFIG.PseudoDocument.Types[embeddedName as keyof typeof GURPS.CONFIG.PseudoDocument.Types]

          return cls.deleteDocuments(ids, { parent: holderItem, ...operation })
        }
      }
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
  get hitLocationsWithDR(): HitLocationEntryV2[] {
    return this.modelV2.hitLocationsWithDR
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  get _hitLocationRolls() {
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

    for (const collection of Object.values(this.pseudoCollections))
      for (const pseudo of collection) pseudo.prepareBaseData()
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both character and characterV2.
   */
  override prepareDerivedData() {
    super.prepareDerivedData()

    for (const collection of Object.values(this.pseudoCollections))
      for (const pseudo of collection) pseudo.prepareDerivedData()
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

    if (!isCombatActive || !isCombatant || !this.isNewActorType) return result

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
    return this.modelV2.conditions.damageAccumulators
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
    if (!this.isNewActorType) return null

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
    // return (this.model).additionalresources.importname === null
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

  /* ---------------------------------------- */

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
  async setMoveDefault(value: string) {
    return this.modelV2.setMoveDefault(value)
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
