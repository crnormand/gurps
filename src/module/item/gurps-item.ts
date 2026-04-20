import { Document } from '@gurps-types/foundry/index.js'
import { CollectionField } from '@module/data/fields/collection-field.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '@module/pseudo-document/typed-pseudo-document.js'
import { deleteDialogWithContents } from '@module/util/delete-dialog.js'
import { isObject } from '@module/util/guards.js'
import { AnyMutableObject, AnyObject, InexactPartial } from 'fvtt-types/utils'

import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { IContainable, isContainable } from '../data/mixins/containable.js'
import { ModelCollection } from '../data/model-collection.js'

import { BaseItemModel, ItemMetadata } from './data/base.js'
import { EquipmentModel } from './data/equipment.js'
import { runSourceMigrations } from './migrate.js'
import { ItemType } from './types.js'

class GurpsItemV2<SubType extends Item.SubType = Item.SubType>
  extends foundry.documents.Item<SubType>
  implements IContainable<GurpsItemV2>
{
  declare pseudoCollections: {
    [K in keyof PseudoDocumentConfig.Embeds['Item']]: ModelCollection<PseudoDocumentConfig.Embeds['Item'][K]>
  }

  /* ---------------------------------------- */

  // Narrowed view of this.system for GurpsItemV2 logic.
  get modelV2(): BaseItemModel {
    return this.system as Item.SystemOfType<ItemType.Equipment | ItemType.Trait | ItemType.Skill | ItemType.Spell>
  }

  // Common guard for new actor subtypes.
  get isNewItemType(): boolean {
    return this.isOfType(ItemType.Equipment, ItemType.Trait, ItemType.Skill, ItemType.Spell)
  }

  /* ---------------------------------------- */

  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is Item.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Item.SubType)
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

  static override getDefaultArtwork(itemData?: foundry.documents.BaseItem.CreateData): Item.GetDefaultArtworkReturn {
    const { type } = itemData as unknown as { type: ItemType } & AnyObject
    const { img } = super.getDefaultArtwork(itemData)

    const dataModel = CONFIG.Item.dataModels[type]

    if (foundry.utils.isSubclass(dataModel, BaseItemModel)) {
      return dataModel.getDefaultArtwork(itemData) as Item.GetDefaultArtworkReturn
    }

    return { img }
  }

  /* ---------------------------------------- */

  /**
   * Toggle the open/collapsed state of the notes on this document.
   */
  async toggleNotes(): Promise<void> {
    if ('toggleNotes' in this.system && typeof this.system.toggleNotes === 'function')
      return await this.system.toggleNotes()
  }

  /* ---------------------------------------- */
  /*  IContainable Interface Implementation   */
  /* ---------------------------------------- */

  get containedBy(): string | null {
    return this.modelV2.containedBy ?? null
  }

  get open(): boolean | null {
    return this.modelV2.open ?? null
  }

  get container(): GurpsItemV2 | null {
    if (!this.modelV2.containedBy) return null

    return (this.parent?.items.get(this.modelV2.containedBy) as GurpsItemV2) || null
  }

  get isContained(): boolean {
    return this.modelV2.isContained
  }

  get contents(): GurpsItemV2[] {
    return this.modelV2.contents
  }

  get allContents(): GurpsItemV2[] {
    return this.modelV2.allContents
  }

  get containerDepth(): number {
    return this.modelV2.containerDepth
  }

  get contains(): GurpsItemV2[] {
    return this.contents
  }

  /**
   * Check if this container contains the specified item.
   */
  containsItem(item: GurpsItemV2): boolean {
    return this.modelV2.containsItem(item)
  }

  get ancestors(): GurpsItemV2[] {
    return this.modelV2.ancestors
  }

  getDescendants(filter?: (item: GurpsItemV2) => boolean): GurpsItemV2[] {
    return this.modelV2.getDescendants(filter)
  }

  isContainedBy(container: GurpsItemV2): boolean {
    return this.modelV2.isContainedBy(container)
  }

  /**
   * Toggle the open/collapsed state of this container.
   */
  async toggleOpen(expandOnly: boolean = false): Promise<void> {
    const newValue = !this.modelV2.open

    if (expandOnly && !newValue) return
    // @ts-expect-error: system does not recognise Item SubType
    await this.update({ 'system.open': newValue })
  }

  /* ---------------------------------------- */

  get disabled(): boolean {
    const disabled = this.modelV2.disabled === true

    // If this item is contained by another Item, it is disabled if the containing Item is disabled.
    return !disabled && this.modelV2.containedBy
      ? (this.parent?.items.get(this.modelV2.containedBy!) as GurpsItemV2 | undefined)?.disabled === true
      : disabled
  }

  /* ---------------------------------------- */

  get notes(): string | null {
    return this.modelV2.notes ?? null
  }

  /* ---------------------------------------- */

  override getEmbeddedDocument<EmbeddedName extends gurps.Pseudo.EmbeddedCollectionName<'Item'>>(
    embeddedName: EmbeddedName,
    id: string,
    options?: foundry.abstract.Document.GetEmbeddedDocumentOptions
  ): gurps.Pseudo.EmbeddedDocument<'Item', EmbeddedName> {
    const { invalid = false, strict = true } = options ?? {}

    const metadata = (this.system?.constructor as any).metadata as ItemMetadata

    const systemEmbeds = metadata.embedded ?? {}

    if (embeddedName in systemEmbeds) {
      return this.getEmbeddedCollection(embeddedName as keyof PseudoDocumentConfig.Embeds['Item']).get(id, {
        invalid,
        strict,
      }) as any
    }

    return super.getEmbeddedDocument(embeddedName as Item.Embedded.CollectionName, id, { invalid, strict }) as any
  }

  /* ---------------------------------------- */

  override getEmbeddedCollection<EmbeddedName extends Item.Embedded.CollectionName>(
    embeddedName: EmbeddedName
  ): Item.Embedded.CollectionFor<EmbeddedName>
  override getEmbeddedCollection<EmbeddedName extends keyof PseudoDocumentConfig.Embeds['Item']>(
    embeddedName: EmbeddedName
  ): ModelCollection<PseudoDocumentConfig.Embeds['Item'][EmbeddedName]>
  override getEmbeddedCollection(embeddedName: string): unknown {
    return (
      this.pseudoCollections[embeddedName as keyof PseudoDocumentConfig.Embeds['Item']] ??
      super.getEmbeddedCollection(embeddedName as Item.Embedded.CollectionName)
    )
  }

  /* ---------------------------------------- */

  override async createEmbeddedDocuments<EmbeddedName extends Item.Embedded.Name>(
    embeddedName: EmbeddedName,
    data: Document.CreateDataForName<EmbeddedName>[] | undefined,
    operation?: Document.Database.CreateOperationForName<EmbeddedName>
  ): Promise<Array<Document.StoredForName<EmbeddedName>>>
  override async createEmbeddedDocuments<EmbeddedName extends keyof PseudoDocumentConfig.Embeds['Item']>(
    embeddedName: EmbeddedName,
    data: gurps.Pseudo.EmbeddedCreateData<'Item', EmbeddedName>[] | undefined,
    operation?: Partial<gurps.Pseudo.CreateOperation>
  ): Promise<Array<PseudoDocumentConfig.Embeds['Item'][EmbeddedName]>>
  override async createEmbeddedDocuments(
    embeddedName: string,
    data?: unknown[],
    operation?: object
  ): Promise<unknown[]> {
    data ||= []
    const metadata = (this.system?.constructor as any).metadata as ItemMetadata

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

            if (!('type' in dataEntry) || !subTypes.includes(dataEntry.type as string))
              return [await cls.createDialog(dataEntry, { parent: this, ...operation })]
          }
        }
      }

      return cls.createDocuments(data as any[], { parent: this, ...operation })
    }

    return super.createEmbeddedDocuments(embeddedName as Item.Embedded.Name, data as never, operation as never)
  }

  /* ---------------------------------------- */

  override async deleteEmbeddedDocuments<EmbeddedName extends Item.Embedded.Name>(
    embeddedName: EmbeddedName,
    ids: Array<string>,
    operation?: Document.Database.DeleteOperationForName<EmbeddedName>
  ): Promise<Array<Document.StoredForName<EmbeddedName>>>
  override async deleteEmbeddedDocuments<EmbeddedName extends keyof PseudoDocumentConfig.Embeds['Item']>(
    embeddedName: EmbeddedName,
    ids: Array<string>,
    operation?: Partial<PseudoDocument.DeleteOperation>
  ): Promise<Array<PseudoDocumentConfig.Embeds['Item'][EmbeddedName]>>
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

    return super.deleteEmbeddedDocuments(embeddedName as Item.Embedded.Name, ids as never, operation as never)
  }

  /* ---------------------------------------- */

  static override async createDialog(
    data?: Item.CreateDialogData,
    createOptions?: Item.Database.DialogCreateOptions,
    options?: Item.CreateDialogOptions
  ): Promise<Item.Stored | null | undefined> {
    const isDevMode = GURPS.modules.Dev?.settings.enableNonProductionDocumentTypes ?? false

    if (!isDevMode) {
      options ||= {}
      const allTypes = Item.TYPES
      const excludeTypes = [
        'base',
        ItemType.GcsTrait,
        ItemType.GcsSkill,
        ItemType.GcsSpell,
        ItemType.GcsEquipment,
        ItemType.GcsTraitModifier,
        ItemType.GcsEquipmentModifier,
        ItemType.GcsNote,
      ]

      // Disable non-production Item types if developer mode is off.
      // @ts-expect-error: Improper types
      options.types = allTypes.filter(type => !excludeTypes.includes(type))
    }

    return super.createDialog(data, createOptions, options)
  }

  /* ---------------------------------------- */

  override async delete(
    operation?: Item.Database.DeleteOperation & { deleteContents?: boolean }
  ): Promise<this | undefined> {
    if (isContainable(this) && this.contents.length > 0) {
      if (operation && operation.deleteContents) {
        await Item.deleteDocuments(
          this.allContents.map(item => item.id!),
          { parent: this.parent }
        )
      } else {
        const containedBy = this.modelV2.containedBy ?? null

        await Item.updateDocuments(
          this.contents.map(item => {
            return { _id: item.id!, 'system.containedBy': containedBy }
          }),
          { parent: this.parent }
        )
      }
    }

    return super.delete(operation)
  }

  /* ---------------------------------------- */

  override async deleteDialog(
    options?: InexactPartial<foundry.applications.api.DialogV2.ConfirmConfig>,
    operation?: Document.Database.DeleteOperationForName<'Item'>
  ): Promise<this | false | null | undefined> {
    return (await deleteDialogWithContents.call(this, options, operation as any)) as unknown as Promise<
      this | false | null | undefined
    >
  }

  /* ---------------------------------------- */

  override prepareBaseData() {
    super.prepareBaseData()

    for (const collection of Object.values(this.pseudoCollections))
      for (const pseudo of collection) pseudo.prepareBaseData()
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()

    for (const collection of Object.values(this.pseudoCollections))
      for (const pseudo of collection) pseudo.prepareDerivedData()
  }

  /* ---------------------------------------- */
  /*  Data Migration                          */
  /* ---------------------------------------- */

  static override migrateData(source: AnyMutableObject): AnyMutableObject {
    runSourceMigrations(source)

    return super.migrateData(source)
  }

  /* ---------------------------------------- */
  /*  Utilities                               */
  /* ---------------------------------------- */

  /**
   * Return Item Attacks from melee and ranged Actor Components
   *
   * This is intended for external libraries like Argon Combat HUD,
   * but can be used anytime you have only the Item UUID and need
   * to know if this Item has any Melee or Ranged attacks registered
   * on Actor System.
   *
   * NOTE: change from previous model: Now returns the full item rather than just the component
   * in preparation for deprecating Item Components in the future
   */
  getItemAttacks(options: { attackType: 'melee' }): MeleeAttackModel[]
  getItemAttacks(options: { attackType: 'ranged' }): RangedAttackModel[]
  getItemAttacks(options: { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(): (MeleeAttackModel | RangedAttackModel)[]
  getItemAttacks(options = { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[] {
    if (!this.modelV2 || !this.modelV2.enabled) return []

    const actions = this.modelV2.actions

    switch (options.attackType) {
      case 'melee':
        return actions.filter(item => item.type === 'meleeAttack') as MeleeAttackModel[]
      case 'ranged':
        return actions.filter(item => item.type === 'rangedAttack') as RangedAttackModel[]
      case 'both':
        return actions.filter(item => ['meleeAttack', 'rangedAttack'].includes(item.type)) as (
          | MeleeAttackModel
          | RangedAttackModel
        )[]
      default:
        console.error(`GURPS | GurpsItem#getItemAttacks: Invalid attackType value: ${options.attackType}`)

        return []
    }
  }

  /* ---------------------------------------- */

  /**
   * NOTE: Both GurpsItem and GurpsItemV2.
   */
  get hasAttacks(): boolean {
    return this.getItemAttacks().length > 0
  }

  /* ---------------------------------------- */

  async toggleEnabled(enabled: boolean | null = null) {
    if (!this.isOfType(ItemType.Equipment)) {
      console.warn(`Item of type "${this.type}" cannot be toggled.`)

      return
    }

    const currentEnabled = (this.modelV2 as EquipmentModel).equipped

    // @ts-expect-error: waiting for types to catch up
    return this.update({ 'system.equipped': enabled === null ? !currentEnabled : enabled })
  }

  async toggleEquipped(equipped: boolean | null = null) {
    return this.toggleEnabled(equipped)
  }

  get addToQuickRoll(): boolean {
    // if (!(this.system instanceof TraitModel)) return false
    return this.modelV2.addToQuickRoll
  }

  /* ---------------------------------------- */

  get sortedContents() {
    return this.contents.sort((left, right) => left.sort - right.sort) ?? []
  }

  /* ---------------------------------------- */

  toggleCollapsed(expandOnly: boolean = false): void {
    const newValue = !this.modelV2.open

    if (expandOnly && !newValue) return

    // @ts-expect-error: system does not recognise Item SubType
    this.update({ 'system.open': newValue })
  }
}

export { GurpsItemV2 }
