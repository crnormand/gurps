export class MarkdownUtil {
  static converter = new globalThis.showdown.Converter({
    tables: true,
    strikethrough: true,
    html: false,
  })

  /* ---------------------------------------- */

  static toHTML(markdown?: string | null): Handlebars.SafeString {
    return new Handlebars.SafeString(`<div class="gcs-markdown">` + this.converter.makeHtml(markdown ?? '') + '</div>')
  }
}
