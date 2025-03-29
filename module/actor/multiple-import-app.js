import { i18n } from '../../lib/utilities.js'
import { ActorImporter } from './actor-importer.js'
import { GurpsActor } from './actor.js'

export const AddMultipleImportButton = function (html) {
  let button = $(
    `<button class="mass-import"><i class="fas fa-file-import"></i>${i18n('GURPS.importMultiple')}</button>`
  )

  button.click(async () => {
    const dirHandle = await window.showDirectoryPicker()

    // Create an array to hold the file names
    const files = []

    // Iterate through the directory entries
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        files.push(entry.name)
      }
    }

    if (files.length === 0) {
      return ui.notifications.error(i18n('GURPS.importEmptyDirectory'))
    }

    new MultipleImportApp(dirHandle, files).render(true)
  })

  html.find('.directory-footer').append(button)
}

class MultipleImportApp extends Application {
  static getSource(filename) {
    if (filename.endsWith('.gcs')) return 'GCS'
    else return 'GCA'
  }

  constructor(dirHandle, files, options = {}) {
    super(options)

    this.data = {
      selectAll: false,
      choices: { create: 'GURPS.importCreate', update: 'GURPS.importUpdate', replace: 'GURPS.importReplace' },
      files: [],
    }
    for (const ii in files) {
      const actor = game.actors.find(it => it.system.additionalresources.importname === files[ii])
      this.data.files.push({
        selected: false,
        file: files[ii],
        actor: actor,
        source: MultipleImportApp.getSource(files[ii]),
        version: null,
        onImport: actor ? 'update' : 'create',
      })
    }

    this.data.files.sort((a, b) => a.file.localeCompare(b.file))
    this.dirHandle = dirHandle
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'multiple-import-form',
      title: i18n('GURPS.importMultipleActors'),
      template: 'systems/gurps/templates/actor/import-multiple-file-list.hbs',
      popOut: true,
      width: 'auto',
      height: 'auto',
      minimizable: true,
      jQuery: true,
      resizable: true,
    })
  }

  getData() {
    return this.data
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('.filelist-control').on('click', this._onFilelistClick.bind(this))
    html.find('.filelist-control').on('change', this._onFilelistChange.bind(this))
  }

  async _onFilelistClick(event) {
    event.preventDefault()
    const target = event.currentTarget
    const isChecked = target.checked
    const index = parseInt(target.dataset.filelistId)

    switch (target.dataset.action) {
      case 'select-all':
        this.data.selectAll = isChecked
        for (const ii in this.data.files) {
          this.data.files[ii].selected = isChecked
        }
        return this.render(true)

      case 'select':
        this.data.files[index].selected = isChecked
        return this.render(true)

      case 'import': {
        // Import the selected files
        const selectedFiles = this.data.files.filter(it => it.selected)
        if (selectedFiles.length === 0) {
          return ui.notifications.error(i18n('GURPS.importNoFilesSelected'))
        }
        this._importFiles(selectedFiles)
        return this.close()
      }

      case 'cancel':
        this.close()
    }
  }

  async _onFilelistChange(event) {
    event.preventDefault()
    const target = event.currentTarget

    if (target.dataset.action === 'option') {
      const index = parseInt(target.dataset.filelistId)
      const file = this.data.files[index]

      const value = target.value
      file.onImport = file.actor ? value : 'create'
      return this.render(true)
    }
  }

  async _importFiles(files) {
    for (const file of files) {
      let actor = file.actor
      const onImport = file.onImport

      // If Create or Replace, create a new actor.
      if (onImport === 'replace' || onImport === 'create') {
        actor = await GurpsActor.create(
          {
            name: file.file,
            type: 'character',
          },
          { renderSheet: false }
        )
      }

      // Load the file.
      const fileHandle = await this.dirHandle.getFileHandle(file.file)
      const fileObject = await fileHandle.getFile()
      const text = await GURPS.readTextFromFile(fileObject)

      // Import the actor.
      const importer = new ActorImporter(actor)
      await importer.importActorFromExternalProgram(text, fileObject.name, await this.getDirectoryPath(this.dirHandle))

      // If Replace, delete the old actor.
      if (onImport === 'replace') {
        await file.actor.delete()
      }
    }
  }

  async getDirectoryPath(dirHandle) {
    let path = dirHandle.name
    let currentHandle = dirHandle

    while (currentHandle.parent) {
      currentHandle = await currentHandle.parent
      path = `${currentHandle.name}/${path}`
    }

    return path
  }
}
