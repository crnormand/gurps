import { GurpsActorSheet } from './actor-sheet.js'
import api = foundry.applications.api
import { AnyObject, DeepPartial } from 'fvtt-types/utils'

class GurpsCharacterSheet extends GurpsActorSheet {
  static override DEFAULT_OPTIONS: api.DocumentSheet.DefaultOptions & AnyObject = {
    tag: 'form',
    classes: ['character'],
    actions: {
      toggleMode: this.#toggleMode,
      applyGlobalModifier: this.#applyGlobalModifier,
    },
    position: {
      width: 675,
      height: 700,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    sidebar: {
      template: 'systems/gurps/templates/actor/parts/sidebar.hbs',
      classes: ['sidebar'],
    },
    header: {
      template: 'systems/gurps/templates/actor/parts/header.hbs',
      classes: ['header'],
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    combat: {
      template: 'systems/gurps/templates/actor/parts/combat.hbs',
      classes: ['combat'],
    },
    personal: {
      template: 'systems/gurps/templates/actor/parts/personal.hbs',
      classes: ['personal'],
    },
    traits: {
      template: 'systems/gurps/templates/actor/parts/traits.hbs',
      classes: ['traits'],
    },
    skills: {
      template: 'systems/gurps/templates/actor/parts/skills.hbs',
      classes: ['skills'],
    },
    spells: {
      template: 'systems/gurps/templates/actor/parts/spells.hbs',
      classes: ['spells'],
    },
    equipment: {
      template: 'systems/gurps/templates/actor/parts/equipment.hbs',
      classes: ['equipment'],
    },
    resources: {
      template: 'systems/gurps/templates/actor/parts/resources.hbs',
      classes: ['resources'],
    },
  }

  /* ---------------------------------------- */

  // TODO: finish
  static override TABS: Record<string, api.Application.TabsConfiguration> = {
    primary: {
      tabs: [
        { id: 'combat', label: 'Combat', cssClass: '' },
        { id: 'personal', label: 'Personal', cssClass: '' },
        { id: 'traits', label: 'Traits', cssClass: '' },
        { id: 'skills', label: 'Skills', cssClass: '' },
        { id: 'spells', label: 'Spells', cssClass: '' },
        { id: 'equipment', label: 'Equipment', cssClass: '' },
        { id: 'resources', label: 'Resources', cssClass: '' },
      ],
      initial: 'combat',
    },
  }

  /* ---------------------------------------- */

  protected override _mode: (typeof GurpsCharacterSheet.MODES)[keyof typeof GurpsCharacterSheet.MODES] =
    GurpsCharacterSheet.MODES.PLAY

  /* ---------------------------------------- */

  protected override async _onRender(
    context: DeepPartial<api.Application.RenderContext>,
    options: DeepPartial<api.Application.RenderOptions>
  ): Promise<void> {
    super._onRender(context, options)
    GURPS.SetLastActor(this.document)
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<api.Application.RenderOptions> & { isFirstRender: boolean }
  ) {
    const context = await super._prepareContext(options)

    console.log(this.tabGroups)

    Object.assign(context, {
      tabGroups: this.tabGroups,
      systemFields: this.document.system.schema.fields,
      // Used for range table in combat tab
      ranges: GURPS.rangeObject.ranges,
      ...this._prepareAttributes(),
    })

    console.log(context)
    return context
  }

  /* ---------------------------------------- */

  protected override async _preparePartContext(
    partId: string,
    // HACK: Render context doesn't seem to be defined correctly,
    // TODO: deal with later.
    context: api.Application.RenderContextOf<this> & any,
    _options: DeepPartial<api.HandlebarsApplicationMixin.RenderOptions>
  ): Promise<api.Application.RenderContextOf<this>> {
    if (partId in context.tabs) context.tab = context.tabs[partId]

    return context
  }

  /* ---------------------------------------- */

  protected _prepareAttributes() {
    const primaryAttributes = (['ST', 'DX', 'IQ', 'HT'] as const).map(attr => {
      return {
        key: attr,
        label: `${game.i18n?.localize('GURPS.attributes' + attr)} (${game.i18n?.localize('GURPS.attributes' + attr + 'NAME')})`,
        ...this.document.system.attributes[attr],
        fields: this.document.system.schema.fields.attributes.fields[attr].fields,
      }
    })
    return {
      primaryAttributes,
    }
  }

  /* ---------------------------------------- */
  /*  Actions                                 */
  /* ---------------------------------------- */

  /**
   * Toggle Edit vs. Play mode
   * @param event   The originating click event
   * @param target   The capturing HTML element which defined a [data-action]
   */
  static async #toggleMode(this: GurpsCharacterSheet, _event: PointerEvent, _target: HTMLElement) {
    if (!this.isEditable) {
      console.error("GURPS | You can't switch to Edit mode if the sheet is uneditable")
      return
    }
    this._mode = this.isPlayMode ? GurpsCharacterSheet.MODES.EDIT : GurpsCharacterSheet.MODES.PLAY
    this.render()
  }

  /* ---------------------------------------- */

  // TODO: Disconnect applying global modifiers from parselink or any OTF functionality.
  // We should be able to ascertain what a function does from within the function.
  // This is a long-term goal. - MT
  static async #applyGlobalModifier(this: GurpsCharacterSheet, event: PointerEvent, target: HTMLElement) {
    const otfAction = GURPS.parselink(target.innerText, target.dataset.comment ?? '').action
    if (!otfAction) return

    return GURPS.performAction(otfAction, this.document, event)
  }
}

/* ---------------------------------------- */

interface GurpsCharacterSheet {
  get document(): Actor.OfType<'character'>
}
export { GurpsCharacterSheet }
