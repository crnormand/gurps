/**
 * The point of this file is that these classes may be used outside of the Actor, but do not have
 * any dependencies on Actor.
 *
 * If that changes -- if any class is modified or added that has an external dependency -- we need
 * to think really hard about potentially moving the class back to actor.js.
 */

import { arraysEqual, compareColleges, convertRollStringToArrayOfInt, extractP } from '../../lib/utilities.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { simpleHash } from '../../lib/simple-hash.js'

/**
 * ### Base Actor Component
 *
 * Originally, these entities are where Actor stores the GURPS data.
 *
 * But naming is hard, and let's try to make it easier to understand,
 * especially now, when we will store these data not only on these components
 * but also on new Foundry Items besides the original `Equipment` actor/item.
 *
 * The biggest trap at this point is the naming of GURPS Traits. In GURPS, **Traits**
 * are the Advantages, Disadvantages, Quirks and Perks. And **Attributes**
 * are the player attributes (ST, DX, IQ, HT, dodge, etc.).
 *
 * But on GGA, all Traits are stored inside actor in the _ads_ key. And the
 * attributes are scattered in many keys inside the actor, especially
 * _attributes_ and... _traits_ :)
 *
 * So, let's try to name things:
 *
 * | GURPS terms | actor.system.<key>         | Actor Component             | Foundry Item Type | item.system.<key> |
 * |-------------|----------------------------|-----------------------------|-------------------|-------------------|
 * | Inventory   | equipment                  | Equipment                   | equipment         | eqt               |
 * | Attributes  | attributes, traits, etc.   | Encumbrance, Reaction, etc. | --                | --                |
 * | Traits      | ads                        | Advantage                   | feature           | fea               |
 * | Skills      | skills                     | Skill                       | skill             | ski               |
 * | Spells      | spells                     | Spell                       | spell             | spl               |
 * | Melee Att.  | melee                      | Melee                       | meleeAtk          | mel               |
 * | Ranged Att. | ranged                     | Ranged                      | rangedAttack      | rng               |
 *
 *
 */
export class _Base {
  constructor() {
    this.notes = ''
    this.pageref = ''
    this.contains = {}
    this.uuid = ''
    this.parentuuid = ''
    this.originalName = ''
  }

  /**
   * @param {string} r
   */
  pageRef(r) {
    this.pageref = r
    if (!!r && r.match(/https?:\/\//i)) {
      this.pageref = '*Link'
      this.externallink = r
    }
  }

  // This is an ugly hack to parse the GCS FG Formatted Text entries. See the method cleanUpP() above.
  /**
   * @param {string} n
   */
  setNotes(n) {
    if (!!n) {
      let v = extractP(n)
      let k = 'Page Ref: '
      let i = v.indexOf(k)
      if (i >= 0) {
        this.notes = v.substr(0, i).trim()
        // Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
        this.pageRef(v.substr(i + k.length).trim())
      } else {
        this.notes = v.trim()
        this.pageref = ''
      }
    }
  }
  static _checkComponentInActor(actor, actorComp) {
    // This actor component already exists in Actor?
    const existingComponentKey =
      actorComp instanceof Equipment
        ? actor._findEqtkeyForId('uuid', actorComp.uuid)
        : actor._findSysKeyForId('uuid', actorComp.uuid, this.actorSystemKey)
    if (!!existingComponentKey) {
      const existingComponentItem = actor.items.get(actorComp.itemid)
      if (!!existingComponentItem) {
        if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
          actorComp.itemid = existingComponentItem.itemid || ''
        }
        actorComp.itemInfo = actorComp.itemInfo || !!existingComponentItem ? existingComponentItem.getItemInfo() : {}
      } else {
        actorComp.itemid = ''
        actorComp.itemInfo = {}
      }
    }
    return actorComp
  }
}

export class Named extends _Base {
  /**
   * @param {string} [n1]
   */
  constructor(n1) {
    super()
    this.setName(n1)
  }

  setName(n) {
    if (!!n) {
      let k = 'Page Ref: '
      let i = n.indexOf(k)
      if (i >= 0) {
        this.name = n.substr(0, i).trim()
        // Find the "Page Ref" and store it separately (to hopefully someday be used with PDF Foundry)
        this.pageRef(n.substr(i + k.length).trim())
      } else {
        this.name = n.trim()
        this.pageref = ''
      }
    }
  }

  /**
   * Retrieves the default image path for item.
   *
   * @return {string} The path to the default image.
   */
  findDefaultImage() {
    let item
    if (!!this.itemid) {
      item = game.items.get(this.itemid)
      if (!!item?.system.globalid) {
        item = game.items.get(item.system.globalid.split('.').pop())
      }
    }
    return item?.img
  }

  /**
   * Generates a unique GGA identifier based on the given system object properties.
   *
   * @param {Object} objProps - The properties of the object used for generating the unique ID.
   * @param {string} objProps.name - The name of the System Object.
   * @param {string} objProps.type - The system.<type> of the System Object: equipment, ads, etc.
   * @param {string} objProps.generator - The generator of the item: GCS or GCA.
   * @return {string} The generated unique GGA identifier.
   */
  _getGGAId(objProps) {
    let uniqueId
    if (!!this.uuid) {
      // UUID from GCS/GCA
      uniqueId = this.uuid
    }
    if (!!this.save && !uniqueId) {
      // User created System Object
      uniqueId = `GGA${foundry.utils.randomID(13)}`
    }
    if (!uniqueId) {
      // System Object imported from GCS/GCA without a UUID
      const { name, type, generator } = objProps
      const hashKey = `${name}${type}${generator}`
      uniqueId = simpleHash(hashKey)
    }
    return uniqueId
  }

  /**
   * Get Actor Component System Key.
   *
   * One of the **trickiest** parts of this project.
   * Remember, actor component has a different key than his item.
   *
   * Examples:
   * actor.system.equipment <-> item.system.eqt
   * actor.system.ads <-> item.system.fea
   *
   * @return {string} the actor.system.<key> for the item class
   */
  static get actorSystemKey() {
    throw new Error('Not implemented')
  }

  /**
   * Converts Actor Component data into Foundry Item Data.
   *
   * @param {string} fromProgram - The Generator, CGA or GCS.
   * @param {Actor} actor - The actor to use.
   * @return {*} The converted item data.
   */
  toItemData(actor, fromProgram = '') {
    throw new Error('Not implemented')
  }

  /**
   * Converts Received Data into Actor Component.
   *
   * The Object.assign is a very simple implementation
   * To make sure we are not missing any property, we should
   * implement a more robust method on each class.
   *
   * @param {object} data - The data to convert (from form, item data, drag info, etc.).
   * @param {Actor} actor - The actor to use.
   */
  static fromObject(data, actor) {
    // Just an example. Make sure you make a more robust method in the subclass.
    let actorComp = new this(data.name)
    Object.assign(actorComp, data)
    return this._checkComponentInActor(actor, actorComp)
  }

  /**
   * Checks if the given item needs an update.
   *
   * Another trickier part, because payloads from GCA and GCS uses different
   * formats for the same fields.
   *
   * Some examples: spell `college`, skill `import` and `level` etc.
   *
   * This must be implemented on each subclass.
   *
   * @param {Object} item - The item to check for an update.
   * @return {boolean} - Returns true if the item needs an update, otherwise false.
   */
  _itemNeedsUpdate(item) {
    throw new Error('Not implemented')
  }

  /**
   * Populate saved Item info stored on Actor.
   *
   * This actor.system.itemInfo is populated only if you
   * disable the `Import Player data as Foundry Items` and
   * import the actor again. The idea is to maintain on these data
   * any changes the Item have which the Actor Component does not
   * handle, like item image and OTF formulas.
   *
   * @param {Actor} actor
   * @returns {*}
   */
  findSavedItemInfo(actor) {
    const actorItemInfo = actor.system.backupItemInfo
    const importId = this.uuid
    const originalName = this.originalName
    if (!!actorItemInfo) {
      this.itemInfo = actorItemInfo[importId] || actorItemInfo[originalName]
    }
  }
}

export class NamedCost extends Named {
  /**
   * @param {string} [n1]
   */
  constructor(n1) {
    super(n1)
    this.points = 0
    this.save = false
    this.itemid = ''
    this.itemInfo = {}
    this.fromItem = ''
  }
}

const _AnimationMixin = {
  _otf: '',
  _checkotf: '',
  _duringotf: '',
  _passotf: '',
  _failotf: '',

  get otf() {
    return this._otf
  },
  set otf(value) {
    this._otf = value
  },
  get checkotf() {
    return this._checkotf
  },
  set checkotf(value) {
    this._checkotf = value
  },

  get duringotf() {
    return this._duringotf
  },
  set duringotf(value) {
    this._duringotf = value
  },

  get passotf() {
    return this._passotf
  },
  set passotf(value) {
    this._passotf = value
  },

  get failotf() {
    return this._failotf
  },
  set failotf(value) {
    this._failotf = value
  },
}

export class Leveled extends NamedCost {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   */
  constructor(n1, lvl) {
    super(n1)

    this.import = lvl

    /** @type {string|number} */
    this.level = 0

    Object.assign(Leveled.prototype, _AnimationMixin)
  }

  get animationData() {
    return /** @type {_AnimationMixin} */ (/** @type {unknown} */ (this))
  }
}

export class Skill extends Leveled {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   */
  constructor(n1, lvl) {
    super(n1, lvl)
    this.type = '' // "DX/E";
    this.relativelevel = '' // "DX+1";
  }

  static get actorSystemKey() {
    return 'skills'
  }

  toItemData(actor, fromProgram = '') {
    this.findSavedItemInfo(actor)
    const system = this.itemInfo?.system || {}
    const uniqueId = this._getGGAId({ name: this.name, type: 'skill', generator: fromProgram })
    const importId = !this.save ? uniqueId : ''
    const importFrom = this.importFrom || fromProgram
    return {
      name: this.itemInfo?.name || this.name,
      img: this.itemInfo?.img || this.findDefaultImage(),
      type: 'skill',
      system: {
        ski: {
          notes: this.notes || system.notes || '',
          pageref: this.pageref || '',
          contains: this.contains || {},
          uuid: uniqueId,
          parentuuid: this.parentuuid || '',
          points: this.points || 0,
          ['import']: this['import'] || '',
          level: this.level || 0,
          relativelevel: this.relativelevel || '',
          name: this.name,
          originalName: this.originalName || '',
          ['type']: this['type'] || '',
          otf: this.otf || '',
          checkotf: this.checkotf || '',
          duringotf: this.duringotf || '',
          passotf: this.passotf || '',
          failotf: this.failotf || '',
        },
        ads: this.ads || system.ads || {},
        skills: this.skills || system.skills || {},
        spells: this.spells || system.spells || {},
        melee: this.melee || system.melee || {},
        ranged: this.ranged || system.ranged || {},
        bonuses: this.bonuses || system.bonuses || '',
        globalid: system.globalid || '',
        importid: importId,
        importFrom: importFrom,
        fromItem: this.fromItem || '',
      },
    }
  }
  static fromObject(data, actor) {
    let skill
    if (data instanceof Skill) {
      skill = data
    } else {
      skill = new Skill(data.name)
      skill.originalName = data.originalName || ''
      skill.notes = data.notes
      skill.contains = data.contains || {}
      skill.uuid = data.uuid
      skill.parentuuid = data.parentuuid
      skill.points = data.points
      skill['import'] = data['import']
      skill.level = data.level
      skill.relativelevel = data.relativelevel
      skill['type'] = data['type']
    }
    return this._checkComponentInActor(actor, skill)
  }
  _itemNeedsUpdate(item) {
    let result = false
    if (!item) {
      result = true
      console.log(`Foundry Item: ${this.name} does not exist`)
    } else {
      const itemData = item.system[item.itemSysKey]
      result =
        itemData.originalName !== this.originalName ||
        itemData.notes !== this.notes ||
        itemData.pageref !== this.pageref ||
        !arraysEqual(Object.keys(itemData.contains), Object.keys(this.contains)) ||
        itemData.points !== this.points ||
        itemData.import !== this['import'] ||
        itemData.relativelevel !== this.relativelevel ||
        itemData['type'] !== this['type']
      if (!!result) console.log(`Foundry Item: ${this.name} needs update`)
    }
    return result
  }
  findDefaultImage() {
    return super.findDefaultImage() || 'icons/svg/dice-target.svg'
  }
}

export class Spell extends Leveled {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   */
  constructor(n1, lvl) {
    super(n1, lvl)
    this.class = ''
    this.college = ''
    this.cost = ''
    this.maintain = ''
    this.duration = ''
    this.resist = ''
    this.casttime = ''
    this.difficulty = ''
    this.relativelevel = '' // "IQ+1"
  }
  static get actorSystemKey() {
    return 'spells'
  }
  toItemData(actor, fromProgram = '') {
    this.findSavedItemInfo(actor)
    const system = this.itemInfo?.system || {}
    const uniqueId = this._getGGAId({ name: this.name, type: 'spell', generator: fromProgram })
    const importId = !this.save ? uniqueId : ''
    const importFrom = this.importFrom || fromProgram
    return {
      name: this.itemInfo?.name || this.name,
      img: this.itemInfo?.img || this.findDefaultImage(),
      type: 'spell',
      system: {
        spl: {
          notes: this.notes || system.notes || '',
          pageref: this.pageref || '',
          contains: this.contains || {},
          uuid: uniqueId,
          parentuuid: this.parentuuid || '',
          points: this.points || 0,
          ['import']: this['import'] || '',
          level: this.level || 0,
          relativelevel: this.relativelevel || '',
          name: this.name,
          originalName: this.originalName || '',
          ['class']: this['class'] || '',
          college: this.college || '',
          cost: this.cost || '',
          maintain: this.maintain || '',
          duration: this.duration || '',
          resist: this.resist || '',
          casttime: this.casttime || '',
          difficulty: this.difficulty || '',
          otf: this.otf || '',
          checkotf: this.checkotf || '',
          duringotf: this.duringotf || '',
          passotf: this.passotf || '',
          failotf: this.failotf || '',
        },
        ads: this.ads || system.ads || {},
        skills: this.skills || system.skills || {},
        spells: this.spells || system.spells || {},
        melee: this.melee || system.melee || {},
        ranged: this.ranged || system.ranged || {},
        bonuses: this.bonuses || system.bonuses || '',
        globalid: system.globalid || '',
        importid: importId,
        importFrom: importFrom,
        fromItem: this.fromItem || '',
      },
    }
  }
  static fromObject(data, actor) {
    let spell
    if (data instanceof Spell) {
      spell = data
    } else {
      spell = new Spell(data.name)
      spell.originalName = data.originalName || ''
      spell.notes = data.notes
      spell.pageref = data.pageref
      spell.contains = data.contains || {}
      spell.uuid = data.uuid
      spell.parentuuid = data.parentuuid
      spell.points = data.points
      spell['import'] = data['import'] || ''
      spell.level = data.level
      spell.relativelevel = data.relativelevel
      spell['class'] = data['class']
      spell.college = data.college
      spell.cost = data.cost
      spell.maintain = data.maintain
      spell.duration = data.duration
      spell.resist = data.resist
      spell.casttime = data.casttime
      spell.difficulty = data.difficulty
    }
    return this._checkComponentInActor(actor, spell)
  }

  _itemNeedsUpdate(item) {
    let result = false
    if (!item) {
      result = true
      console.log(`Foundry Item: ${this.name} does not exist`)
    } else {
      const itemData = item.system[item.itemSysKey]
      result =
        itemData.originalName !== this.originalName ||
        itemData.notes !== this.notes ||
        itemData.pageref !== this.pageref ||
        !arraysEqual(Object.keys(itemData.contains), Object.keys(this.contains)) ||
        itemData.points !== this.points ||
        parseInt(itemData['import'] || 0) !== parseInt(this['import'] || 0) ||
        itemData.level !== this.level ||
        itemData.relativelevel !== this.relativelevel ||
        itemData.class !== this.class ||
        !compareColleges(itemData['college'], this['college']) ||
        itemData.cost !== this.cost ||
        itemData.maintain !== this.maintain ||
        itemData.duration !== this.duration ||
        itemData.resist !== this.resist ||
        itemData.casttime !== this.casttime ||
        itemData.difficulty !== this.difficulty
      if (!!result) console.log(`Foundry Item: ${this.name} needs update`)
    }
    return result
  }
  findDefaultImage() {
    return super.findDefaultImage() || 'icons/svg/daze.svg'
  }
}

export class Advantage extends NamedCost {
  /**
   * @param {string} [n1]
   */
  constructor(n1) {
    super(n1)
    this.userdesc = ''
    this.note = '' // GCS has notes (note) and userdesc for an advantage, so the import code combines note and userdesc into notes
  }

  static get actorSystemKey() {
    return 'ads'
  }

  /**
   * Create new Feature payload using Advantage's data.
   */
  toItemData(actor, fromProgram = '') {
    this.findSavedItemInfo(actor)
    const system = this.itemInfo?.system || {}
    const uniqueId = this._getGGAId({ name: this.name, type: 'feature', generator: fromProgram })
    const importId = !this.save ? uniqueId : ''
    const importFrom = this.importFrom || fromProgram
    return {
      name: this.itemInfo?.name || this.name,
      img: this.itemInfo?.img || this.findDefaultImage(),
      type: 'feature',
      system: {
        fea: {
          notes: this.notes || system.notes || '',
          pageref: this.pageref || '',
          contains: this.contains || {},
          uuid: uniqueId,
          parentuuid: this.parentuuid || '',
          points: this.points || 0,
          userdesc: this.userdesc || '',
          note: this.note || '',
          name: this.name,
          originalName: this.originalName || '',
          checkotf: this.checkotf || '',
          duringotf: this.duringotf || '',
          passotf: this.passotf || '',
          failotf: this.failotf || '',
        },
        ads: this.ads || system.ads || {},
        skills: this.skills || system.skills || {},
        spells: this.spells || system.spells || {},
        melee: this.melee || system.melee || {},
        ranged: this.ranged || system.ranged || {},
        bonuses: this.bonuses || system.bonuses || '',
        globalid: system.globalid || '',
        importid: importId,
        importFrom: importFrom,
        fromItem: this.fromItem || '',
      },
    }
  }
  static fromObject(data, actor) {
    let adv
    if (data instanceof Advantage) {
      adv = data
    } else {
      adv = new Advantage(data.name)
      adv.originalName = data.originalName || ''
      adv.notes = data.notes
      adv.pageref = data.pageref
      adv.contains = data.contains || {}
      adv.uuid = data.uuid
      adv.parentuuid = data.parentuuid
      adv.points = data.points
      adv.userdesc = data.userdesc
      adv.note = data.note
    }
    return this._checkComponentInActor(actor, adv)
  }
  _itemNeedsUpdate(item) {
    let result = false
    if (!item) {
      result = true
      console.log(`Foundry Item: ${this.name} does not exist`)
    } else {
      const itemData = item.system[item.itemSysKey]
      result =
        itemData.originalName !== this.originalName ||
        itemData.notes !== this.notes ||
        (itemData.pageref || '') !== (this.pageref || '') ||
        !arraysEqual(Object.keys(itemData.contains), Object.keys(this.contains)) ||
        itemData.points !== this.points ||
        (itemData.userdesc || '') !== (this.userdesc || '') ||
        itemData.note !== this.note
      if (!!result) console.log(`Foundry Item: ${this.name} needs update`)
    }
    return result
  }
  findDefaultImage() {
    return super.findDefaultImage() || 'icons/svg/book.svg'
  }
}

export class Attack extends Named {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   * @param {string|Array<string>} [dmg]
   */
  constructor(n1, lvl, dmg) {
    super(n1)
    this.import = lvl
    this.damage = dmg
    this.st = ''
    this.mode = ''
    this.level = ''

    Object.assign(Leveled.prototype, _AnimationMixin)
  }

  get animationData() {
    return /** @type {_AnimationMixin} */ (/** @type {unknown} */ (this))
  }
}

export class Melee extends Attack {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   * @param {string} [dmg]
   */
  constructor(n1, lvl, dmg) {
    super(n1, lvl, dmg)

    this.weight = ''
    this.techlevel = ''
    this.cost = ''
    this.reach = ''
    this.parry = ''
    this.block = ''
  }
  static fromObject(data, actor) {
    let melee
    if (data instanceof Melee) {
      melee = data
    } else {
      melee = new Melee(data.name, data.import, data.damage)
      melee.originalName = data.originalName || ''
      melee.notes = data.notes
      melee.pageref = data.pageref
      melee.contains = data.contains || {}
      melee.uuid = data.uuid
      melee.parentuuid = data.parentuuid
      melee['import'] = data['import']
      melee.damage = data.damage
      melee.st = data.st
      melee.mode = data.mode
      melee.level = data.level
      melee.weight = data.weight
      melee.techlevel = data.techlevel
      melee.cost = data.cost
      melee.reach = data.reach
      melee.parry = data.parry
      melee.block = data.block
    }
    return this._checkComponentInActor(actor, melee)
  }
  static get actorSystemKey() {
    return 'melee'
  }
  _itemNeedsUpdate(item) {
    return !item
  }
  toItemData(actor, fromProgram = '') {
    this.findSavedItemInfo(actor)
    const system = this.itemInfo?.system || {}
    const uniqueId = this._getGGAId({ name: this.name, type: 'melee', generator: fromProgram })
    const importId = !this.save ? uniqueId : ''
    const importFrom = this.importFrom || fromProgram
    return {
      name: this.itemInfo?.name || this.name,
      img: this.itemInfo?.img || this.findDefaultImage(),
      type: 'meleeAtk',
      system: {
        mel: {
          notes: this.notes || system.notes || '',
          pageref: this.pageref || '',
          contains: this.contains || {},
          uuid: uniqueId,
          parentuuid: this.parentuuid || '',
          points: this.points || 0,
          ['import']: this['import'] || '',
          level: this.level || 0,
          weight: this.weight || '',
          techlevel: this.techlevel || '',
          cost: this.cost || '',
          reach: this.reach || '',
          parry: this.parry || '',
          block: this.block || '',
          name: this.name,
          originalName: this.originalName || '',
          st: this.st || '',
          mode: this.mode || '',
          otf: this.otf || '',
          checkotf: this.checkotf || '',
          duringotf: this.duringotf || '',
          passotf: this.passotf || '',
          failotf: this.failotf || '',
        },
        ads: this.ads || system.ads || {},
        skills: this.skills || system.skills || {},
        spells: this.spells || system.spells || {},
        melee: this.melee || system.melee || {},
        ranged: this.ranged || system.ranged || {},
        bonuses: this.bonuses || system.bonuses || '',
        globalid: system.globalid || '',
        importid: importId,
        importFrom: importFrom,
        fromItem: this.fromItem || '',
      },
    }
  }
}

export class Ranged extends Attack {
  /**
   * @param {string} [n1]
   * @param {string} [lvl]
   * @param {string} [dmg]
   */
  constructor(n1, lvl, dmg) {
    super(n1, lvl, dmg)

    this.bulk = ''
    this.legalityclass = ''
    this.ammo = ''
    this.acc = ''
    this.range = ''
    this.rof = ''
    this.shots = ''
    this.rcl = ''
    this.halfd = ''
    this.max = ''
  }
  checkRange() {
    if (!!this.halfd) this.range = this.halfd
    if (!!this.max) this.range = this.max
    if (!!this.halfd && !!this.max) this.range = this.halfd + '/' + this.max
  }
  static fromObject(data, actor) {
    let ranged
    if (data instanceof Ranged) {
      ranged = data
    } else {
      ranged = new Ranged(data.name, data.import, data.damage)
      ranged.originalName = data.originalName || ''
      ranged.notes = data.notes
      ranged.pageref = data.pageref
      ranged.contains = data.contains || {}
      ranged.uuid = data.uuid
      ranged.parentuuid = data.parentuuid
      ranged['import'] = data['import']
      ranged.damage = data.damage
      ranged.st = data.st
      ranged.mode = data.mode
      ranged.level = data.level
      ranged.bulk = data.bulk
      ranged.legalityclass = data.legalityclass
      ranged.ammo = data.ammo
      ranged.acc = data.acc
      ranged.range = data.range
      ranged.rof = data.rof
      ranged.shots = data.shots
      ranged.rcl = data.rcl
      ranged.halfd = data.halfd
      ranged.max = data.max
    }
    return this._checkComponentInActor(actor, ranged)
  }
  static get actorSystemKey() {
    return 'ranged'
  }
  _itemNeedsUpdate(item) {
    return !item
  }
  toItemData(actor, fromProgram = '') {
    this.findSavedItemInfo(actor)
    const system = this.itemInfo?.system || {}
    const uniqueId = this._getGGAId({ name: this.name, type: 'ranged', generator: fromProgram })
    const importId = !this.save ? uniqueId : ''
    const importFrom = this.importFrom || fromProgram
    return {
      name: this.itemInfo?.name || this.name,
      img: this.itemInfo?.img || this.findDefaultImage(),
      type: 'rangedAtk',
      system: {
        rng: {
          notes: this.notes || system.notes || '',
          pageref: this.pageref || '',
          contains: this.contains || {},
          uuid: uniqueId,
          parentuuid: this.parentuuid || '',
          points: this.points || 0,
          ['import']: this['import'] || '',
          level: this.level || 0,
          bulk: this.bulk || '',
          legalityclass: this.legalityclass || '',
          ammo: this.ammo || '',
          acc: this.acc || '',
          range: this.range || '',
          rof: this.rof || '',
          shots: this.shots || '',
          rcl: this.rcl || '',
          halfd: this.halfd || '',
          max: this.max || '',
          name: this.name,
          originalName: this.originalName || '',
          st: this.st || '',
          mode: this.mode || '',
          otf: this.otf || '',
          checkotf: this.checkotf || '',
          duringotf: this.duringotf || '',
          passotf: this.passotf || '',
          failotf: this.failotf || '',
        },
        ads: this.ads || system.ads || {},
        skills: this.skills || system.skills || {},
        spells: this.spells || system.spells || {},
        melee: this.melee || system.melee || {},
        ranged: this.ranged || system.ranged || {},
        bonuses: this.bonuses || system.bonuses || '',
        globalid: system.globalid || '',
        importid: importId,
        importFrom: importFrom,
        fromItem: this.fromItem || '',
      },
    }
  }
}

export class Note extends _Base {
  /**
   * @param {string} [n]
   * @param {boolean} [ue]
   */
  constructor(n, ue) {
    super()

    this.notes = n || ''
    this.save = ue
  }
}

export class Encumbrance {
  constructor() {
    this.key = ''
    this.level = 0
    this.dodge = 9
    this.weight = ''
    this.move = 0
    this.current = false
  }
}

export class Equipment extends Named {
  /**
   * @param {string} [nm]
   * @param {boolean} [ue]
   */
  constructor(nm, ue) {
    super(nm)
    this.save = ue
    this.equipped = false
    this.carried = false
    this.count = 0
    this.cost = 0
    this.weight = 0
    this.location = ''
    this.techlevel = ''
    this.legalityclass = ''
    this.categories = ''
    this.costsum = 0
    this.weightsum = 0
    this.uses = ''
    this.maxuses = ''
    this.ignoreImportQty = false
    this.uuid = ''
    this.parentuuid = ''
    this.itemid = ''
    /** @type {{ [key: string]: any }} */
    this.collapsed = {}
    /** @type {{ [key: string]: any }} */
    this.contains = {}
    this.itemInfo = {}
  }

  /**
   * @param {Equipment} eqt
   */
  static async calc(eqt) {
    await Equipment.calcUpdate(null, eqt, '')
  }

  // OMG, do NOT fuck around with this method.   So many gotchas...
  // the worst being that you cannot use array.forEach.   You must use a for loop
  /**
   * @param {Actor | null} actor
   * @param {Equipment} eqt
   * @param {string} objkey
   */
  static async calcUpdate(actor, eqt, objkey) {
    if (!eqt) return
    const num = (/** @type {string | number} */ s) => {
      // @ts-ignore
      return isNaN(s) ? 0 : Number(s)
    }
    const cln = (/** @type {number} */ s) => {
      return !s ? 0 : num(String(s).replace(/,/g, ''))
    }

    eqt.count = cln(eqt.count)
    eqt.cost = cln(eqt.cost)
    eqt.weight = cln(eqt.weight)
    let cs = eqt.count * eqt.cost
    let ws = eqt.count * eqt.weight
    if (!!eqt.contains) {
      for (let k in eqt.contains) {
        // @ts-ignore
        let e = eqt.contains[k]
        await Equipment.calcUpdate(actor, e, objkey + '.contains.' + k)
        cs += e.costsum
        ws += e.weightsum
      }
    }
    if (!!eqt.collapsed) {
      for (let k in eqt.collapsed) {
        // @ts-ignore
        let e = eqt.collapsed[k]
        await Equipment.calcUpdate(actor, e, objkey + '.collapsed.' + k)
        cs += e.costsum
        ws += e.weightsum
      }
    }
    if (!!actor)
      await actor.update({
        [objkey + '.costsum']: cs,
        [objkey + '.weightsum']: ws,
      })
    // the local values 'should' be updated... but I need to force them anyway
    eqt.costsum = cs
    eqt.weightsum = ws
  }

  /**
   * Create new GURPSItem payload using Equipment's data
   */
  toItemData(actor, fromProgram = '') {
    this.findSavedItemInfo(actor)
    const timestamp = new Date()
    const system = this.itemInfo?.system || {}
    const uniqueId = this._getGGAId({ name: this.name, type: 'equipment', generator: fromProgram })
    const importId = !this.save ? uniqueId : ''
    const importFrom = this.importFrom || fromProgram
    return {
      name: this.itemInfo?.name || this.name,
      img: this.itemInfo?.img || this.findDefaultImage(),
      type: 'equipment',
      system: {
        eqt: {
          name: this.name,
          originalName: this.originalName || '',
          notes: this.notes || system.notes || '',
          pageref: this.pageref,
          count: this.count,
          cost: this.cost,
          weight: this.weight,
          carried: this.carried,
          equipped: this.equipped,
          techlevel: this.techlevel,
          categories: this.categories,
          legalityclass: this.legalityclass,
          costsum: this.costsum,
          uses: this.uses,
          maxuses: this.maxuses,
          last_import: timestamp,
          uuid: uniqueId,
          location: this.location,
          parentuuid: this.parentuuid,
        },
        ads: this.ads || system.ads || {},
        skills: this.skills || system.skills || {},
        spells: this.spells || system.spells || {},
        melee: this.melee || system.melee || {},
        ranged: this.ranged || system.ranged || {},
        bonuses: this.bonuses || system.bonuses || '',
        equipped: this.equipped,
        carried: this.carried,
        globalid: system.globalid || '',
        importid: importId,
        importFrom: importFrom,
        fromItem: this.fromItem || '',
      },
    }
  }

  static fromObject(data, actor) {
    let equip
    if (data instanceof Equipment) {
      equip = data
    } else {
      equip = new Equipment(data.name, data.save)
      equip.originalName = data.originalName || ''
      equip.count = data.count
      equip.cost = data.cost
      equip.weight = data.weight
      equip.carried = data.carried
      equip.equipped = data.equipped
      equip.techlevel = data.techlevel
      equip.categories = data.categories
      equip.legalityclass = data.legalityclass
      equip.costsum = data.costsum
      equip.uses = data.uses
      equip.maxuses = data.maxuses
      equip.uuid = data.uuid
      equip.parentuuid = data.parentuuid
      equip.location = data.location
      equip.notes = data.notes
      equip.pageref = data.pageref
      equip.ignoreImportQty = data.ignoreImportQty
      equip.contains = data.contains || {}
    }
    return this._checkComponentInActor(actor, equip)
  }
  _itemNeedsUpdate(item) {
    let result = false
    if (!item) {
      result = true
      console.log(`Foundry Item: ${this.name} does not exist`)
    } else {
      const itemData = item.system[item.itemSysKey]
      result =
        itemData.originalName !== this.originalName ||
        itemData.notes !== this.notes ||
        itemData.pageref !== this.pageref ||
        itemData.cost !== this.cost ||
        itemData.weight !== this.weight ||
        itemData.techlevel !== this.techlevel ||
        itemData.categories !== this.categories ||
        itemData.legalityclass !== this.legalityclass ||
        itemData.costsum !== this.costsum ||
        itemData.maxuses !== this.maxuses ||
        itemData.uuid !== this.uuid ||
        itemData.parentuuid !== this.parentuuid ||
        itemData.location !== this.location
      if (!!result) console.log(`Foundry Item: ${this.name} needs update`)
    }
    return result
  }
  findDefaultImage() {
    return super.findDefaultImage() || 'icons/svg/item-bag.svg'
  }
}

export class Reaction {
  /**
   * @param {string | undefined} [m]
   * @param {string | undefined} [s]
   */
  constructor(m, s) {
    this.modifier = m || ''
    this.situation = s || ''
  }
}

export class Modifier extends Reaction {}

export class Language {
  constructor(n, s, w, p) {
    this.name = n
    this.spoken = s || ''
    this.written = w || ''
    this.points = p || ''
  }
}

/**
 * A representation of a Hit Location and DR on that location. If
 * this.damageType is set, this.dr will return a damage type-specific
 * DR value.
 *
 * Otherwise you can call this.getDR(type) to retrieve just the DR for
 * a specific type without first setting this.damageType.
 */
export class HitLocationEntry {
  static getLargeAreaDR(entries) {
    let lowestDR = Number.POSITIVE_INFINITY
    let torsoDR = 0

    for (let value of entries.filter(it => it.roll.length > 0)) {
      if (value.dr < lowestDR) lowestDR = value.dr
      if (value.where === 'Torso') torsoDR = value.dr
    }
    // return the average of torso and lowest dr
    return Math.ceil((lowestDR + torsoDR) / 2)
  }

  static findLocation(entries, where) {
    return entries.find(it => it.where === where)
  }

  constructor(where, dr, rollText, split) {
    this.where = where
    this._dr = parseInt(dr)
    this._damageType = null
    this.rollText = rollText
    this.roll = convertRollStringToArrayOfInt(rollText)
    this.split = split
  }

  getDR(damageType) {
    if (!damageType || !this.split) return this._dr
    return !!this?.split[damageType] ? this.split[damageType] : this._dr
  }

  get dr() {
    return this.getDR(this._damageType)
  }

  set damageType(damageType) {
    this._damageType = damageType
  }
}
