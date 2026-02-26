class GurpsCompendiumDirectory extends foundry.applications.sidebar.tabs.CompendiumDirectory {
  static override DEFAULT_OPTIONS = {
    actions: {
      importItems: GurpsCompendiumDirectory.#onImportItems,
    },
  }

  static override PARTS = {
    header: {
      // Only real change
      template: 'systems/gurps/templates/sidebar/tabs/compendiums.hbs',
    },
    directory: {
      template: 'templates/sidebar/directory/directory.hbs',
      templates: ['templates/sidebar/partials/folder-partial.hbs', 'templates/sidebar/partials/pack-partial.hbs'],
      scrollable: [''],
    },
    footer: {
      template: 'templates/sidebar/directory/footer.hbs',
    },
  }

  static async #onImportItems(this: GurpsCompendiumDirectory, event: PointerEvent): Promise<void> {
    event.preventDefault()

    await GURPS.modules.Importer.itemImporterPrompt()
  }
}

export { GurpsCompendiumDirectory }
