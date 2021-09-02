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
}
