import { GurpsBaseActorSheet } from './base-actor-sheet.ts'

import ActorSheet = gurps.applications.ActorSheet

type CharacterV2Schema = foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>

namespace GurpsActorGcsSheet {
  export interface RenderContext extends ActorSheet.RenderContext {
    actor: Actor.OfType<'characterV2'>
    system: Actor.SystemOfType<'characterV2'>
    systemFields?: foundry.data.fields.SchemaField<CharacterV2Schema>['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<CharacterV2Schema>
  }
}

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<'characterV2'>() {
  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: ActorSheet.Configuration = {
    classes: ['gcs-sheet'],
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, gurps.applications.handlebars.TemplatePart> = {
    header: {
      template: this.systemPath('gcs/header.hbs'),
    },
    resources: {
      template: this.systemPath('gcs/resources.hbs'),
    },
    // weapons: {
    //   template: this.systemPath('gcs/weapons.hbs'),
    // },
    // traits: {
    //   template: this.systemPath('gcs/traits.hbs'),
    // },
    // skills: {
    //   template: this.systemPath('gcs/skills.hbs'),
    // },
    // spells: {
    //   template: this.systemPath('gcs/spells.hbs'),
    // },
    // equipment: {
    //   template: this.systemPath('gcs/equipment.hbs'),
    // },
    // notes: {
    //   template: this.systemPath('gcs/notes.hbs'),
    // },
    // footer: {
    //   template: this.systemPath('gcs/footer.hbs'),
    // },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ActorSheet.RenderOptions
  ): Promise<GurpsActorGcsSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    return {
      ...superContext,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      systemSource: this.actor.system._source,
    }
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
