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
