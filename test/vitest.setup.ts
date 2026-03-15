export {}

const typePrototypes: [new (...args: never[]) => unknown, string][] = [
  [Array, 'Array'],
  [Set, 'Set'],
  [Map, 'Map'],
  [Promise, 'Promise'],
  [Error, 'Error'],

  /* ---------------------------------------- */
]

class MockDataModel {
  constructor(data: Record<string, unknown>) {
    Object.assign(this, data)
  }

  static cleanData = (source: unknown): unknown => source ?? {}
}

/* ---------------------------------------- */

class MockTypeDataModel {
  constructor(data?: Record<string, unknown>) {
    const isGetterProperty = (instance: object, propertyKey: string): boolean => {
      let prototype: object | null = instance

      while (prototype) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyKey)

        if (descriptor && descriptor.get && !descriptor.set) {
          return true
        }

        prototype = Object.getPrototypeOf(prototype) as object | null
      }

      return false
    }

    // Only assign properties that don't already exist as getters
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (isGetterProperty(this, key)) continue
        ;(this as Record<string, unknown>)[key] = value
      }
    }
  }

  static defineSchema(): Record<string, never> {
    return {}
  }

  static LOCALIZATION_PREFIXES: string[] = []
}

/* ---------------------------------------- */

class MockDocument {
  _id: string

  constructor(data?: { _id?: string } & Record<string, unknown>) {
    this._id = data?._id ?? 'TEST_ID'
    Object.assign(this, data)
  }
}

/* ---------------------------------------- */

class MockBaseActor {
  name: string
  type: string
  items: MockCollection<MockBaseItem>
  effects: unknown[]
  system: Record<string, unknown>
  id: string
  _id: string

  /* ---------------------------------------- */

  constructor(data: { name?: string; type?: string; id?: string; _id?: string } = {}) {
    this.name = data.name ?? ''
    this.type = data.type ?? 'base'
    this.items = new MockCollection()
    this.effects = []
    this.system = {}
    this.id = data.id ?? 'ACTOR_ID'
    this._id = data._id ?? this.id
  }

  /* ---------------------------------------- */

  // Basic helpers used by code paths
  isOfType(...types: string[]): boolean {
    return types.includes(this.type)
  }

  /* ---------------------------------------- */

  get inCombat(): boolean {
    return false
  }

  /* ---------------------------------------- */

  get owners(): unknown[] {
    return []
  }

  /* ---------------------------------------- */

  // Stubs for embedded docs and updates used in a few code paths
  getEmbeddedDocument(): undefined {
    return undefined
  }

  /* ---------------------------------------- */

  async update(_data: Record<string, unknown>): Promise<this> {
    return this
  }

  /* ---------------------------------------- */

  async createEmbeddedDocuments(
    _embeddedName: string,
    _data: unknown[],
    _options: Record<string, unknown> = {}
  ): Promise<unknown[]> {
    return []
  }

  /* ---------------------------------------- */

  async updateEmbeddedDocuments(
    _embeddedName: string,
    _updates: unknown[],
    _options: Record<string, unknown> = {}
  ): Promise<unknown[]> {
    return []
  }

  /* ---------------------------------------- */

  async deleteEmbeddedDocuments(
    _embeddedName: string,
    _ids: string[],
    _options: Record<string, unknown> = {}
  ): Promise<unknown[]> {
    return []
  }

  /* ---------------------------------------- */

  async toggleStatusEffect(): Promise<boolean> {
    return true
  }
}

class MockBaseItem {
  name: string
  type: string
  system: Record<string, unknown>
  _id: string
  id: string
  parent: unknown

  /* ---------------------------------------- */

  constructor(
    data: { name?: string; type?: string; system?: Record<string, unknown>; _id?: string; id?: string } = {},
    options: { parent?: unknown } = {}
  ) {
    this.name = data.name ?? ''
    this.type = data.type ?? 'base'
    this.system = data.system ?? {}
    this._id = data._id ?? data.id ?? 'ITEM_ID'
    this.id = this._id
    this.parent = options?.parent ?? null
  }

  /* ---------------------------------------- */

  static async create(
    data: { name?: string; type?: string; system?: Record<string, unknown>; _id?: string; id?: string },
    options: { parent?: { items?: MockCollection<unknown> } } = {}
  ): Promise<MockBaseItem> {
    const item = new this(data, options)

    // If there's a parent, add to their items collection
    if (options.parent && options.parent.items) {
      options.parent.items.set(item.id, item)
    }

    return item
  }

  /* ---------------------------------------- */

  async delete(): Promise<this> {
    return this
  }

  /* ---------------------------------------- */

  async update(data: Record<string, unknown>): Promise<this> {
    Object.assign(this, data)

    return this
  }

  /* ---------------------------------------- */

  isOfType(...types: string[]): boolean {
    return types.includes(this.type)
  }
}

class MockCollection<V> extends Map<string, V> {
  constructor(entries?: readonly (readonly [string, V])[] | null) {
    super(entries)
  }

  find(predicate: (value: V) => boolean): V | undefined {
    for (const [, value] of this.entries()) {
      if (predicate(value)) return value
    }

    return undefined
  }

  filter(predicate: (value: V) => boolean): V[] {
    const result: V[] = []

    for (const [, value] of this.entries()) {
      if (predicate(value)) result.push(value)
    }

    return result
  }
}

global.foundry = {
  abstract: {
    DataModel: MockDataModel,
    TypeDataModel: MockTypeDataModel,
    Document: MockDocument,
  },
  documents: {
    BaseActor: MockBaseActor,
    BaseItem: MockBaseItem,
    Actor: MockBaseActor,
    Item: MockBaseItem,
  },
  data: {
    fields: {
      TypedSchemaField: class {
        types: unknown
        options: unknown

        constructor(types: unknown, options?: unknown) {
          this.types = types
          this.options = options
        }

        _validateSpecial(): boolean {
          return true
        }
      },
      TypedObjectField: class {
        element: unknown
        options: unknown

        constructor(element: unknown, options?: unknown) {
          this.element = element
          this.options = options
        }
      },
      SchemaField: class {
        schema: unknown
        options: unknown

        constructor(schema: unknown, options?: unknown) {
          this.schema = schema
          this.options = options
        }
      },
      StringField: class {
        options: unknown

        constructor(options?: unknown) {
          this.options = options
        }
      },
      NumberField: class {
        options: unknown

        constructor(options?: unknown) {
          this.options = options
        }
      },
      BooleanField: class {
        options: unknown

        constructor(options?: unknown) {
          this.options = options
        }
      },
      ArrayField: class {
        element: unknown
        options: unknown

        constructor(element: unknown, options?: unknown) {
          this.element = element
          this.options = options
        }
      },
      ObjectField: class {
        options: unknown

        constructor(options?: unknown) {
          this.options = options
        }
      },
      EmbeddedDataField: class {
        model: unknown
        options: unknown

        constructor(model: unknown, options?: unknown) {
          this.model = model
          this.options = options
        }
      },
    },
  },
  utils: {
    // Mock Collection class
    Collection: MockCollection,
    // Minimal getProperty implementation for tests
    getProperty: (obj: Record<string, unknown>, path: string): unknown => {
      if (!obj || !path) return undefined
      const parts = String(path).split('.')
      let ref: unknown = obj

      for (const part of parts) {
        if (ref == null) return undefined
        ref = (ref as Record<string, unknown>)[part]
      }

      return ref
    },
    // Basic deep clone implementation for tests
    deepClone: <T>(obj: T): T => {
      try {
        // Prefer structuredClone when available
        if (typeof structuredClone === 'function') return structuredClone(obj)
      } catch {
        // fall through to JSON clone
      }

      return JSON.parse(JSON.stringify(obj)) as T
    },
    // Foundry has both deepClone and duplicate; map duplicate to deepClone here
    duplicate: <T>(obj: T): T => {
      return global.foundry.utils.deepClone(obj)
    },
    flattenObject: (obj: Record<string, unknown>, _d = 0): Record<string, unknown> => {
      const flat: Record<string, unknown> = {}

      if (_d > 100) {
        throw new Error('Maximum depth exceeded')
      }

      for (const [key, value] of Object.entries(obj)) {
        const type = global.foundry.utils.getType(value)

        if (type === 'Object') {
          if (global.foundry.utils.isEmpty(value)) flat[key] = value
          const inner = global.foundry.utils.flattenObject(value as Record<string, unknown>, _d + 1)

          for (const [ik, iv] of Object.entries(inner)) {
            flat[`${key}.${ik}`] = iv
          }
        } else flat[key] = value
      }

      return flat
    },
    getType: (variable: unknown): string => {
      // Primitive types, handled with simple typeof check
      const typeOf = typeof variable

      if (typeOf !== 'object') return typeOf

      // Special cases of object
      if (variable === null) return 'null'
      if (!(variable as object).constructor) return 'Object' // Object with the null prototype.
      if ((variable as object).constructor === Object) return 'Object' // Simple objects

      // Match prototype instances
      for (const [cls, type] of typePrototypes) {
        if (variable instanceof cls) return type
      }

      if ('HTMLElement' in globalThis && variable instanceof globalThis.HTMLElement) return 'HTMLElement'

      // Unknown Object type
      return 'Unknown'
    },
    isEmpty: (value: unknown): boolean => {
      const type = global.foundry.utils.getType(value)

      switch (type) {
        case 'undefined':
          return true
        case 'null':
          return true
        case 'Array':
          return !(value as unknown[]).length
        case 'Object':
          return !Object.keys(value as object).length
        case 'Set':
        case 'Map':
          return !(value as { size: number }).size
        default:
          return false
      }
    },
    deleteProperty: (object: Record<string, unknown>, key: string): boolean => {
      if (!key || !object) return false
      let parent: Record<string, unknown> | undefined
      let target: unknown = object
      const parts = key.split('.')

      for (const part of parts) {
        if (!target) return false
        const type = typeof target

        if (type !== 'object' && type !== 'function') return false
        if (!(part in (target as object))) return false
        parent = target as Record<string, unknown>
        target = parent[part]
      }

      delete parent![parts.at(-1)!]

      return true
    },
  },
  appv1: {
    sheets: {
      // Minimal base classes to satisfy extends
      ActorSheet: class {},
      ItemSheet: class {},
    },
  },
  applications: {
    api: {
      Application: class {
        options: unknown

        constructor(options?: unknown) {
          this.options = options
        }
      },
      ApplicationV2: class {},
      DocumentSheetV2: class {},
      HandlebarsApplicationMixin: <T extends abstract new (...args: unknown[]) => object>(Base: T): T =>
        class extends (Base as abstract new (...args: unknown[]) => object) {} as unknown as T,
    },
    handlebars: {
      renderTemplate: async (): Promise<string> => '',
    },
    sheets: {
      ActorSheet: class {},
      ItemSheet: class {},
    },
    ux: {
      ContextMenu: class {
        element: unknown
        selector: string
        menuItems: unknown[]
        options: unknown

        constructor(element: unknown, selector: string, menuItems: unknown[], options?: unknown) {
          this.element = element
          this.selector = selector
          this.menuItems = menuItems
          this.options = options
        }
      },
    },
  },
} as unknown as typeof foundry

/* ---------------------------------------- */
;(global as unknown as Record<string, unknown>).canvas = {
  layer: {
    get: (): Record<string, unknown> => ({}),
  },
} as unknown as Canvas

/* ---------------------------------------- */
;(global as unknown as Record<string, unknown>).game = {
  ready: true,
  i18n: {
    localize: (key: string): string => {
      // Mock specific GURPS localization keys
      if (key === 'GURPS.CR12') return 'CR: 12 (Resist Quite Often)'

      // Add more as needed
      return key
    },
  },
  users: [],
  settings: {
    get: (): null => null,
  },
} as unknown as Game

/* ---------------------------------------- */
;(global as unknown as Record<string, unknown>).ui = {
  notifications: {
    info: (): void => {},
    warn: (): void => {},
    error: (): void => {},
  },
} as unknown as typeof ui

/* ---------------------------------------- */

// Minimal CONFIG stub
;(global as unknown as Record<string, unknown>).CONFIG = {
  statusEffects: [],
} as unknown as CONFIG

/* ---------------------------------------- */

// Minimal ChatMessage stub
global.ChatMessage = {
  create: async (): Promise<Record<string, unknown>> => ({}),
} as unknown as typeof ChatMessage

/* ---------------------------------------- */

// Minimal Hooks stub
;(global as unknown as Record<string, unknown>).Hooks = {
  once: (): void => {},
  on: (): void => {},
} as unknown as typeof Hooks

/* ---------------------------------------- */

global.Actor = MockBaseActor as unknown as typeof Actor

global.Item = MockBaseItem as unknown as typeof Item

/* ---------------------------------------- */

// Minimal Application base class for sheet subclasses used by imports
global.Application = class {
  constructor(_options: Record<string, unknown> = {}) {}

  render(): void {}
} as unknown as typeof Application

global.GURPS = { SYSTEM_NAME: 'gurps' } as unknown as typeof GURPS

/* ---------------------------------------- */

type MockFormApplicationOptions = {
  classes: string[]
  template: string
  width: number
  height: string | number
  closeOnSubmit: boolean
  submitOnChange: boolean
  submitOnClose: boolean
  editable: boolean
}

/* ---------------------------------------- */

// Mock Foundry VTT FormApplication class
global.FormApplication = class FormApplication {
  object: unknown
  options: MockFormApplicationOptions

  constructor(object: unknown = {}, options: Partial<MockFormApplicationOptions> = {}) {
    this.object = object
    this.options = { ...FormApplication.defaultOptions, ...options }
  }

  static get defaultOptions(): MockFormApplicationOptions {
    return {
      classes: [],
      template: '',
      width: 400,
      height: 'auto',
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
      editable: true,
    }
  }

  get template(): string {
    return this.options.template
  }

  getData(_options: Record<string, unknown> = {}): { object: unknown } {
    return { object: this.object }
  }

  async render(_force = false, _options: Record<string, unknown> = {}): Promise<this> {
    return this
  }

  async close(_options: Record<string, unknown> = {}): Promise<this> {
    return this
  }

  activateListeners(_html: unknown): void {}

  async _updateObject(_event: unknown, _formData: unknown): Promise<void> {}
} as unknown as typeof FormApplication
