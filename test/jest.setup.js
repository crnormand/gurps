global.foundry = {
  abstract: {
    // @ts-ignore
    DataModel: class {
      constructor(data, options) {
        Object.assign(this, data)
      }
    },
    // @ts-ignore
    TypeDataModel: class {
      constructor(data, options) {
        // Only assign properties that don't already exist as getters
        if (data) {
          for (const [key, value] of Object.entries(data)) {
            // Check if it's a getter in this class or any parent class
            let obj = this
            let isGetter = false
            while (obj) {
              const descriptor = Object.getOwnPropertyDescriptor(obj, key)
              if (descriptor && descriptor.get && !descriptor.set) {
                isGetter = true
                break
              }
              obj = Object.getPrototypeOf(obj)
            }
            if (isGetter) continue
            this[key] = value
          }
        }
      }

      static defineSchema() {
        return {}
      }

      static LOCALIZATION_PREFIXES = []
    },
    // @ts-ignore
    Document: class {
      constructor(data, options) {
        this._id = data?._id || 'TEST_ID'
        Object.assign(this, data)
      }
    },
  },
  documents: {
    // @ts-ignore
    BaseActor: class {
      constructor(data = {}, options = {}) {
        this.name = data.name || ''
        this.type = data.type || 'base'
        this.items = []
        this.effects = []
        this.system = {}
        this.id = data.id || 'ACTOR_ID'
        this._id = data._id || this.id
      }
    },
    // @ts-ignore
    BaseItem: class {
      constructor(data = {}, options = {}) {
        this.name = data.name || ''
        this.type = data.type || 'base'
        this.system = data.system || {}
        this._id = data._id || data.id || 'ITEM_ID'
        this.id = this._id
        this.parent = options?.parent || null
      }

      async delete() {
        return this
      }

      async update(data) {
        Object.assign(this, data)
        return this
      }

      isOfType(...types) {
        return types.includes(this.type)
      }
    },
  },
  // @ts-ignore
  data: {
    // @ts-ignore
    fields: {
      // @ts-ignore
      TypedSchemaField: class TypedSchemaField {
        constructor(types, options) {
          this.types = types
          this.options = options
        }

        _validateSpecial(value) {
          return true
        }
      },
      // @ts-ignore
      TypedObjectField: class TypedObjectField {
        constructor(element, options) {
          this.element = element
          this.options = options
        }
      },
      // @ts-ignore
      SchemaField: class SchemaField {
        constructor(schema, options) {
          this.schema = schema
          this.options = options
        }
      },
      // @ts-ignore
      StringField: class StringField {
        constructor(options) {
          this.options = options
        }
      },
      // @ts-ignore
      NumberField: class NumberField {
        constructor(options) {
          this.options = options
        }
      },
      // @ts-ignore
      BooleanField: class BooleanField {
        constructor(options) {
          this.options = options
        }
      },
      // @ts-ignore
      ArrayField: class ArrayField {
        constructor(element, options) {
          this.element = element
          this.options = options
        }
      },
      // @ts-ignore
      ObjectField: class ObjectField {
        constructor(options) {
          this.options = options
        }
      },
    },
  },
  utils: {
    // Mock Collection class
    Collection: class Collection extends Map {
      constructor(entries) {
        super(entries)
      }

      get(key) {
        return super.get(key)
      }

      set(key, value) {
        return super.set(key, value)
      }

      find(predicate) {
        for (const [key, value] of this.entries()) {
          if (predicate(value)) return value
        }
        return undefined
      }

      filter(predicate) {
        const result = []
        for (const [key, value] of this.entries()) {
          if (predicate(value)) result.push(value)
        }
        return result
      }
    },
    // Minimal getProperty implementation for tests
    getProperty: (obj, path) => {
      if (!obj || !path) return undefined
      const parts = String(path).split('.')
      let ref = obj
      for (const p of parts) {
        if (ref == null) return undefined
        ref = ref[p]
      }
      return ref
    },
    // Basic deep clone implementation for tests
    deepClone: obj => {
      try {
        // Prefer structuredClone when available
        // @ts-ignore
        if (typeof structuredClone === 'function') return structuredClone(obj)
      } catch (e) {
        // fall through to JSON clone
      }
      return JSON.parse(JSON.stringify(obj))
    },
    // Foundry has both deepClone and duplicate; map duplicate to deepClone here
    duplicate: obj => {
      // @ts-ignore
      return global.foundry.utils.deepClone(obj)
    },
    flattenObject: (obj, _d = 0) => {
      const flat = {}
      if (_d > 100) {
        throw new Error('Maximum depth exceeded')
      }
      for (const [k, v] of Object.entries(obj)) {
        const t = foundry.utils.getType(v)
        if (t === 'Object') {
          if (foundry.utils.isEmpty(v)) flat[k] = v
          const inner = foundry.utils.flattenObject(v, _d + 1)
          for (const [ik, iv] of Object.entries(inner)) {
            flat[`${k}.${ik}`] = iv
          }
        } else flat[k] = v
      }
      return flat
    },
    getType: variable => {
      // Primitive types, handled with simple typeof check
      const typeOf = typeof variable
      if (typeOf !== 'object') return typeOf

      // Special cases of object
      if (variable === null) return 'null'
      if (!variable.constructor) return 'Object' // Object with the null prototype.
      if (variable.constructor === Object) return 'Object' // Simple objects

      // Match prototype instances
      for (const [cls, type] of typePrototypes) {
        if (variable instanceof cls) return type
      }
      if ('HTMLElement' in globalThis && variable instanceof globalThis.HTMLElement) return 'HTMLElement'

      // Unknown Object type
      return 'Unknown'
    },
    isEmpty: value => {
      const t = foundry.utils.getType(value)
      switch (t) {
        case 'undefined':
          return true
        case 'null':
          return true
        case 'Array':
          return !value.length
        case 'Object':
          return !Object.keys(value).length
        case 'Set':
        case 'Map':
          return !value.size
        default:
          return false
      }
    },
    deleteProperty: (object, key) => {
      if (!key || !object) return false
      let parent
      let target = object
      const parts = key.split('.')
      for (const p of parts) {
        if (!target) return false
        const type = typeof target
        if (type !== 'object' && type !== 'function') return false
        if (!(p in target)) return false
        parent = target
        target = parent[p]
      }
      delete parent[parts.at(-1)]
      return true
    },
  },
  appv1: {
    sheets: {
      // Minimal base classes to satisfy extends
      // @ts-ignore
      ActorSheet: class {},
      // @ts-ignore
      ItemSheet: class {},
    },
  },
  applications: {
    api: {
      // @ts-ignore
      Application: class {
        constructor(options) {
          this.options = options
        }
      },
      // @ts-ignore
      ApplicationV2: class {},
      // @ts-ignore
      HandlebarsApplicationMixin: Base => class extends Base {},
    },
    handlebars: {
      // @ts-ignore
      renderTemplate: async () => '',
    },
  },
}

// Add Item and Actor to documents namespace for generic use
foundry.documents.Item = foundry.documents.BaseItem
foundry.documents.Actor = foundry.documents.BaseActor

global.canvas = {
  layer: {
    // @ts-ignore
    get: () => ({}),
  },
}

global.game = {
  i18n: {
    // @ts-ignore
    localize: key => {
      // Mock specific GURPS localization keys
      if (key === 'GURPS.CR12') return 'CR: 12 (Resist Quite Often)'
      // Add more as needed
      return key
    },
  },
  users: [],
}

global.ui = {
  notifications: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}

// Minimal CONFIG stub
global.CONFIG = {
  statusEffects: [],
}

// Minimal ChatMessage stub
global.ChatMessage = {
  create: async () => ({}),
}

// Minimal Hooks stub
global.Hooks = {
  once: () => {},
  on: () => {},
}

// Provide a minimal Actor base so classes can extend it in tests
global.Actor = class extends foundry.documents.BaseActor {
  constructor(data = {}, options = {}) {
    super(data, options)
    this.items = new foundry.utils.Collection()
    this.effects = []
  }
  // Basic helpers used by code paths
  isOfType(...types) {
    return types.includes(this.type)
  }
  get inCombat() {
    return false
  }
  get owners() {
    return []
  }
  // Stubs for embedded docs and updates used in a few code paths
  getEmbeddedDocument() {
    return undefined
  }
  async update(_data) {
    return this
  }
  async createEmbeddedDocuments(_embeddedName, _data, _options = {}) {
    return []
  }
  async updateEmbeddedDocuments(_embeddedName, _updates, _options = {}) {
    return []
  }
  async deleteEmbeddedDocuments(_embeddedName, _ids, _options = {}) {
    return []
  }
  async toggleStatusEffect() {
    return true
  }
}

// Provide a minimal Item base so classes can extend it in tests
global.Item = class extends foundry.documents.BaseItem {
  constructor(data = {}, options = {}) {
    super(data, options)
  }

  static async create(data, options = {}) {
    const item = new this(data, options)
    // If there's a parent, add to their items collection
    if (options.parent && options.parent.items) {
      options.parent.items.set(item.id, item)
    }
    return item
  }
}

// Minimal Application base class for sheet subclasses used by imports
// @ts-ignore
global.Application = class {
  constructor(_options = {}) {}
  render() {}
}

// Minimal ContextMenu for utilities/contextmenu usages
// @ts-ignore
global.ContextMenu = class {
  constructor(_element, _selector, _items, _events) {}
}

// Minimal FormApplication for classes extending it
global.FormApplication = class extends global.Application {
  constructor(object = {}, options = {}) {
    super(options)
    this.object = object
  }
  static get defaultOptions() {
    return {}
  }
}
