import { GurpsActor } from './actor.js'

// add type = 'characterV2' to ActorMetadata
type ActorMetadata = (typeof foundry.documents.BaseActor)['metadata'] & {
  type: 'characterV2'
}

class GurpsActorV2 extends GurpsActor {
  static override get metadata(): ActorMetadata {
    return {
      ...foundry.documents.BaseActor.metadata,
      type: 'characterV2',
    }
  }
}

export { GurpsActorV2 }
