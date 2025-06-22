import { PseudoDocument } from '../pseudo-document/pseudo-document.js'
import { BaseItemModel } from './data/base.js'
import { MeleeAttack, RangedAttack } from '../action/index.js'
import { ModelCollection } from '../data/model-collection.js'

class GurpsItemV2<SubType extends Item.SubType = Item.SubType> extends foundry.documents.Item<SubType> {
  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is ConfiguredItem<SubType>['document']
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Item.SubType)
  }

  override getEmbeddedDocument<EmbeddedName extends Item.Embedded.CollectionName>(
    embeddedName: EmbeddedName,
    id: string,
    { invalid, strict }: foundry.abstract.Document.GetEmbeddedDocumentOptions
  ): Item.Embedded.DocumentFor<EmbeddedName> | undefined {
    const systemEmbeds = (this.system?.constructor as any).metadata.embedded ?? {}
    if (embeddedName in systemEmbeds) {
      const path = systemEmbeds[embeddedName]
      return foundry.utils.getProperty(this, path).get(id, { invalid, strict }) ?? null
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
    return foundry.utils.getProperty(this, collectionPath)
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
  getItemAttacks(options: { attackType: 'melee' }): MeleeAttack[]
  getItemAttacks(options: { attackType: 'ranged' }): RangedAttack[]
  getItemAttacks(options: { attackType: 'both' }): (MeleeAttack | RangedAttack)[]
  getItemAttacks(): (MeleeAttack | RangedAttack)[]
  getItemAttacks(options = { attackType: 'both' }): (MeleeAttack | RangedAttack)[] {
    if (!(this.system instanceof BaseItemModel)) return []

    const actions = (this.system as BaseItemModel).actions

    switch (options.attackType) {
      case 'melee':
        return actions.filter(item => item.type === 'meleeAtk') as MeleeAttack[]
      case 'ranged':
        return actions.filter(item => item.type === 'rangedAtk') as RangedAttack[]
      case 'both':
        return actions.filter(item => ['meleeAtk', 'rangedAtk'].includes(item.type)) as (MeleeAttack | RangedAttack)[]
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

  async toggleEnabled(enabled: boolean | null = null): Promise<this | undefined> {
    if (!this.isOfType('equipment')) {
      console.warn(`Item of type "${this.type}" cannot be toggled.`)
      return this
    }

    const currentEnabled = (this.system as Item.SystemOfType<'equipment'>).equipped

    // NOTE: do I really need to assert Item.UpdateData here?
    return this.update({ 'system.equipped': enabled === null ? !currentEnabled : enabled } as Item.UpdateData)
  }

  async toggleEquipped(equipped: boolean | null = null): Promise<this | undefined> {
    return this.toggleEnabled(equipped)
  }

  /* ---------------------------------------- */
}

export { GurpsItemV2 }
