import { GurpsActorSheet } from './actor-sheet.js'
import api = foundry.applications.api
import { AnyObject, DeepPartial } from 'fvtt-types/utils'
import { htmlClosest } from '../../utilities/dom.js'
import { JournalEntry } from '../../journal-entry/index.js'
import { BaseItemModel } from '../../item/data/base.js'

class GurpsCharacterSheet extends GurpsActorSheet {
  static override DEFAULT_OPTIONS: api.DocumentSheet.DefaultOptions & AnyObject = {
    tag: 'form',
    classes: ['character'],
    actions: {
      toggleMode: this.#toggleMode,
      applyGlobalModifier: this.#applyGlobalModifier,
      toggleOpen: this.#toggleOpen,
      toggleEquipped: this.#toggleEquipped,
      openPageReference: this.#openPageReference,
      openItemContextMenu: this.#openItemContextMenu,
      editItem: this.#editItem,
      deleteItem: this.#deleteItem,
      rollOtf: this.#rollOtf,
      useItem: this.#useItem,
    },
    position: {
      width: 750,
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
      scrollable: [''],
    },
    personal: {
      template: 'systems/gurps/templates/actor/parts/personal.hbs',
      classes: ['personal'],
      scrollable: [''],
    },
    traits: {
      template: 'systems/gurps/templates/actor/parts/traits.hbs',
      classes: ['traits'],
      scrollable: [''],
    },
    skills: {
      template: 'systems/gurps/templates/actor/parts/skills.hbs',
      classes: ['skills'],
      scrollable: [''],
    },
    spells: {
      template: 'systems/gurps/templates/actor/parts/spells.hbs',
      classes: ['spells'],
      scrollable: [''],
    },
    equipment: {
      template: 'systems/gurps/templates/actor/parts/equipment.hbs',
      classes: ['equipment'],
      scrollable: [''],
    },
    resources: {
      template: 'systems/gurps/templates/actor/parts/resources.hbs',
      classes: ['resources'],
      scrollable: [''],
    },
  }

  /* ---------------------------------------- */

  static override TABS: Record<string, api.Application.TabsConfiguration> = {
    primary: {
      tabs: [
        { id: 'combat', cssClass: '' },
        { id: 'personal', cssClass: '' },
        { id: 'traits', cssClass: '' },
        { id: 'skills', cssClass: '' },
        { id: 'spells', cssClass: '' },
        { id: 'equipment', cssClass: '' },
        { id: 'resources', cssClass: '' },
      ],
      initial: 'equipment',
      labelPrefix: 'GURPS.Actor.Character.Tabs',
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
    if (this._mode === GurpsCharacterSheet.MODES.PLAY) this._disableFields()
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<api.Application.RenderOptions> & { isFirstRender: boolean }
  ) {
    const context = await super._prepareContext(options)

    Object.assign(context, {
      tabGroups: this.tabGroups,
      systemFields: this.document.system.schema.fields,
      // Used for range table in combat tab
      ranges: GURPS.rangeObject.ranges,
      ...this._prepareAttributes(),
      ...this._prepareItems(),
    })

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

  protected override _prepareTabs(group: string): Record<string, api.Application.Tab> {
    const tabs = super._prepareTabs(group)
    if (group === 'primary' && this._mode === GurpsCharacterSheet.MODES.PLAY) {
      if (this.document.system.ads.length === 0) delete tabs.traits
      if (this.document.system.skills.length === 0) delete tabs.skills
      if (this.document.system.spells.length === 0) delete tabs.spells
      if (this.document.system.allEquipment.length === 0) delete tabs.spells
    }

    return tabs
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

  protected _prepareItems() {
    const traits = this.document.system.ads.filter(item => !item.isContained)
    const skills = this.document.system.skills.filter(item => !item.isContained)
    const spells = this.document.system.spells.filter(item => !item.isContained)
    const carriedEquipment = this.document.system.equipment.carried.filter(item => !item.isContained)
    const otherEquipment = this.document.system.equipment.other.filter(item => !item.isContained)

    return {
      traits,
      skills,
      spells,
      carriedEquipment,
      otherEquipment,
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

  /* ---------------------------------------- */

  static async #toggleOpen(this: GurpsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const itemId = htmlClosest(target, '[data-item-id]')?.dataset.itemId
    if (!itemId) return

    const item = this.document.items.get(itemId)
    if (!item || !(item.system instanceof BaseItemModel)) return
    const isOpen = (item.system as BaseItemModel).open
    // @ts-expect-error: Not sure why key is not recognised
    await item.update({ 'system.open': !isOpen })
  }

  /* ---------------------------------------- */

  static async #toggleEquipped(this: GurpsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const itemId = htmlClosest(target, '[data-item-id]')?.dataset.itemId
    if (!itemId) return

    const item = this.document.items.get(itemId)
    if (!item || !item.isOfType('equipment')) return
    const isEquipped = item.system.eqt.equipped
    // @ts-expect-error: Not sure why key is not recognised
    await item.update({ 'system.eqt.equipped': !isEquipped })
  }

  /* ---------------------------------------- */

  static #openPageReference(this: GurpsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const pageReference = target.dataset.reference
    if (!pageReference) return
    return JournalEntry.handlePdf(pageReference)
  }

  /* ---------------------------------------- */

  // TODO: Implement a context menu for items.
  static #openItemContextMenu(this: GurpsCharacterSheet, _event: PointerEvent, _target: HTMLElement) {}

  /* ---------------------------------------- */

  static async #editItem(this: GurpsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const itemId = htmlClosest(target, '[data-item-id]')?.dataset.itemId
    if (!itemId) return

    const item = this.document.items.get(itemId)
    if (!item) return

    await item.sheet?.render(true)
  }

  /* ---------------------------------------- */

  static async #deleteItem(this: GurpsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const itemId = htmlClosest(target, '[data-item-id]')?.dataset.itemId
    if (!itemId) return

    const item = this.document.items.get(itemId)
    if (!item) return

    await item.deleteDialog()
  }

  /* ---------------------------------------- */

  static async #rollOtf(this: GurpsCharacterSheet, event: PointerEvent, target: HTMLElement) {
    const otfAction = GURPS.parselink(target.dataset.otf ?? '').action
    console.log(otfAction)
    if (!otfAction) return

    return GURPS.performAction(otfAction, this.document, event)
  }

  /* ---------------------------------------- */

  static async #useItem(this: GurpsCharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const itemId = htmlClosest(target, '[data-item-id]')?.dataset.itemId
    if (!itemId) return

    const item = this.document.items.get(itemId)
    if (!item) return

    const action = target.dataset.type

    await item.system.use({ action })
  }
}

/* ---------------------------------------- */

interface GurpsCharacterSheet {
  get document(): Actor.OfType<'character'>
}
export { GurpsCharacterSheet }
