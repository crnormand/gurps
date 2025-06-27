import { GurpsActorSheet } from './actor-sheet.js'
import api = foundry.applications.api
import { DeepPartial } from 'fvtt-types/utils'

class GurpsCharacterSheet extends GurpsActorSheet {
  static override DEFAULT_OPTIONS: api.DocumentSheet.DefaultOptions = {
    tag: 'form',
    classes: ['character'],
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: 'systems/gurps/templates/actor/parts/header.hbs',
      classes: ['header'],
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
      tabs: [{ id: 'combat', label: 'Combat' }],
      initial: 'combat',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<api.Application.RenderOptions> & { isFirstRender: boolean }
  ) {
    const context = await super._prepareContext(options)
    console.log(context)
    return context
  }

  /* ---------------------------------------- */
}

/* ---------------------------------------- */

export { GurpsCharacterSheet }
