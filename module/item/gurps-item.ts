import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { BaseItemModel } from './data/base.js'
import { MeleeAttackModel, RangedAttackModel } from '../action/index.js'
import { ModelCollection } from '../data/model-collection.js'

import { TraitComponent, TraitModel } from './data/trait.js'
import { SkillComponent, SkillModel } from './data/skill.js'
import { EquipmentComponent, EquipmentModel } from './data/equipment.js'

class GurpsItemV2<SubType extends Item.SubType = Item.SubType> extends foundry.documents.Item<SubType> {
  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is Item.OfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Item.SubType)
  }

  /* ---------------------------------------- */

  get isContained(): boolean {
    // if (this.system instanceof BaseItemModel) {
    return (this.system as BaseItemModel).isContained
    // }
    // return false
  }

  get containedBy(): string | null {
    // if (this.system instanceof BaseItemModel) {
    return (this.system as BaseItemModel).containedBy ?? null
    // }
    // return null
  }

  /* ---------------------------------------- */

  get contents(): Item.Implementation[] {
    // if (!(this.system instanceof BaseItemModel)) return []
    return (this.system as BaseItemModel).contents
  }

  /* ---------------------------------------- */

  get allContents(): Item.Implementation[] {
    // if (!(this.system instanceof BaseItemModel)) return []
    return (this.system as BaseItemModel).allContents
  }

  /* ---------------------------------------- */

  get disabled(): boolean {
    const disabled = (this.system as BaseItemModel).disabled === true
    // If this item is contained by a Trait, it is disabled if the Trait is disabled
    if (!disabled && (this.system as BaseItemModel).containedBy)
      return this.parent?.items.get((this.system as BaseItemModel).containedBy!)?.disabled === true
    return disabled
  }

  /* ---------------------------------------- */

  override getEmbeddedDocument<EmbeddedName extends Item.Embedded.CollectionName>(
    embeddedName: EmbeddedName,
    id: string,
    { invalid, strict }: foundry.abstract.Document.GetEmbeddedDocumentOptions
  ): Item.Embedded.DocumentFor<EmbeddedName> | undefined {
    const systemEmbeds = (this.system?.constructor as any).metadata.embedded ?? {}
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

  override async deleteDialog(options = {}) {
    // Display custom delete dialog when deleting a container with contents
    const count = this.contents.length
    if (count) {
      return foundry.applications.api.Dialog.confirm({
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
    }

    return super.deleteDialog(options)
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

  override prepareBaseData() {
    super.prepareBaseData()

    const documentNames = Object.keys((this.system as BaseItemModel)?.metadata?.embedded ?? {})
    for (const documentName of documentNames) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
        pseudoDocument.prepareBaseData()
      }
    }
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()

    const documentNames = Object.keys((this.system as BaseItemModel)?.metadata?.embedded ?? {})
    for (const documentName of documentNames) {
      for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
        pseudoDocument.prepareDerivedData()
      }
    }
  }

  override update(data: Item.UpdateData, options?: Item.Database.UpdateOptions): Promise<this | undefined> {
    console.log('GURPS | GurpsItemV2#update', { data, options })
    return super.update(data, options)
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
    if (!(this.system instanceof BaseItemModel) || !this.system.enabled) return []

    const actions = (this.system as BaseItemModel).actions

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

  get hasAttacks(): boolean {
    return this.getItemAttacks().length > 0
  }

  /* ---------------------------------------- */

  async toggleEnabled(enabled: boolean | null = null): Promise<Item.UpdateData | undefined> {
    if (!this.isOfType('equipmentV2')) {
      console.warn(`Item of type "${this.type}" cannot be toggled.`)
      return this
    }

    // @ts-expect-error
    const currentEnabled = (this.system as Item.SystemOfType<'equipmentV2'>).equipped

    // NOTE: do I really need to assert Item.UpdateData here?
    // @ts-expect-error
    return this.update({ 'system.equipped': enabled === null ? !currentEnabled : enabled })
  }

  async toggleEquipped(equipped: boolean | null = null): Promise<Item.UpdateData | undefined> {
    return this.toggleEnabled(equipped)
  }

  /* ---------------------------------------- */
  /* Legacy Functionality                     */
  /* ---------------------------------------- */
  get addToQuickRoll(): boolean {
    // if (!(this.system instanceof TraitModel)) return false
    return (this.system as TraitModel).addToQuickRoll
  }

  get component(): TraitComponent | SkillComponent | null {
    if (this.type === 'featureV2') return this.fea
    if (this.type === 'skillV2') return this.ski
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

  get eqt(): EquipmentComponent | null {
    if (!(this.system instanceof EquipmentModel)) return null
    return this.system.eqt
  }

  /* ---------------------------------------- */

  get contains() {
    return this.contents.sort((a, b) => a.sort - b.sort) ?? []
  }

  /**
   * Find Actor Component Key for this Item Type.
   * NOTE: May be removed after full migration; the output isn't really used for anything real.
   * @returns {string} actor.system.<key>
   */
  get actorComponentKey() {
    const keys = {
      equipmentV2: 'equipment',
      featureV2: 'ads',
      skillV2: 'skills',
      spell: 'spells',
      meleeAtk: 'melee',
      rangedAtk: 'ranged',
    } // @ts-expect-error
    const sysKey = keys[this.type]
    if (!sysKey) throw new Error(`No actor system key found for ${this.type}`)
    return sysKey
  }

  /* ---------------------------------------- */

  toggleCollapsed(expandOnly: boolean = false): void {
    const newValue = !(this.system as BaseItemModel).open
    if (expandOnly && !newValue) return
    this.update({ 'system.open': newValue } as Item.UpdateData)
  }
}

export { GurpsItemV2 }
