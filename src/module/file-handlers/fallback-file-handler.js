class FallbackFile {
  constructor(file) {
    this.file = file
    this.name = file.name
    this.path = file.webkitRelativePath !== '' ? file.webkitRelativePath : file.name
  }
  async text() {
    return this.file.text()
  }
}

class FallbackFolder {
  constructor(files, name) {
    this._files = files
    this.name = name ?? files[0].path.split('/')[0]
  }
  async files(extensions) {
    return extensions ? this._files.filter(file => extensions.some(ext => file.name.endsWith(ext))) : this._files
  }
}

export class FallbackFileHandler {
  static async _getFileOrFolder({ template, templateOptions = {}, mode, extensions = [] }) {
    const inputElement =
      mode === 'file'
        ? `<input id="inputFiles" type="file" accept="${extensions}" />`
        : `<input id="inputFiles" type="file" webkitdirectory mozdirectory />`
    const content = template({ inputElement, ...templateOptions })

    return new Promise((resolve, reject) => {
      foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize('GURPS.import') },
        content: content,
        ok: {
          label: 'GURPS.import',
          icon: 'fas fa-save',
          callback: (event, button, dialog) => {
            const html = dialog.element
            const inputElementObject = html.querySelector('#inputFiles')

            if (!(inputElementObject instanceof HTMLInputElement)) return reject(`can't find input element`)
            if (!inputElementObject.files) return reject(`input element isn't file input`)

            let files = Array.from(inputElementObject.files)

            files =
              extensions.length > 0 ? files.filter(file => extensions.some(ext => file.name.endsWith(ext))) : files

            if (files.length === 0) {
              reject('no files with the correct extensions were chosen')
            } else {
              resolve(files.map(file => new FallbackFile(file)))
            }
          },
        },
      })
    })
  }

  static async getFile({ template, templateOptions = {}, extensions = [] }) {
    return (await this._getFileOrFolder({ template, templateOptions, mode: 'file', extensions }))[0]
  }

  static async getFolder({ template, templateOptions = {} }) {
    return new FallbackFolder(await this._getFileOrFolder({ template, templateOptions, mode: 'folder' }))
  }
}
