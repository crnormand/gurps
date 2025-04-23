class ChromiumFile {
  constructor(handle, path) {
    this.handle = handle
    this.name = handle.name
    this.path = path !== '' ? path : handle.name
  }
  async text() {
    return (await this.handle.getFile()).text()
  }
}
class ChromiumFolder {
  constructor(handle) {
    this.handle = handle
    this.name = handle.name
  }
  async files(extensions) {
    const allFiles = await this._getFiles()
    return extensions ? allFiles.filter(f => extensions.some(ext => f.name.endsWith(ext))) : allFiles
  }
  async _getFiles(handle, path) {
    path = path ?? this.name
    handle = handle ?? this.handle
    const files = []
    for await (let [name, child] of handle.entries()) {
      if (child instanceof FileSystemDirectoryHandle) {
        files.push(...(await this._getFiles(child, `${path}/${name}`)))
      } else {
        files.push(new ChromiumFile(child, `${path}/${child.name}`))
      }
    }
    return files
  }
}
export class ChromiumFileHandler {
  static File = ChromiumFile
  static Folder = ChromiumFolder
  static async _getFileOrFolder({ template, templateOptions = {}, mode, extensions = [] }) {
    const promise = new Promise((resolve, reject) => {
      const inputElement = `<button id="importButton" style="width: fit-content; line-height: 14px;">choose ${mode}</button>
    <div id="selectedFile" style="display: inline-block;">no ${mode} chosen</div>`
      const content = template({ inputElement, ...templateOptions })
      let handle
      Dialog.prompt({
        title: `Import Data`,
        content,
        label: 'Import',
        callback: () => {
          handle ? resolve(handle) : reject(`no ${mode} were chosen`)
        },
        rejectClose: false,
      })
      Hooks.once('renderDialog', dialog => {
        const fileChosenDiv = dialog.element.find('#selectedFile')
        dialog.element.find('#importButton').on('click', async () => {
          const pickerOpts = {
            types: [
              {
                description: 'Allowed',
                accept: {
                  'custom/custom': extensions,
                },
              },
            ],
            excludeAcceptAllOption: true,
            multiple: false,
          }
          if (mode === 'file') {
            handle = (await (extensions.length > 0 ? showOpenFilePicker(pickerOpts) : showOpenFilePicker()))[0]
          } else {
            handle = await showDirectoryPicker()
          }
          fileChosenDiv[0].innerText = handle.name
        })
      })
    })
    return promise
  }
  static async getFile({ template, templateOptions = {}, extensions = [] }) {
    return new ChromiumFile(await this._getFileOrFolder({ template, templateOptions, mode: 'file', extensions }), '')
  }
  static async getFolder({ template, templateOptions = {} }) {
    return new ChromiumFolder(await this._getFileOrFolder({ template, templateOptions, mode: 'folder' }))
  }
}
