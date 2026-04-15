import { Application, DeepPartial, HandlebarsApplicationMixin, ItemSheet } from '@gurps-types/foundry/index.js'
import { Action } from '@module/action/index.js'
import { bindInlineEdit } from '@module/actor/sheets/modern/inline-edit-handler.js'
import GurpsWiring from '@module/gurps-wiring.js'
import { getGame } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'

import { ItemType } from '../types.js'

import { GurpsBaseItemSheet } from './base-item-sheet.js'

/* ---------------------------------------- */

namespace GurpsItemModernSheet {
  export type Type = ItemType.Trait | ItemType.Skill | ItemType.Spell | ItemType.Equipment

  /* ---------------------------------------- */

  export interface RenderContext extends ItemSheet.RenderContext {
    item: Item.OfType<Type>
    system: Item.SystemOfType<Type>
    systemFields?: foundry.data.fields.SchemaField<
      foundry.abstract.DataModel.SchemaOf<Item.SystemOfType<Type>>
    >['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<
      foundry.abstract.DataModel.SchemaOf<Item.SystemOfType<Type>>
    >
    tab?: Application.Tab
    detailsPartial: string[]
    actions: Action.Any[]
  }
}

/* ---------------------------------------- */

class GurpsItemModernSheet extends GurpsBaseItemSheet<
  GurpsItemModernSheet.Type,
  ItemSheet.Configuration,
  ItemSheet.RenderOptions,
  GurpsItemModernSheet.RenderContext
> {
  static override DEFAULT_OPTIONS: GurpsBaseItemSheet.DefaultOptions = {
    classes: ['modern-item-sheet'],
    position: {
      width: 600,
      height: 600,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: systemPath('templates/item/modern/header.hbs'),
    },
    details: {
      template: systemPath('templates/item/modern/tab-details.hbs'),
      scrollable: [''],
    },
    actions: {
      template: systemPath('templates/item/modern/tab-actions.hbs'),
      scrollable: [''],
    },
    modifiers: {
      template: systemPath('templates/item/modern/tab-modifiers.hbs'),
      scrollable: [''],
    },
  }

  /* ---------------------------------------- */

  static override TABS: Record<string, Application.TabsConfiguration> = {
    primary: {
      tabs: [
        { id: 'details', label: 'GURPS.sheet.details.title', icon: 'fas fa-user' },
        { id: 'actions', label: 'GURPS.sheet.actions.title', icon: 'fas fa-swords' },
        { id: 'modifiers', label: 'GURPS.sheet.modifiers.title', icon: 'fas fa-swords' },
      ],
      initial: 'details',
    },
  }

  /* ---------------------------------------- */
  /*  Context Preparation                     */
  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ItemSheet.RenderOptions
  ): Promise<GurpsItemModernSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    return {
      ...superContext,
      item: this.item,
      system: this.item.system,
      systemFields: this.item.system.schema.fields,
      systemSource: this.item.system._source,
      detailsPartial: this.item.system.metadata.detailsPartial,
      actions: this.item.system.actions.contents,
    }
  }

  /* ---------------------------------------- */

  protected override async _preparePartContext(
    partId: string,
    context: GurpsItemModernSheet.RenderContext,
    options: DeepPartial<ItemSheet.RenderOptions>
  ): Promise<GurpsItemModernSheet.RenderContext> {
    await super._preparePartContext(partId, context, options)

    if (context.tabs && partId in context.tabs) context.tab = context.tabs[partId]

    return context
  }

  protected _getTypeContext(): { class: string; icon: string } {
    switch (this.item.type) {
      case ItemType.Trait:
        return { class: 'ms-type-trait', icon: 'fa-solid fa-theater-masks' }
      case ItemType.Skill:
        return { class: 'ms-type-skill', icon: 'fa-solid fa-person-swimming' }
      case ItemType.Spell:
        return { class: 'ms-type-spell', icon: 'fa-solid fa-wand-magic-sparkles' }
      case ItemType.Equipment:
        return { class: 'ms-type-equipment', icon: 'fa-solid fa-screwdriver-wrench' }
      default:
        return { class: '', icon: 'fa-solid fa-ban' }
    }
  }

  /* ---------------------------------------- */

  protected override async _renderFrame(options: DeepPartial<ItemSheet.RenderOptions>): Promise<HTMLElement> {
    const frame = await super._renderFrame(options)

    const titleElement = this.window.header?.querySelector('h1')

    const typeContext = this._getTypeContext()

    if (titleElement) {
      const iconHtml = document.createElement('i')

      iconHtml.classList.add(...typeContext.icon.split(' '))

      this.window.header?.insertBefore(iconHtml, titleElement)
    }

    return frame
  }

  /* ---------------------------------------- */
  /*  Non-Action Bindings                     */
  /* ---------------------------------------- */

  protected override async _onRender(
    context: DeepPartial<GurpsItemModernSheet.RenderContext>,
    options: DeepPartial<GurpsBaseItemSheet.RenderOptions>
  ): Promise<void> {
    super._onRender(context, options)
    this._applyPlaceholderText()

    const typeContext = this._getTypeContext()

    this.element.classList.add(typeContext.class)

    bindInlineEdit(this.element, {
      displaySelector: '.ms-name-display',
      containerSelector: '.ms-name-container',
      inputSelector: 'input[name="name"]',
      fieldType: 'name',
    })

    GurpsWiring.hookupAllEvents(this.element)
  }

  /* ---------------------------------------- */

  protected _applyPlaceholderText(): void {
    const affectedFields = ['bonuses', 'itemModifiers']

    for (const fieldName of affectedFields) {
      const input = this.element.querySelector(`textarea[name="system.${fieldName}"]`)

      input?.setAttribute('placeholder', getGame().i18n.localize(`GURPS.item.base.FIELDS.${fieldName}.placeholder`))
    }
  }
}

/* ---------------------------------------- */

export { GurpsItemModernSheet }
