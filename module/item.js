import { recurselist } from '../lib/utilities.js'
import { parselink } from '../lib/parselink.js'

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
   * Return Item Attacks from melee and ranged Actor Components
   *
   * This is intended for external libraries like Argon Combat HUD,
   * but can be used anytime you have only the Item UUID and need
   * to know if this Item has any Melee or Ranged attacks registered
   * on Actor System.
   *
   * Because GCA import did not populate the `uuid` field on these Actor Components
   * we need to compare the Item original name for both Item and Component.
   *
   * @param getAttOptions
   * @returns {*[]|boolean}
   */
  getItemAttacks(getAttOptions = {}) {
    const { attackType = 'both', checkOnly = false } = getAttOptions
    const originalName = this.system[this.itemSysKey].originalName
    const currentName = this.system[this.itemSysKey].name
    const actorComponentUUID = this.system[this.itemSysKey].uuid
    // Look at Melee and Ranged attacks in actor.system
    let attacks = []
    let attackTypes = ['melee', 'ranged']
    if (attackType !== 'both') attackTypes = [attackType]
    for (let at of attackTypes) {
      recurselist(this.actor.system[at], (e, _k, _d) => {
        let key = undefined
        if (!!actorComponentUUID && e.uuid === actorComponentUUID) {
          key = this.actor._findSysKeyForId('uuid', e.uuid, at)
        } else if (!!originalName && e.originalName === originalName) {
          key = this.actor._findSysKeyForId('originalName', e.originalName, at)
        } else if (!!currentName && e.name === currentName) {
          key = this.actor._findSysKeyForId('name', e.name, at)
        } else if (this.id === e.fromItem) {
          key = this.actor._findSysKeyForId('fromItem', e.fromItem, at)
        }
        if (!!key) {
          attacks.push({
            component: e,
            key,
          })
        }
      })
    }
    if (!!checkOnly) return !!attacks.length > 0
    return attacks
  }

  get hasAttacks() {
    return !!this.getItemAttacks({ checkOnly: true })
  }

  getItemOTFs(checkOnly = false) {
    const { notes } = this.system[this.itemSysKey]
    const action = parselink(notes || '')
    if (!!checkOnly) return !!action.text
    return action
  }

  get hasOTFs() {
    !!this.getItemOTFs(true)
  }

  async toogleEquip(equipped) {
    if (this.type !== 'equipment' || !this.system.carried || this.system.equipped === equipped) return

    const key = this.actor._findEqtkeyForId('itemid', this._id)
    let eqt = foundry.utils.duplicate(GURPS.decode(this.actor, key))
    if (eqt) {
      eqt.equipped = !eqt.equipped
      await this.actor.updateItemAdditionsBasedOn(eqt, key)
      await this.actor.internalUpdate({ [key]: eqt })
    }
    this.system.equipped = eqt.equipped
    this.system.eqt.equipped = eqt.equipped
    await this.actor._updateItemFromForm(this)

    console.log(`Change Equipment ${this.name} equipped status to ${equipped}`)
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
      meleeAtk: 'melee',
      rangedAtk: 'ranged',
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
      meleeAtk: 'mel',
      rangedAtk: 'rng',
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
      name: this.name,
      system: itemSystem,
    }
  }

  /**
   * Filter Available Items by Type
   *
   * We need to filter MeleeAtk and RangedAtk from the list of Items
   * because they are subtypes of the other types.
   *
   * @returns {string[]}
   * @constructor
   */
  static get TYPES() {
    return Object.keys(game.model[this.metadata.name]).filter(k => !k.includes('Atk'))
  }
}
