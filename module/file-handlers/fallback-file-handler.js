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
    return extensions ? this._files.filter(f => extensions.some(ext => f.name.endsWith(ext))) : this._files
  }
}
export class FallbackFileHandler {
  static async _getFileOrFolder({ template, templateOptions = {}, mode, extensions = [] }) {
    const inputElement =
      mode === 'file'
        ? `<input id="inputFiles" type="file" accept="${extensions}" />`
        : `<input id="inputFiles" type="file" webkitdirectory mozdirectory />`
    const content = template({ inputElement, ...templateOptions })
    const promise = new Promise((resolve, reject) => {
      Dialog.prompt({
        title: `Import Data`,
        content,
        label: 'Import',
        callback: html => {
          const inputElementObject = html.find('#inputFiles')[0]
          if (!(inputElementObject instanceof HTMLInputElement)) return reject(`can't find input element`)
          if (!inputElementObject.files) return reject(`input element isn't file input`)
          let files = Array.from(inputElementObject.files)
          files = extensions.length > 0 ? files.filter(f => extensions.some(ext => f.name.endsWith(ext))) : files
          files.length !== 0
            ? resolve(files.map(f => new FallbackFile(f)))
            : reject('no files with the correct extensions were chosen')
        },
        rejectClose: false,
      })
    })
    return promise
  }
  static async getFile({ template, templateOptions = {}, extensions = [] }) {
    return (await this._getFileOrFolder({ template, templateOptions, mode: 'file', extensions }))[0]
  }
  static async getFolder({ template, templateOptions = {} }) {
    return new FallbackFolder(await this._getFileOrFolder({ template, templateOptions, mode: 'folder' }))
  }
}
