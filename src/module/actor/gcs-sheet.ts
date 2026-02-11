import { GurpsBaseActorSheet } from './base-actor-sheet.ts'

import ActorSheet = gurps.applications.ActorSheet

const systemPath = (part: string) => `systems/${GURPS.SYSTEM_NAME}/templates/actor/${part}`

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
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
