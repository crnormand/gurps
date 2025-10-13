global.foundry = {
  abstract: {
    // @ts-ignore
    DataModel: class {},
  },
  // @ts-ignore
  data: {},
  utils: {
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

global.canvas = {
  // @ts-ignore
  layer: {
    // @ts-ignore
    get: () => ({}),
  },
}

global.game = {
  // @ts-ignore
  i18n: {
    // @ts-ignore
    localize: key => key,
  },
  users: [],
}

// @ts-ignore
global.ui = {
  notifications: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}

// Minimal CONFIG stub
// @ts-ignore
global.CONFIG = {
  statusEffects: [],
}

// Minimal ChatMessage stub
// @ts-ignore
global.ChatMessage = {
  create: async () => ({}),
}

// Minimal Hooks stub
// @ts-ignore
global.Hooks = {
  once: () => {},
  on: () => {},
}

// Provide a minimal Actor base so classes can extend it in tests
// @ts-ignore
global.Actor = class {
  constructor(data = {}, _options = {}) {
    this.name = data.name || ''
    this.type = data.type || 'base'
    this.items = []
    this.effects = []
    this.system = {}
    this.id = 'ACTOR_ID'
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
  async toggleStatusEffect() {
    return true
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
// @ts-ignore
global.FormApplication = class extends global.Application {
  constructor(object = {}, options = {}) {
    super(options)
    this.object = object
  }
  static get defaultOptions() {
    return {}
  }
}
