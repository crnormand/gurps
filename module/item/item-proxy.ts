/** A `Proxy` to to get Foundry to construct `ActorPF2e` subclasses */

import { GurpsItem } from '../item.js'
import { GurpsItemV2 } from './gurps-item.js'

const ItemProxy = new Proxy(Item, {
  // @ts-expect-error
  construct(_target, args: [source: Item.CreateData, context?: Item.ConstructionContext]) {
    const type = args[0]?.type
    switch (type) {
      case 'equipment':
      case 'skill':
      case 'feature':
        return new GurpsItem(...args)
      case 'featureV2':
        return new GurpsItemV2(...args)
      default:
        throw Error(`Item type ${type} does not exist and item module sub-types are not supported`)
    }
  },
})
export default ItemProxy
