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
   * @returns {import("./global-references").GurpsItemData}
   */
  getGurpsItemData() {
    return /** @type {import("./global-references").GurpsItemData} */ (this.data.data)
  }
}
