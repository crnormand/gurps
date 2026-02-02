global.foundry = {
  abstract: {
    // @ts-ignore
    DataModel: class {},
  },
  // @ts-ignore
  data: {},
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
}

// Mock Foundry VTT Application class
global.Application = class {}

global.GURPS = { SYSTEM_NAME: 'gurps' }
global.game = {
  settings: {
    get: () => null,
  },
}

// Mock Foundry VTT Application class
global.Application = class {}

// Mock Foundry VTT FormApplication class
global.FormApplication = class FormApplication {
  constructor(object = {}, options = {}) {
    this.object = object
    this.options = options
  }

  static get defaultOptions() {
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

  get template() {
    return this.options.template
  }

  getData(options = {}) {
    return { object: this.object }
  }

  async render(force = false, options = {}) {
    return this
  }

  async close(options = {}) {
    return this
  }

  activateListeners(html) {}

  async _updateObject(event, formData) {}
}

// Mock Foundry VTT ContextMenu class
global.ContextMenu = class ContextMenu {
  constructor(element, selector, menuItems, events = {}) {
    this.element = element
    this.selector = selector
    this.menuItems = menuItems
    this.events = events
  }

  bind() {
    return this
  }

  close(options = {}) {
    return this
  }

  render(target) {
    return this
  }
}
