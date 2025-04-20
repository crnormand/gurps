import { isEmptyObject } from "lib/utilities.js";
import * as settings from "lib/miscellaneous-settings.js";
const { api, sheets } = foundry.applications;
class GurpsActorSheetV2 extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  tabGroups = {
    // TODO: update with actual tab name
    primary: "combat"
  };
  /* -------------------------------------------- */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["gurps", "actor", "character"],
    position: {
      width: 800,
      height: 800
    },
    // @ts-expect-error v12 currently doesn't include dragDrop yet
    dragDrop: [{ dragSelector: "item-list .item", dropSelector: null }]
  };
  /* -------------------------------------------- */
  static PARTS = {
    header: {
      id: "header",
      template: `systems/gurps/templates/actors/parts/character-header.hbs`
    },
    combatTab: {
      id: "combat",
      template: `systems/gurps/templates/actors/tabs/character-combat.hbs`
    },
    personalTab: {
      id: "personal",
      template: `systems/gurps/templates/actors/tabs/character-personal.hbs`
    },
    traitsTab: {
      id: "traits",
      template: `systems/gurps/templates/actors/tabs/character-traits.hbs`
    },
    skillsTab: {
      id: "skills",
      template: `systems/gurps/templates/actors/tabs/character-skills.hbs`
    },
    resourcesTab: {
      id: "resources",
      template: `systems/gurps/templates/actors/tabs/character-resources.hbs`
    },
    equipmentTab: {
      id: "equipment",
      template: `systems/gurps/templates/actors/tabs/character-equipment.hbs`
    }
  };
  /* -------------------------------------------- */
  _getTabs() {
    return this._markTabs({
      combatTab: {
        id: "combat",
        group: "primary",
        icon: "fa-solid fa-swords"
      },
      personalTab: {
        id: "personal",
        group: "primary",
        icon: "fa-solid fa-user"
      },
      traitsTab: {
        id: "traits",
        group: "primary",
        icon: "fa-solid fa-theater-masks"
      },
      skillsTab: {
        id: "combat",
        group: "primary",
        icon: "fa-solid fa-person-swimming"
      },
      resourcesTab: {
        id: "resources",
        group: "primary",
        icon: "fa-solid fa-bars-progress"
      },
      equipmentTab: {
        id: "equipment",
        group: "primary",
        icon: "fa-solid fa-screwdeiver-wrench"
      }
    });
  }
  /* -------------------------------------------- */
  _markTabs(tabs) {
    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group] === v.id;
      v.cssClass = v.active ? "active" : "";
      if ("tabs" in v) this._markTabs(v.tabs);
    }
    return tabs;
  }
  /* -------------------------------------------- */
  async _prepareContext(options) {
    const primaryTabs = Object.fromEntries(Object.entries(this.tabGroups).filter(([, v]) => v === "primary"));
    const sheetData = await super._prepareContext(options);
    sheetData.oldData = sheetData.data;
    let actions = {};
    if (!this.actor.system.conditions.actions?.maxActions) actions["maxActions"] = 1;
    if (!this.actor.system.conditions.actions?.maxBlocks) actions["maxBlocks"] = 1;
    if (Object.keys(actions).length > 0) this.actor.internalUpdate({ "system.conditions.actions": actions });
    sheetData.ranges = GURPS.rangeObject.ranges;
    sheetData.useCI = GURPS.ConditionalInjury.isInUse();
    sheetData.conditionalEffectsTable = GURPS.ConditionalInjury.conditionalEffectsTable();
    sheetData.eqtsummary = this.actor.system.eqtsummary;
    sheetData.navigateBar = {
      visible: game.settings?.get(settings.SYSTEM_NAME, settings.SETTING_SHOW_SHEET_NAVIGATION),
      hasMelee: !isEmptyObject(this.actor.system.melee),
      hasRanged: !isEmptyObject(this.actor.system.ranged),
      hasSpells: !isEmptyObject(this.actor.system.spells),
      hasOther: !isEmptyObject(this.actor.system?.equipment?.other)
    };
    sheetData.isGM = game.user?.isGM;
    sheetData._id = sheetData.olddata._id;
    sheetData.effects = this.actor.getEmbeddedCollection("ActiveEffect").contents;
    sheetData.useQN = game.settings?.get(settings.SYSTEM_NAME, settings.SETTING_USE_QUINTESSENCE);
    sheetData.toggleQnotes = this.actor.getFlag("gurps", "qnotes");
    GURPS.SetLastActor(this.actor);
    return {
      tabs: this._getTabs(),
      primaryTabs,
      actor: this.actor,
      system: this.actor.system
    };
  }
  /* -------------------------------------------- */
  async close(options) {
    GURPS.ClearLastActor(this.actor);
    return super.close(options);
  }
  /* -------------------------------------------- */
  async _preparePartContext(partId, context, _options) {
    ;
    context.partId = `${this.id}-${partId}`;
    context.tab = context.tabs[partId];
    return context;
  }
}
export {
  GurpsActorSheetV2
};
