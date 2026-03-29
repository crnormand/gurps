import { DeepPartial, HandlebarsApplicationMixin, ItemSheet, Application } from '@gurps-types/foundry/index.js'
import { bindInlineEdit } from '@module/actor/modern/inline-edit-handler.js'
import GurpsWiring from '@module/gurps-wiring.js'
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
  }
}

/* ---------------------------------------- */

class GurpsItemModernSheet extends GurpsBaseItemSheet<
  GurpsItemModernSheet.Type,
  ItemSheet.Configuration,
  ItemSheet.RenderOptions,
  GurpsItemModernSheet.RenderContext
>() {
  static override DEFAULT_OPTIONS: ItemSheet.DefaultOptions<GurpsBaseItemSheet.Configuration> = {
    classes: ['modern-item-sheet'],
    position: {
      width: 600,
      height: 400,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: systemPath('templates/item/modern/header.hbs'),
    },
    details: {
      template: systemPath('templates/item/modern/tab-details.hbs'),
    },
    actions: {
      template: systemPath('templates/item/modern/tab-actions.hbs'),
    },
    modifiers: {
      template: systemPath('templates/item/modern/tab-modifiers.hbs'),
    },
  }

  /* ---------------------------------------- */

  static override TABS: Record<string, Application.TabsConfiguration> = {
    primary: {
      tabs: [
        { id: 'details', label: 'Details', icon: 'fas fa-user' },
        { id: 'actions', label: 'Actions', icon: 'fas fa-swords' },
        { id: 'modifiers', label: 'Modifiers', icon: 'fas fa-swords' },
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

  /* ---------------------------------------- */

  protected override async _renderFrame(options: DeepPartial<ItemSheet.RenderOptions>): Promise<HTMLElement> {
    const frame = await super._renderFrame(options)

    const getTypeContent = (type: Item.SubType): { class: string; icon: string } => {
      switch (type) {
        case ItemType.Trait:
          return { class: 'header-trait', icon: 'fa-solid fa-theater-masks' }
        case ItemType.Skill:
          return { class: 'header-skill', icon: 'fa-solid fa-person-swimming' }
        case ItemType.Spell:
          return { class: 'header-spell', icon: 'fa-solid fa-wand-magic-sparkles' }
        case ItemType.Equipment:
          return { class: 'header-equipment', icon: 'fa-solid fa-screwdriver-wrench' }
        default:
          return { class: '', icon: 'fa-solid fa-ban' }
      }
    }

    const typeContent = getTypeContent(this.document.type)

    this.window.header?.classList.add(typeContent.class)

    const titleElement = this.window.header?.querySelector('h1')

    if (titleElement) {
      const iconHtml = document.createElement('i')

      iconHtml.classList.add(...typeContent.icon.split(' '))

      this.window.header?.insertBefore(iconHtml, titleElement)
    }

    return frame
  }

  /* ---------------------------------------- */
  /*  Non-Action Bindings                     */
  /* ---------------------------------------- */

  protected override async _onRender(
    context: GurpsItemModernSheet.RenderContext,
    options: ItemSheet.RenderOptions
  ): Promise<void> {
    super._onRender(context, options)

    bindInlineEdit(this.element, {
      displaySelector: '.ms-name-display',
      containerSelector: '.ms-name-container',
      inputSelector: 'input[name="name"]',
      fieldType: 'name',
    })

    GurpsWiring.hookupAllEvents(this.element)
  }

  /* ---------------------------------------- */

  protected override async _onFirstRender(
    context: GurpsItemModernSheet.RenderContext,
    options: ItemSheet.RenderOptions
  ): Promise<void> {
    super._onFirstRender(context, options)
  }
}

/* ---------------------------------------- */

export { GurpsItemModernSheet }
