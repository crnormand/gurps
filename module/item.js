export class GurpsItem extends Item {
  /**
   * @param {Item} item
   * @returns {GurpsItem}
   */
  static asGurpsItem(item) {
    return /** @type {GurpsItem} */ (item)
  }

  async internalUpdate(data, context) {
    let ctx = { render: true }
    if (!!context) ctx = { ...context, ...ctx }
    await this.update(data, ctx)
  }

  prepareData() {
    super.prepareData()
  }

  async internalUpdate(data, context) {
    let ctx = { render: !this.ignoreRender }
    if (!!context) ctx = { ...context, ...ctx }
    await this.update(data, ctx)
  }
}
