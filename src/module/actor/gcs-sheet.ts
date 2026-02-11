import { GurpsBaseActorSheet } from './base-actor-sheet.ts'

import ActorSheet = gurps.applications.ActorSheet

const systemPath = (part: string) => `systems/${GURPS.SYSTEM_NAME}/templates/actor/${part}`

type CharacterV2Schema = foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>

namespace GurpsActorGcsSheet {
  export interface RenderContext extends ActorSheet.RenderContext {
    systemFields?: foundry.data.fields.SchemaField<CharacterV2Schema>['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<CharacterV2Schema>
  }
}

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<'characterV2'>() {
  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: ActorSheet.Configuration = {}

  /* ---------------------------------------- */

  static override PARTS: Record<string, gurps.applications.handlebars.TemplatePart> = {
    header: {
      template: systemPath('gcs/header.hbs'),
    },
    resources: {
      template: systemPath('gcs/resources.hbs'),
    },
    weapons: {
      template: systemPath('gcs/weapons.hbs'),
    },
    traits: {
      template: systemPath('gcs/traits.hbs'),
    },
    skills: {
      template: systemPath('gcs/skills.hbs'),
    },
    spells: {
      template: systemPath('gcs/spells.hbs'),
    },
    equipment: {
      template: systemPath('gcs/equipment.hbs'),
    },
    notes: {
      template: systemPath('gcs/notes.hbs'),
    },
    footer: {
      template: systemPath('gcs/footer.hbs'),
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ActorSheet.RenderOptions
  ): Promise<GurpsActorGcsSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    return {
      ...superContext,
      systemFields: this.actor.system.schema.fields,
      systemSource: this.actor.system._source,
    }
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
