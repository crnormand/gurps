import { DeepPartial } from 'fvtt-types/utils'
import { ActorSheetTabs } from './helpers'

namespace GurpsActorSheetV2 {
  export type RenderContext = {}
}

interface GurpsActorSheetV2 {
  constructor: typeof GurpsActorSheetV2
}

class GurpsActorSheetV2 extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  /* -------------------------------------------- */
  /*  Sheet Editing                               */
  /* -------------------------------------------- */

  /**
   * Intended as a replacement for previous dedicated editing sheet.
   */
  get isEditing(): boolean {
    return this.isEditable && this._mode === this.constructor.MODES.EDIT
  }

  /* -------------------------------------------- */

  /**
   * PLAY mode indicates non-editing, EDIT mode indicates editing.
   */
  static MODES = {
    PLAY: 1,
    EDIT: 2,
  }

  /* -------------------------------------------- */

  protected _mode = this.constructor.MODES.PLAY

  /* -------------------------------------------- */
  /*  Basic Functionality                         */
  /* -------------------------------------------- */

  static override DEFAULT_OPTIONS: foundry.applications.api.DocumentSheetV2.PartialConfiguration<foundry.applications.api.DocumentSheetV2.Configuration> =
    {
      tag: 'form',
      // NOTE: Currently using "gurps2" to avoid conflicts with existing CSS declarations
      classes: ['gurps2', 'actor', 'character'],
      position: {
        width: 800,
        height: 800,
      },
      form: {
        submitOnChange: true,
        closeOnSubmit: false,
        handler: this.#onSubmit,
      },
      actions: {
        viewImage: this.#onViewImage,
        editImage: this.#onEditImage,
        toggleMode: this.#onToggleMode,
      },
      // @ts-expect-error v12 currently doesn't include dragDrop for DocumentSheetV2
      dragDrop: [{ dragSelector: 'item-list .item', dropSelector: null }],
    }

  /* -------------------------------------------- */

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      id: 'header',
      template: `systems/gurps/templates/actor/parts/character-header.hbs`,
    },
    combatTab: {
      id: 'combat',
      template: `systems/gurps/templates/actor/parts/character-combat.hbs`,
    },
    personalTab: {
      id: 'personal',
      template: `systems/gurps/templates/actor/parts/character-personal.hbs`,
    },
    traitsTab: {
      id: 'traits',
      template: `systems/gurps/templates/actor/parts/character-traits.hbs`,
    },
    skillsTab: {
      id: 'skills',
      template: `systems/gurps/templates/actor/parts/character-skills.hbs`,
    },
    resourcesTab: {
      id: 'resources',
      template: `systems/gurps/templates/actor/parts/character-resources.hbs`,
    },
    equipmentTab: {
      id: 'equipment',
      template: `systems/gurps/templates/actor/parts/character-equipment.hbs`,
    },
  }

  /* -------------------------------------------- */

  override tabGroups: Record<string, string> = {
    primary: ActorSheetTabs.combat,
  }

  /* -------------------------------------------- */

  protected _getTabs(): Record<string, Partial<foundry.applications.types.ApplicationTab>> {
    return this._markTabs({
      combatTab: {
        id: 'combat',
        group: 'primary',
        icon: 'fa-solid fa-swords',
      },
      personalTab: {
        id: 'personal',
        group: 'primary',
        icon: 'fa-solid fa-user',
      },
      traitsTab: {
        id: 'traits',
        group: 'primary',
        icon: 'fa-solid fa-theater-masks',
      },
      skillsTab: {
        id: 'combat',
        group: 'primary',
        icon: 'fa-solid fa-person-swimming',
      },
      resourcesTab: {
        id: 'resources',
        group: 'primary',
        icon: 'fa-solid fa-bars-progress',
      },
      equipmentTab: {
        id: 'equipment',
        group: 'primary',
        icon: 'fa-solid fa-screwdeiver-wrench',
      },
    })
  }

  /* -------------------------------------------- */

  /**
   * @param tabs - Record of tabs to mark
   * @returns Record of tabs, with active tab marked as active
   */
  protected _markTabs(
    tabs: Record<string, Partial<foundry.applications.types.ApplicationTab>>
  ): Record<string, Partial<foundry.applications.types.ApplicationTab>> {
    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group!] === v.id
      v.cssClass = v.active ? 'active' : ''
      if ('tabs' in v) this._markTabs(v.tabs as Record<string, Partial<foundry.applications.types.ApplicationTab>>)
    }
    return tabs
  }

  /* -------------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<GurpsActorSheetV2.RenderContext> {
    const primaryTabs = Object.fromEntries(Object.entries(this.tabGroups).filter(([, v]) => v === 'primary'))
    const data = super._prepareContext(options)

    console.log(data)

    return {
      ...data,
      isEditing: this.isEditing,
      tabs: this._getTabs(),
      primaryTabs,
      isGM: game.user?.isGM ?? false,
      actor: this.actor,
      system: this.actor.system,
      portraitHoverText: game.i18n?.localize(
        `GURPS.Sheet.Common.PortraitHoverText.${this.isEditing ? 'Edit' : 'View'}`
      ),
    }
  }

  /**
   * Adds toggle switch to header
   */
  protected override async _renderFrame(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>
  ): Promise<HTMLElement> {
    const frame = super._renderFrame(options)

    if (this.isEditable) {
      const toggleLabel = game.i18n?.localize('GURPS.Sheet.Common.ToggleMode')
      const toggleIcon = this._mode === this.constructor.MODES.EDIT ? 'fa-solid fa-unlock' : 'fa-solid fa-lock'
      const toggleButton = `<button type='button' class='header-control ${toggleIcon}' data-action='toggleMode' data-tooltip='${toggleLabel}' aria-label='${toggleLabel}'></button>`
      this.window.icon?.insertAdjacentHTML('beforebegin', toggleButton)
    }

    return frame
  }

  /* -------------------------------------------- */
  /*   Event Handlers                             */
  /* -------------------------------------------- */

  static async #onSubmit(
    this: GurpsActorSheetV2,
    event: Event | SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    event.preventDefault()
    event.stopImmediatePropagation()

    await this.actor.update(formData.object)
  }

  /* -------------------------------------------- */

  static async #onViewImage(this: GurpsActorSheetV2, event: Event): Promise<void> {
    event.preventDefault()
    if (!this.actor.img || this.actor.img === '') return
    const title = this.actor.name
    new ImagePopout(this.actor.img, { title, uuid: this.actor.uuid }).render(true)
  }

  /* -------------------------------------------- */

  static async #onEditImage(this: GurpsActorSheetV2, event: Event): Promise<void> {
    const img = event.currentTarget as HTMLImageElement
    const current = this.actor.img ?? foundry.CONST.DEFAULT_TOKEN
    const fp = new FilePicker({
      type: 'image',
      current: current,
      callback: async (path: string) => {
        img.src = path
        await this.actor.update({ img: path })
        return this.render()
      },
      top: this.position.top! + 40,
      left: this.position.left! + 10,
    })
    await fp.browse(current)
  }

  /* -------------------------------------------- */

  static async #onToggleMode(this: GurpsActorSheetV2, event: Event): Promise<void> {
    const toggle = event.target as HTMLButtonElement
    toggle.classList.toggle('fa-lock')
    toggle.classList.toggle('fa-unlock')

    const { MODES } = this.constructor
    if (this._mode === MODES.PLAY) this._mode = MODES.EDIT
    else this._mode = MODES.PLAY
    await this.submit()
    this.render()
  }
}
export { GurpsActorSheetV2 }
