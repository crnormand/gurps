import { CommonItemData } from './data/base.js'

class GurpsItemV2<SubType extends Item.SubType = Item.SubType> extends Item<SubType> {
  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is ConfiguredItem<SubType>['document']
  isOfType(...types: string[]): boolean {
    return types.includes(this.type as Item.SubType)
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  // prepareSiblingData(): void {
  //   ;(this.system as BaseItemData<any>).prepareSiblingData()
  // }

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
  getItemAttacks(options: { attackType: 'melee' }): ConfiguredItem<'meleeAtk'>['document'][]
  getItemAttacks(options: { attackType: 'ranged' }): ConfiguredItem<'rangedAtk'>['document'][]
  getItemAttacks(options: { attackType: 'both' }): ConfiguredItem<'meleeAtk' | 'rangedAtk'>['document'][]
  getItemAttacks(): ConfiguredItem<'meleeAtk' | 'rangedAtk'>['document'][]
  getItemAttacks(options = { attackType: 'both' }): ConfiguredItem<'meleeAtk' | 'rangedAtk'>['document'][] {
    if (!(this.system instanceof CommonItemData)) return []

    const attacks =
      this.actor?.items.filter(
        item => (item.system as CommonItemData).component.parentuuid === (this.system as CommonItemData).component.uuid
      ) ?? []
    switch (options.attackType) {
      case 'melee':
        return attacks.filter(item => item.isOfType('meleeAtk'))
      case 'ranged':
        return attacks.filter(item => item.isOfType('rangedAtk'))
      case 'both':
        return attacks.filter(item => item.isOfType('meleeAtk', 'rangedAtk'))
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
