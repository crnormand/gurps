/**
 * The point of this file is that these classes may be used outside of the Actor, but do not have
 * any dependencies on Actor.
 *
 * If that changes -- if any class is modified or added that has an external dependency -- we need
 * to think really hard about potentially moving the class back to actor.js.
 */

import { convertRollStringToArrayOfInt, extractP } from '../../lib/utilities.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { simpleHash } from '../../lib/simple-hash.js'

export class _Base {
  constructor() {
    this.notes = ''
    this.pageref = ''
    this.contains = {}
    this.uuid = ''
    this.parentuuid = ''
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

  findDefaultImage() {
    return 'icons/svg/item-bag.svg'
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
    } else if (!!this.save) {
      // User created System Object
      uniqueId = `GGA${foundry.utils.randomID(13)}`
    } else {
      // System Object imported from GCS/GCA without a UUID
      const { name, type, generator } = objProps
      const hashKey = `${name}${type}${generator}`
      uniqueId = simpleHash(hashKey)
    }
    return uniqueId
  }
}

export class NamedCost extends Named {
  /**
   * @param {string} [n1]
   */
  constructor(n1) {
    super(n1)
    this.points = 0
  }
}

const _AnimationMixin = {
  _checkotf: '',
  _duringotf: '',
  _passotf: '',
  _failotf: '',

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
  toItemData(fromProgram = '') {
    const timestamp = new Date()
    const system = this.itemInfo?.system || {}
    const uniqueId = this._getGGAId({ name: this.name, type: 'equipment', generator: fromProgram })
    const importId = !this.save ? uniqueId : ''
    const importFrom = this.importFrom || fromProgram
    return {
      name: this.name,
      img: this.itemInfo?.img || this.findDefaultImage(),
      type: 'equipment',
      system: {
        eqt: {
          name: this.name,
          notes: this.notes,
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
        ads: system.ads || {},
        skills: system.skills || {},
        spells: system.spells || {},
        melee: system.melee || {},
        ranged: system.ranged || {},
        bonuses: system.bonuses || '',
        equipped: this.equipped,
        carried: this.carried,
        globalid: this.globalid || '',
        importid: importId,
        importFrom: importFrom,
      },
    }
  }

  static fromObject(data, actor) {
    let equip
    if (data instanceof Equipment) {
      equip = data
    } else {
      equip = new Equipment(data.name, data.save)
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
    }
    // This equipment already exists in Actor?
    const existingEquipmentKey = actor._findEqtkeyForId('uuid', equip.uuid)
    if (!!existingEquipmentKey) {
      const existingEquipment = foundry.utils.getProperty(actor, existingEquipmentKey)
      if (!!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
        equip.itemid = existingEquipment.itemid || ''
      }
      equip.itemInfo = existingEquipment.itemInfo || {}
    }
    return equip
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
