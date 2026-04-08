// Minimal DocumentSheet namespace providing a shared Configuration base type
// for ActorSheet and ItemSheet. All properties are optional so subclasses can
// declare DEFAULT_OPTIONS without satisfying required fvtt-types fields.

import { DeepPartial, MaybePromise, ToMethod } from 'fvtt-types/utils'

import { Application, HeaderControlsEntry } from './application.js'

export namespace DocumentSheet {
  export type ActionHandler = (event: PointerEvent, target: HTMLElement) => void | Promise<void>

  /* ---------------------------------------- */

  export interface Configuration<ConcreteDocument = unknown> {
    /**
     * An HTML element identifier used for this Application instance
     */
    id: string

    /**
     * An string discriminator substituted for \{id\} in the default
     * HTML element identifier for the class
     */
    uniqueId: string

    /**
     * An array of CSS classes to apply to the Application
     */
    classes: string[]

    /**
     * The HTMLElement tag type used for the outer Application frame
     */
    tag: string

    /**
     * Configuration of the window behaviors for this Application
     */
    window: WindowConfiguration

    /**
     * Click actions supported by the Application and their event handler
     * functions. A handler function can be defined directly which only
     * responds to left-click events. Otherwise, an object can be declared
     * containing both a handler function and an array of buttons which are
     * matched against the PointerEvent#button property.
     */
    actions: Record<string, ClickAction<Application> | { handler: ClickAction<Application>; buttons: number[] }>

    /**
     * Configuration used if the application top-level element is a form
     */
    form?: FormConfiguration

    /**
     * Default positioning data for the application
     */
    position: Partial<Position>

    /**
     * A permission level in CONST.DOCUMENT_OWNERSHIP_LEVELS
     */
    viewPermission: typeof foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS

    /**
     * A permission level in CONST.DOCUMENT_OWNERSHIP_LEVELS
     */
    editPermission: typeof foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS

    /**
     * Can this sheet class be used to create a new Document?
     */
    canCreate: boolean

    /**
     * Allow sheet configuration as a header button
     */
    sheetConfig: boolean

    /**
     * The Document instance associated with this sheet
     */
    document: ConcreteDocument
  }

  /* ---------------------------------------- */

  export type DefaultOptions<Conf extends Configuration> = DeepPartial<Conf> &
    object & {
      document?: never
    }

  /* ---------------------------------------- */

  interface WindowConfiguration {
    /**
     * Is this Application rendered inside a window frame?
     * @defaultValue `true`
     */
    frame: boolean

    /**
     * Can this Application be positioned via JavaScript or only by CSS
     * @defaultValue `true`
     */
    positioned: boolean

    /** The window title. Displayed only if the application is framed */
    title: string

    /** An optional Font Awesome icon class displayed left of the window title */
    icon: string | false

    /** An array of window control entries */
    controls: HeaderControlsEntry[]

    /**
     * Can the window app be minimized by double-clicking on the title
     * @defaultValue `true`
     */
    minimizable: boolean

    /**
     * Is this window resizable?
     * @defaultValue `false`
     */
    resizable: boolean

    /**
     * A specific tag name to use for the .window-content element
     * @defaultValue `"section"`
     */
    contentTag: string

    /** Additional CSS classes to apply to the .window-content element */
    contentClasses: string[]
  }

  /* ---------------------------------------- */

  interface FormConfiguration {
    handler: FormSubmission

    submitOnChange: boolean

    closeOnSubmit: boolean
  }

  /* ---------------------------------------- */

  export type ClickAction<App extends Application.Any = Application.Any> = ToMethod<
    (
      this: App,

      /** The originating click event */
      event: PointerEvent | null,

      /** The capturing HTML element which defines the [data-action] */
      target: HTMLElement
    ) => MaybePromise<void>
  >

  /* ---------------------------------------- */

  type FormSubmission = (
    /** The originating form submission or input change event */
    event: SubmitEvent | Event,

    /** The form element that was submitted */
    form: HTMLFormElement,

    /** Processed data for the submitted form */
    formData: foundry.applications.ux.FormDataExtended
  ) => MaybePromise<void>

  /* ---------------------------------------- */

  interface Position {
    /** Window offset pixels from top */
    top: number

    /** Window offset pixels from left */
    left: number

    /**
     * Un-scaled pixels in width or "auto"
     * @defaultValue "auto"
     */
    width: number | 'auto'

    /**
     * Un-scaled pixels in height or "auto"
     * @defaultValue "auto"
     */
    height: number | 'auto'

    /** A numeric scaling factor applied to application dimensions */
    scale: number

    /** A z-index of the application relative to siblings */
    zIndex: number
  }

  /* ---------------------------------------- */

  export interface RenderOptions {
    force?: boolean
    parts?: string[]
    isFirstRender?: boolean
  }

  /* ---------------------------------------- */

  export interface RenderContext {
    source?: unknown
    fields?: unknown
    editable?: boolean
    tabs?: Record<string, Application.Tab>
  }
}
