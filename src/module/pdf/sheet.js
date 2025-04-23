export class PDFViewerSheet extends DocumentSheet {
  pageNumber = 1

  constructor(object, options = { pageNumber: 1 }) {
    super(object, options)
    this.pageNumber = options.pageNumber
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['gcs', 'pdf'],
      width: 630,
      height: 900,
      resizable: true,
      popOut: true,
    })
  }

  get template() {
    return `systems/gurps/templates/pdf/view.hbs`
  }

  get title() {
    return this.object.name
  }

  _getPDFData() {
    const params = new URLSearchParams()
    if (this.object.src) {
      const src = URL.parseSafe(this.object.src) ? this.object.src : foundry.utils.getRoute(this.object.src)
      params.append('file', src)
    }
    return params
  }

  getData(options) {
    return foundry.utils.mergeObject(super.getData(options), {
      pageNumber: this.pageNumber,
      params: this._getPDFData(),
    })
  }
}
