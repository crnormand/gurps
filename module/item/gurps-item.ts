import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { BaseItemModel } from './data/base.js'
import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { ModelCollection } from '../data/model-collection.js'
import { IContainable } from '../data/mixins/containable.js'

import { TraitComponent, TraitModel } from './data/trait.js'
import { SkillComponent, SkillModel } from './data/skill.js'
import { EquipmentComponent, EquipmentModel } from './data/equipment.js'
import { SpellComponent, SpellModel } from './data/spell.js'
import { ItemV1Interface, ItemV1Model } from './legacy/itemv1-interface.js'
import { recurselist } from '../../lib/utilities.js'

class GurpsItemV2<SubType extends Item.SubType = Item.SubType>
  extends foundry.documents.Item<SubType>
  implements ItemV1Interface, IContainable<GurpsItemV2>
{
  // Narrowed view of this.system for GurpsItemV2 logic.
  get modelV2(): BaseItemModel {
    return this.system as Item.SystemOfType<'equipmentV2' | 'featureV2' | 'skillV2' | 'spellV2'>
  }

  // Narrowed view of this.system for GurpsItem logic.
  get modelV1() {
    // @ts-expect-error: Temporary until full migration.
    return this.system as ItemV1Model
  }

  // Common guard for new actor subtypes.
  get isNewItemType(): boolean {
    return this.isOfType('equipmentV2', 'featureV2', 'skillV2', 'spellV2')
  }

  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is Item.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Item.SubType)
  }

  /* ---------------------------------------- */

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
    await this.update({ 'system.open': newValue } as Item.UpdateData)
  }

  /* ---------------------------------------- */

  get disabled(): boolean {
    const disabled = this.modelV2.disabled === true

    // If this item is contained by another Item, it is disabled if the containing Item is disabled.
    return !disabled && this.modelV2.containedBy
      ? this.parent?.items.get(this.modelV2.containedBy!)?.disabled === true
      : disabled
  }

  /* ---------------------------------------- */

  get notes(): string | null {
    return this.modelV2.component?.notes ?? null
  }

  /* ---------------------------------------- */

  override getEmbeddedDocument<EmbeddedName extends Item.Embedded.CollectionName>(
    embeddedName: EmbeddedName,
    id: string,
    { invalid, strict }: foundry.abstract.Document.GetEmbeddedDocumentOptions
  ): Item.Embedded.DocumentFor<EmbeddedName> | undefined {
    const systemEmbeds = this.modelV2?.metadata.embedded ?? {}
    if (embeddedName in systemEmbeds) {
      const path = systemEmbeds[embeddedName]
      return (
        (foundry.utils.getProperty(this, path) as ModelCollection<any>).get(id, {
          invalid,
          strict,
        }) ?? undefined
      )
    }
    return super.getEmbeddedDocument(embeddedName, id, { invalid, strict })
  }

  /* ---------------------------------------- */

  override delete(operation?: Item.Database.DeleteOperation & { deleteContents?: boolean }): Promise<this | undefined> {
    return super.delete(operation)
  }

  /* ---------------------------------------- */

  override async deleteDialog(options = {}): Promise<this | false | null | undefined> {
    // Display custom delete dialog when deleting a container with contents
    const count = this.contents.length
    if (count) {
      const response = await foundry.applications.api.Dialog.confirm({
        window: {
          title: `${game.i18n?.format('DOCUMENT.Delete', { type: game.i18n.localize('DOCUMENT.Item') })}: ${this.name}`,
        },
        content:
          `<p>${game.i18n?.format('GURPS.Item.DeleteMessage', { count: count.toString() })}</p>` +
          `<label>` +
          `<input type="checkbox" name="deleteContents">` +
          `${game.i18n?.localize('GURPS.Item.DeleteContents')}` +
          `</label>`,
        yes: {
          action: '',
          callback: (event: PointerEvent | SubmitEvent) => {
            const deleteContents = (
              (event.currentTarget as HTMLElement).querySelector('[name="deleteContents"]') as HTMLInputElement
            )?.checked
            this.delete({ deleteContents })
          },
        },
        options: { ...options },
      })
      return response ? this : undefined
    }

    return super.deleteDialog(options)
  }

  /* ---------------------------------------- */

  /**
   * Obtain the embedded collection of a given pseudo-document type.
   */
  getEmbeddedPseudoDocumentCollection(embeddedName: string): ModelCollection<PseudoDocument> {
    const collectionPath = this.modelV2?.metadata.embedded?.[embeddedName]
    if (!collectionPath) {
      throw new Error(
        `${embeddedName} is not a valid embedded Pseudo-Document within the [${'type' in this ? this.type : 'base'}] ${this.documentName} subtype!`
      )
    }
    return foundry.utils.getProperty(this, collectionPath) as ModelCollection<PseudoDocument>
  }

  /* ---------------------------------------- */

  override prepareBaseData() {
    super.prepareBaseData()

    const documentNames = Object.keys(this.modelV2?.metadata?.embedded ?? {})
    for (const documentName of documentNames) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
        pseudoDocument.prepareBaseData()
      }
    }
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()

    const documentNames = Object.keys(this.modelV2?.metadata?.embedded ?? {})
    for (const documentName of documentNames) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
        pseudoDocument.prepareDerivedData()
      }
    }
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
    if (!this.isOfType('equipmentV2')) {
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

  get component(): TraitComponent | SkillComponent | SpellComponent | EquipmentComponent | null {
    if (this.type === 'featureV2') return this.fea
    if (this.type === 'skillV2') return this.ski
    if (this.type === 'spellV2') return this.spl
    if (this.type === 'equipmentV2') return this.eqt
    return null
  }

  /* ---------------------------------------- */

  get fea(): TraitComponent | null {
    if (!(this.system instanceof TraitModel)) return null
    return this.system.fea
  }

  /* ---------------------------------------- */

  get ski(): SkillComponent | null {
    if (!(this.system instanceof SkillModel)) return null
    return this.system.ski
  }

  /* ---------------------------------------- */

  get spl(): SpellComponent | null {
    if (!(this.system instanceof SpellModel)) return null
    return this.system.spl
  }

  /* ---------------------------------------- */

  get eqt(): EquipmentComponent | null {
    if (!(this.system instanceof EquipmentModel)) return null
    return this.system.eqt
  }

  /* ---------------------------------------- */

  get sortedContents() {
    return this.contents.sort((a, b) => a.sort - b.sort) ?? []
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
    this.update({ 'system.open': newValue } as Item.UpdateData)
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
    let attacks: Record<string, any>[] = []
    let attackTypes = ['melee', 'ranged']
    if (attackType !== 'both') attackTypes = [attackType]
    for (let type of attackTypes) {
      recurselist((this.actor!.system as Record<string, any>)[type], (e, _k, _d) => {
        let key = undefined
        if (!!actorComponentUUID && e.uuid === actorComponentUUID) {
          key = this.actor!._findSysKeyForId('uuid', e.uuid, type)
        } else if (!!originalName && e.originalName === originalName) {
          key = this.actor!._findSysKeyForId('originalName', e.originalName, type)
        } else if (!!currentName && e.name === currentName) {
          key = this.actor!._findSysKeyForId('name', e.name, type)
        } else if (this.id === e.fromItem) {
          key = this.actor!._findSysKeyForId('fromItem', e.fromItem, type)
        }
        if (!!key) {
          attacks.push({
            component: e,
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
    let data = foundry.utils.duplicate(this)
    let itemSystem = data.system
    return {
      id: this._id,
      img: this.img,
      name: this.name,
      system: itemSystem,
    }
  }
}

export { GurpsItemV2 }
