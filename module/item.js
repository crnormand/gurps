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

  /*
   * Get Item's exclusive data not found in Equipment
   *
   * @returns {object}
   */
  getItemInfo() {
    let data = foundry.utils.duplicate(this)
    let itemSystem = data.system
    delete itemSystem.eqt
    return {
      id: this._id,
      img: this.img,
      system: itemSystem,
    }
  }
}
