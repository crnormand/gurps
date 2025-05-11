import { DeepPartial } from 'fvtt-types/utils'
import ApplicationV2 = foundry.applications.api.ApplicationV2
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin
import { ActorSheetGURPS } from './actor-sheet.js'
import DocumentSheetV2 from 'node_modules/fvtt-types/src/foundry/client-esm/applications/api/document-sheet.mjs'

class ActorTabbedSheetGURPS extends ActorSheetGURPS {
  static override DEFAULT_OPTIONS: DocumentSheetV2.PartialConfiguration<
    DocumentSheetV2.Configuration<Actor.Implementation>
  > &
    object = {
    id: 'sheet-tab',
    classes: ['gurps', 'sheet', 'actor', 'tabbed-sheet'],
    position: {
      width: 670,
      height: 600,
    },
  }

  /* ---------------------------------------- */

  override tabGroups: Record<string, string> = {
    primary: 'combat',
  }

  /* ---------------------------------------- */

  /**
   * @param tabs - Record of tabs to mark
   * @returns Record of tabs, with active tab marked as active
   */
  protected _markTabs(tabs: Record<string, Partial<ApplicationV2.Tab>>): Record<string, Partial<ApplicationV2.Tab>> {
    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group!] === v.id
      v.cssClass = v.active ? 'active' : ''
      if ('tabs' in v) this._markTabs(v.tabs as Record<string, ApplicationV2.Tab>)
    }
    return tabs
  }

  /* ---------------------------------------- */

  protected _getTabs(): Record<string, Partial<ApplicationV2.Tab>> {
    return this._markTabs({
      tabCombat: {
        id: 'combat',
        group: 'primary',
        icon: 'fa-solid fa-swords',
        label: 'GURPS.combatTab',
      },
      tabPersonal: {
        id: 'personal',
        group: 'primary',
        icon: 'fa-solid fa-user',
        label: 'GURPS.sheet.personal.tab',
      },
      tabAdvantages: {
        id: 'advantages',
        group: 'primary',
        icon: 'fa-solid fa-theater-masks',
        label: 'GURPS.advantagesTab',
      },
      tabSkills: {
        id: 'skills',
        group: 'primary',
        icon: 'fa-solid fa-person-swimming',
        label: 'GURPS.skillsTab',
      },
      tabStats: {
        id: 'stats',
        group: 'primary',
        icon: 'fa-solid fa-bars-progress',
        label: 'GURPS.resourcesModsTab',
      },
      tabSpells: {
        id: 'spells',
        group: 'primary',
        icon: 'fa-solid fa-wand-magic-sparkles',
        label: 'GURPS.spellsTab',
      },
      tabEquipment: {
        id: 'equipment',
        group: 'primary',
        icon: 'fa-solid fa-screwdriver-wrench',
        label: 'GURPS.equipmentTab',
      },
    })
  }

  /* ---------------------------------------- */

  static override PARTS = {
    header: {
      id: 'header',
      template: 'systems/gurps/templates/actor/parts/actor-header.hbs',
      scrollY: [''],
    },
    tabCombat: {
      id: 'combat',
      template: 'systems/gurps/templates/actor/parts/actor-combat.hbs',
    },
    tabPersonal: {
      id: 'personal',
      template: 'systems/gurps/templates/actor/parts/actor-personal.hbs',
    },
    tabAdvantages: {
      id: 'advantages',
      template: 'systems/gurps/templates/actor/parts/actor-advantages.hbs',
    },
    tabSkills: {
      id: 'skills',
      template: 'systems/gurps/templates/actor/parts/actor-skills.hbs',
    },
    tabStats: {
      id: 'stats',
      template: 'systems/gurps/templates/actor/parts/actor-stats.hbs',
    },
    tabSpells: {
      id: 'spells',
      template: 'systems/gurps/templates/actor/parts/actor-spells.hbs',
    },
    tabEquipment: {
      id: 'equipment',
      template: 'systems/gurps/templates/actor/parts/actor-equipment.hbs',
    },
    footer: {
      id: 'footer',
      template: 'systems/gurps/templates/actor/parts/actor-footer.hbs',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<DocumentSheetV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<ActorSheetGURPS.RenderContext> {
    const context = await super._prepareContext(options)
    return {
      ...context,
      tabs: this._getTabs(),
    }
  }

  /* ---------------------------------------- */

  protected override async _preparePartContext(
    partId: string,
    context: HandlebarsApplicationMixin.HandlebarsApplication.RenderContextFor<this>,
    _options: DeepPartial<HandlebarsApplicationMixin.RenderOptions>
  ): Promise<HandlebarsApplicationMixin.HandlebarsApplication.RenderContextFor<this>> {
    // @ts-expect-error: type doesn't seem to be correct
    context.partId = `${this.id}-${partId}`
    // @ts-expect-error: type doesn't seem to be correct
    context.tab = context.tabs[partId]
    return context
  }
}

export { ActorTabbedSheetGURPS }
