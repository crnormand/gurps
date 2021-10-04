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

  /**
   * @returns {GurpsItemData}
   */
  getGurpsItemData() {
    return /** @type {GurpsItemData} */ (this.data.data)
  }

  async internalUpdate(data, context) {
    let ctx = { render: !this.ignoreRender }
    if (!!context) ctx = { ...context, ...ctx }
    await this.update(data, ctx)
  }
}
