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
