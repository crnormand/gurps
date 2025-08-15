/** A `Proxy` to to get Foundry to construct `ActorPF2e` subclasses */

import { GurpsActor } from './actor.js'
import { GurpsActorV2 } from './gurps-actor.js'

const ActorProxy = new Proxy(Actor, {
  // @ts-expect-error
  construct(_target, args: [source: PreCreate<ActorSource>, context?: DocumentConstructionContext<Actor['parent']>]) {
    const type = args[0]?.type
    switch (type) {
      case 'character':
        return new GurpsActor(...args)
      case 'character':
        return new GurpsActorV2(...args)
      default:
        throw Error(`Actor type ${type} does not exist and actor module sub-types are not supported`)
    }
  },
})
export default ActorProxy
