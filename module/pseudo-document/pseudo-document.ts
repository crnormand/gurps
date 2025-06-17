import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

type PseudoDocumentMetadata = {
  /* ---------------------------------------- */
  /* The document name of this pseudo-document. */
  documentName: string | null
  /** The localization string for this pseudo-document */
  label: string
  /** The font-awesome icon for this pseudo-document type */
  icon: string
  /* Record of document names of pseudo-documents and the path to the collection. */
  embedded: Record<string, string>
  /* The class used to render this pseudo-document. */
  sheetClass?: PseudoDocumentSheet
}

/* ---------------------------------------- */

class PseudoDocument<Schema extends PseudoDocumentSchema = PseudoDocumentSchema> extends DataModel<
  Schema,
  DataModel.Any
> {
  /* ---------------------------------------- */

  static get metadata(): PseudoDocumentMetadata {
    return {
      documentName: null,
      label: '',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  get metadata() {
    return (this.constructor as typeof PseudoDocument).metadata
  }

  /* ---------------------------------------- */

  static override defineSchema(): PseudoDocumentSchema {
    return pseudoDocumentSchema()
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = ['DOCUMENT']

  /* ---------------------------------------- */

  /**
   * The id of this pseudo-document.
   */
  get id() {
    return this._id
  }

  /* ---------------------------------------- */

  /**
   * The document name of this pseudo document.
   */
  get documentName(): string | null {
    return this.metadata.documentName
  }

  /* ---------------------------------------- */

  /**
   * The uuid of this document.
   */
  get uuid(): string {
    let parent = this.parent
    while (!(parent instanceof PseudoDocument) && !(parent instanceof foundry.abstract.Document)) parent = parent.parent
    return [parent.uuid, this.documentName, this.id].join('.')
  }

  /* ---------------------------------------- */

  /**
   * The parent document of this pseudo-document.
   */
  get document(): foundry.abstract.Document.Any {
    let parent: DataModel.Any = this
    while (!(parent instanceof foundry.abstract.Document)) parent = parent.parent
    return parent
  }
}

const pseudoDocumentSchema = () => {
  return {
    _id: new fields.DocumentIdField({ initial: () => foundry.utils.randomID() }),
  }
}

type PseudoDocumentSchema = ReturnType<typeof pseudoDocumentSchema>
