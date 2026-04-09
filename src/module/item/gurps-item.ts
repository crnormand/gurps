import { Document } from '@gurps-types/foundry/index.js'
import { CollectionField } from '@module/data/fields/collection-field.js'
import { deleteDialogWithContents } from '@module/util/delete-dialog.js'
import { recurselist } from '@util/utilities.js'
import { AnyObject, InexactPartial } from 'fvtt-types/utils'

import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { IContainable, isContainable } from '../data/mixins/containable.js'
import { ModelCollection } from '../data/model-collection.js'

import { BaseItemModel, ItemMetadata } from './data/base.js'
import { EquipmentModel } from './data/equipment.js'
import { ItemV1Interface, ItemV1Model } from './legacy/itemv1-interface.js'
import { ItemType } from './types.js'

class GurpsItemV2<SubType extends Item.SubType = Item.SubType>
  extends foundry.documents.Item<SubType>
  implements ItemV1Interface, IContainable<GurpsItemV2>
{
  declare pseudoCollections: Record<string, ModelCollection>

  /* ---------------------------------------- */

  // Narrowed view of this.system for GurpsItemV2 logic.
  get modelV2(): BaseItemModel {
    return this.system as Item.SystemOfType<ItemType.Equipment | ItemType.Trait | ItemType.Skill | ItemType.Spell>
  }

  // Narrowed view of this.system for GurpsItem logic.
  get modelV1() {
    if (this.isNewItemType) throw new Error('Item subtype is not a V1 model')

    return this.system as unknown as ItemV1Model<SubType>
  }

  // Common guard for new actor subtypes.
  get isNewItemType(): boolean {
    return this.isOfType(ItemType.Equipment, ItemType.Trait, ItemType.Skill, ItemType.Spell)
  }

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
      this.pseudoCollections[embeddedName] ?? super.getEmbeddedCollection(embeddedName as Item.Embedded.CollectionName)
    )
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
        ItemType.LegacyEquipment,
        ItemType.LegacyTrait,
        ItemType.LegacySkill,
        ItemType.LegacySpell,
        ItemType.GcsTrait,
        ItemType.GcsSkill,
        ItemType.GcsSpell,
        ItemType.GcsEquipment,
        ItemType.GcsTraitModifier,
        ItemType.GcsEquipmentModifier,
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
      for (const pseudo of collection) pseudo.prepareBaseData()
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
    return this.isNewItemType ? this.getItemAttacks().length > 0 : this.getItemAttacksV1().length > 0
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
  /* Legacy Functionality                     */
  /* ---------------------------------------- */

  /**
   * NOTE: Both GurpsItem and GurpsItemV2.
   *
   * Find Actor Component Key for this Item Type.
   * NOTE: May be removed after full migration; the output isn't really used for anything real.
   * @returns {string} actor.system.<key>
   */
  get actorComponentKey() {
    const keys = {
      equipment: 'equipment',
      feature: 'ads',
      skill: 'skills',
      spell: 'spells',
      equipmentV2: 'equipment',
      featureV2: 'ads',
      skillV2: 'skills',
      spellV2: 'spells',
      meleeAtk: 'melee',
      rangedAtk: 'ranged',
    } as Record<string, string>
    const sysKey = keys[this.type]

    if (!sysKey) throw new Error(`No actor system key found for ${this.type}`)

    return sysKey
  }

  /* ---------------------------------------- */

  toggleCollapsed(expandOnly: boolean = false): void {
    const newValue = !this.modelV2.open

    if (expandOnly && !newValue) return

    // @ts-expect-error: system does not recognise Item SubType
    this.update({ 'system.open': newValue })
  }

  /* ---------------------------------------- */

  /* ---------------------------------------- */
  /* ItemV1Interface Implementation           */
  /* ---------------------------------------- */

  /**
   * @deprecated GurpsItem only. Renamed from "getItemAttacks" because I couldn't overload that method properly.
   * According to my search, this method is not called from anywhere inside the GURPS codebase outside of this
   * class.
   *
   * Return Item Attacks from melee and ranged Actor Components
   *
   * This is intended for external libraries like Argon Combat HUD,
   * but can be used anytime you have only the Item UUID and need
   * to know if this Item has any Melee or Ranged attacks registered
   * on Actor System.
   *
   * Because GCA import did not populate the `uuid` field on these Actor Components
   * we need to compare the Item original name for both Item and Component.
   *
   * @param getAttOptions
   * @returns {*[]|boolean}
   */
  getItemAttacksV1(getAttOptions: { attackType?: 'melee' | 'ranged' | 'both' } = {}) {
    const { attackType = 'both' } = getAttOptions
    const component = (this.modelV1 as Record<string, any>)[this.itemSysKey]
    const originalName = component.originalName
    const currentName = component.name
    const actorComponentUUID = component.uuid

    // Look at Melee and Ranged attacks in actor.system
    const attacks: Record<string, any>[] = []
    let attackTypes = ['melee', 'ranged']

    if (attackType !== 'both') attackTypes = [attackType]

    for (const type of attackTypes) {
      recurselist((this.actor!.system as Record<string, any>)[type], (attackComponent, _k, _d) => {
        let key = undefined

        if (!!actorComponentUUID && attackComponent.uuid === actorComponentUUID) {
          key = this.actor!._findSysKeyForId('uuid', attackComponent.uuid, type)
        } else if (!!originalName && attackComponent.originalName === originalName) {
          key = this.actor!._findSysKeyForId('originalName', attackComponent.originalName, type)
        } else if (!!currentName && attackComponent.name === currentName) {
          key = this.actor!._findSysKeyForId('name', attackComponent.name, type)
        } else if (this.id === attackComponent.fromItem) {
          key = this.actor!._findSysKeyForId('fromItem', attackComponent.fromItem, type)
        }

        if (key) {
          attacks.push({
            component: attackComponent,
            key,
          })
        }
      })
    }

    return attacks
  }

  /**
   * @deprecated GurpsItem only.
   */
  // get hasOTFs(): boolean {
  //   return !!this.getItemOTFs(true)
  // }

  /**
   * @deprecated GurpsItem only.
   */
  get itemSysKey(): string {
    const keys: Record<string, string> = {
      equipment: 'eqt',
      feature: 'fea',
      skill: 'ski',
      spell: 'spl',
      meleeAtk: 'mel',
      rangedAtk: 'rng',
    }
    const sysKey = keys[this.type]

    if (!sysKey) throw new Error(`No item system key found for ${this.type}`)

    return sysKey
  }

  /**
   * @deprecated GurpsItem only.
   */
  // getItemOTFs(checkOnly?: boolean): Record<string, any> {
  //   const { notes } = this.system[this.itemSysKey]
  //   const action = parselink(notes || '')
  //   if (!!checkOnly) return !!action.text
  //   return action
  // }

  /**
   * @deprecated GurpsItem only.
   */
  // async toggleEquip(state: boolean): Promise<void> {
  //   if (this.type !== 'equipment' || !this.system.carried || this.system.equipped === equipped) return

  //   const key = this.actor._findEqtkeyForId('itemid', this._id)
  //   let eqt = foundry.utils.duplicate(GURPS.decode(this.actor, key))
  //   if (eqt) {
  //     eqt.equipped = !eqt.equipped
  //     await this.actor.updateItemAdditionsBasedOn(eqt, key)
  //     await this.actor.internalUpdate({ [key]: eqt })
  //   }
  //   this.system.equipped = eqt.equipped
  //   this.system.eqt.equipped = eqt.equipped
  //   await this.actor._updateItemFromForm(this)

  //   console.log(`Change Equipment ${this.name} equipped status to ${equipped}`)
  // }

  /**
   * @deprecated GurpsItem only.
   */
  // async internalUpdate(data: any, context?: any): Promise<void> {
  //   let ctx = { render: !this.ignoreRender }
  //   if (!!context) ctx = { ...context, ...ctx }
  //   await this.update(data, ctx)
  // }

  /**
   * @deprecated GurpsItem only.
   */
  getItemInfo(): Record<string, any> {
    const data = foundry.utils.duplicate(this)
    const itemSystem = data.system

    return {
      id: this._id,
      img: this.img,
      name: this.name,
      system: itemSystem,
    }
  }
}

export { GurpsItemV2 }
