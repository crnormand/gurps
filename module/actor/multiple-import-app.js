import { i18n } from '../../lib/utilities.js'

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

    // Log the list of files
    console.log('Files in directory:', files)

    if (files.length === 0) {
      return ui.notifications.error(i18n('GURPS.importEmptyDirectory'))
    }

    new MultipleImportForm(files).render(true)
  })

  html.find('.directory-footer').append(button)
}

class MultipleImportForm extends Application {
  static getSource(filename) {
    if (filename.endsWith('.gcs')) return 'GCS'
    else return 'GCA'
  }

  constructor(files, options = {}) {
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
        source: MultipleImportForm.getSource(files[ii]),
        version: null,
        onImport: actor ? 'update' : 'create',
      })
    }

    this.data.files.sort((a, b) => a.file.localeCompare(b.file))
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

    if (target.dataset.action === 'select-all') {
      const isChecked = target.checked
      this.data.selectAll = isChecked
      for (const ii in this.data.files) {
        this.data.files[ii].selected = isChecked
      }
      return this.render(true)
    }

    if (target.dataset.action === 'select') {
      const isChecked = target.checked
      const index = parseInt(target.dataset.filelistId)
      this.data.files[index].selected = isChecked
      return this.render(true)
    }
  }

  async _onFilelistChange(event) {
    event.preventDefault()
    const target = event.currentTarget

    if (target.dataset.action === 'import') {
      const index = parseInt(target.dataset.filelistId)
      const value = target.value
      this.data.files[index].onImport = value
      return this.render(true)
    }
  }

  /** @override */
  async _updateObject(event, formData) {
    // Handle form submission
    console.log('Form submitted with data:', formData)
    console.log('Selected files:', this.files)
  }
}
