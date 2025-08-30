import { BaseItemModel } from './data/base.js'
import { TraitComponent, TraitModel } from './data/trait.js'

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
    return this.fea?.containedBy ?? null
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

  // override getEmbeddedDocument<EmbeddedName extends Item.Embedded.CollectionName>(
  //   embeddedName: EmbeddedName,
  //   id: string,
  //   { invalid, strict }: foundry.abstract.Document.GetEmbeddedDocumentOptions
  // ): Item.Embedded.DocumentFor<EmbeddedName> | undefined {
  //   const systemEmbeds = (this.system?.constructor as any).metadata.embedded ?? {}
  //   if (embeddedName in systemEmbeds) {
  //     const path = systemEmbeds[embeddedName]
  //     return (
  //       (foundry.utils.getProperty(this, path) as ModelCollection<any>).get(id, {
  //         invalid,
  //         strict,
  //       }) ?? undefined
  //     )
  //   }
  //   return super.getEmbeddedDocument(embeddedName, id, { invalid, strict })
  // }

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
  // getEmbeddedPseudoDocumentCollection(embeddedName: string): ModelCollection<PseudoDocument> {
  // const collectionPath = (this.system?.constructor as any).metadata.embedded?.[embeddedName]
  // if (!collectionPath) {
  //   throw new Error(
  //     `${embeddedName} is not a valid embedded Pseudo-Document within the [${'type' in this ? this.type : 'base'}] ${this.documentName} subtype!`
  //   )
  // }
  // return foundry.utils.getProperty(this, collectionPath) as ModelCollection<PseudoDocument>
  // }

  /* ---------------------------------------- */

  override prepareBaseData() {
    super.prepareBaseData()

    // const documentNames = Object.keys((this.system as BaseItemModel)?.metadata?.embedded ?? {})
    // for (const documentName of documentNames) {
    //   for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
    //     pseudoDocument.prepareBaseData()
    //   }
    // }
  }

  /* ---------------------------------------- */

  override prepareDerivedData() {
    super.prepareDerivedData()
    // const documentNames = Object.keys((this.system as BaseItemModel)?.metadata?.embedded ?? {})

    // for (const documentName of documentNames) {
    //   for (const pseudoDocument of this.getEmbeddedPseudoDocumentCollection(documentName)) {
    //     pseudoDocument.prepareDerivedData()
    //   }
    // }
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
  // getItemAttacks(options: { attackType: 'melee' }): MeleeAttackModel[]
  // getItemAttacks(options: { attackType: 'ranged' }): RangedAttackModel[]
  // getItemAttacks(options: { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[]
  // getItemAttacks(): (MeleeAttackModel | RangedAttackModel)[]
  // getItemAttacks(options = { attackType: 'both' }): (MeleeAttackModel | RangedAttackModel)[] {
  //   if (!(this.system instanceof BaseItemModel)) return []

  //   const actions = (this.system as BaseItemModel).actions

  //   switch (options.attackType) {
  //     case 'melee':
  //       return actions.filter(item => item.type === 'meleeAttack') as MeleeAttackModel[]
  //     case 'ranged':
  //       return actions.filter(item => item.type === 'rangedAttack') as RangedAttackModel[]
  //     case 'both':
  //       return actions.filter(item => ['meleeAttack', 'rangedAttack'].includes(item.type)) as (
  //         | MeleeAttackModel
  //         | RangedAttackModel
  //       )[]
  //     default:
  //       console.error(`GURPS | GurpsItem#getItemAttacks: Invalid attackType value: ${options.attackType}`)
  //       return []
  //   }
  // }

  /* ---------------------------------------- */

  get hasAttacks(): boolean {
    return false
    // return this.getItemAttacks().length > 0
  }

  /* ---------------------------------------- */

  async toggleEnabled(enabled: boolean | null = null): Promise<this | undefined> {
    // if (!this.isOfType('equipment')) {
    //   console.warn(`Item of type "${this.type}" cannot be toggled.`)
    //   return this
    // }
    //  const currentEnabled = (this.system as Item.SystemOfType<'equipment'>).equipped
    // // NOTE: do I really need to assert Item.UpdateData here?
    // return this.update({ 'system.equipped': enabled === null ? !currentEnabled : enabled } as Item.UpdateData)
    return this.update({ 'system.equipped': enabled === null ? false : !enabled } as Item.UpdateData)
  }

  async toggleEquipped(equipped: boolean | null = null): Promise<this | undefined> {
    return this.toggleEnabled(equipped)
  }

  /* ---------------------------------------- */
  /* Legacy Functionality                     */
  /* ---------------------------------------- */
  get addToQuickRoll(): boolean {
    // if (!(this.system instanceof TraitModel)) return false
    return (this.system as TraitModel).addToQuickRoll
  }

  get fea(): TraitComponent | null {
    // if (!(this.system instanceof TraitModel)) return null
    return (this.system as TraitModel).fea
  }

  /**
   * Find Actor Component Key for this Item Type.
   * NOTE: May be removed after full migration; the output isn't really used for anything real.
   * @returns {string} actor.system.<key>
   */
  get actorComponentKey() {
    const keys = {
      equipment: 'equipment',
      featureV2: 'ads',
      skill: 'skills',
      spell: 'spells',
      meleeAtk: 'melee',
      rangedAtk: 'ranged',
    } // @ts-expect-error
    const sysKey = keys[this.type]
    if (!sysKey) throw new Error(`No actor system key found for ${this.type}`)
    return sysKey
  }
}

export { GurpsItemV2 }
