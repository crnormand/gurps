import { GurpsBaseActorSheet } from './base-actor-sheet.ts'

import ActorSheet = gurps.applications.ActorSheet

type CharacterV2Schema = foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>

namespace GurpsActorGcsSheet {
  export interface RenderContext extends ActorSheet.RenderContext {
    actor: Actor.OfType<'characterV2'>
    system: Actor.SystemOfType<'characterV2'>
    systemFields?: foundry.data.fields.SchemaField<CharacterV2Schema>['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<CharacterV2Schema>
    moveModeChoices?: Record<string, string>
  }
}

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<'characterV2'>() {
  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: ActorSheet.Configuration = {
    classes: ['gcs-sheet'],
    position: {
      width: 800,
      height: 800,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, gurps.applications.handlebars.TemplatePart> = {
    header: {
      template: this.systemPath('gcs/header.hbs'),
    },
    resources: {
      template: this.systemPath('gcs/resources.hbs'),
    },
    combat: {
      template: this.systemPath('gcs/combat.hbs'),
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ActorSheet.RenderOptions
  ): Promise<GurpsActorGcsSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    const moveModeChoices = Object.fromEntries(this.actor.system.moveV2.map(mode => [mode._id, mode.mode]))

    return {
      ...superContext,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      systemSource: this.actor.system._source,
      moveModeChoices,
    }
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
