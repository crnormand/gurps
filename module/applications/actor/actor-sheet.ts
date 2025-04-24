import { DeepPartial } from 'fvtt-types/utils'
import { ActorSheetTabs } from './helpers'

namespace GurpsActorSheetV2 {
  export type RenderContext = {}
}

class GurpsActorSheetV2 extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  override tabGroups: Record<string, string> = {
    primary: ActorSheetTabs.combat,
  }

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
      // @ts-expect-error v12 currently doesn't include dragDrop yet
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
      tabs: this._getTabs(),
      primaryTabs,
      isGM: game.user?.isGM ?? false,
      actor: this.actor,
      system: this.actor.system,
    }
  }
}

export { GurpsActorSheetV2 }
