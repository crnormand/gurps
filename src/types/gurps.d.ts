import {
  ActorSheetV2ActionHandler,
  ActorSheetV2Configuration,
  ActorSheetV2RenderContext,
  ActorSheetV2RenderOptions,
  HandlebarsActorSheetV2Constructor,
  HandlebarsActorSheetV2Instance,
  HandlebarsTemplatePart,
  HandlebarsControlsEntry,
} from './foundry/actor-sheet-v2.js'

export {}

declare global {
  namespace gurps {
    /**
     * Helper type representing any DataModel which contains the static "metadata" property.
     */
    interface MetaDataOwner {
      metadata: {
        embedded: Record<string, string>
      }
    }

    /* ---------------------------------------- */

    namespace applications {
      namespace ActorSheet {
        export type Configuration = ActorSheetV2Configuration

        export type ActionHandler = ActorSheetV2ActionHandler

        export type RenderContext = ActorSheetV2RenderContext

        export type RenderOptions = ActorSheetV2RenderOptions

        export type HandlebarsConstructor<TDocument extends Actor = Actor> =
          HandlebarsActorSheetV2Constructor<TDocument>

        export type HandlebarsInstance<TDocument extends Actor = Actor> = HandlebarsActorSheetV2Instance<TDocument>
      }

      /* ---------------------------------------- */

      namespace handlebars {
        export type TemplatePart = HandlebarsTemplatePart
        export type ControlsEntry = HandlebarsControlsEntry
      }
    }

    /* ---------------------------------------- */
  }
}
