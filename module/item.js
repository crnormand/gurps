export class GurpsItem extends Item {
  /**
   * @param {Item} item
   * @returns {GurpsItem}
   */
  static asGurpsItem(item) {
    return /** @type {GurpsItem} */ (item)
  }

  prepareData() {
    super.prepareData()
  }

  async internalUpdate(data, context) {
    let ctx = { render: !this.ignoreRender }
    if (!!context) ctx = { ...context, ...ctx }
    await this.update(data, ctx)
  }

  /**
   * Find Actor Component Key for this Item Type
   *
   * @returns {string} actor.system.<key>
   */
  get actorComponentKey() {
    const keys = {
      equipment: 'equipment',
      feature: 'ads',
      skill: 'skills',
      spell: 'spells',
    }
    const sysKey = keys[this.type]
    if (!sysKey) throw new Error(`No actor system key found for ${this.type}`)
    return sysKey
  }

  /**
   * Find Item System Key for this Item Type
   *
   * @return {string} item.system.<key>
   */
  get itemSysKey() {
    const keys = {
      equipment: 'eqt',
      feature: 'fea',
      skill: 'ski',
      spell: 'spl',
    }
    const sysKey = keys[this.type]
    if (!sysKey) throw new Error(`No item system key found for ${this.type}`)
    return sysKey
  }

  /**
   * Backup Item's data in Actor Component
   *
   * @return {object}
   */
  getItemInfo() {
    let data = foundry.utils.duplicate(this)
    let itemSystem = data.system
    return {
      id: this._id,
      img: this.img,
      system: itemSystem,
    }
  }
}
