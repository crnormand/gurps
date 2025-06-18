import Document = foundry.abstract.Document

import { type PseudoDocument } from 'module/pseudo-document/pseudo-document.js'
import { type ModelCollection } from 'module/data/model-collection.js'

type Constructor<Instance> = new (...args: any[]) => Instance

const BaseDocumentMixin = <Base extends Constructor<Document.Any>>(base: Base) => {
  return class GurpsDocument extends base {
    constructor(...args: any[]) {
      super(...args)
    }

    /* ---------------------------------------- */

    // @ts-expect-error: mixin complaints
    override getEmbeddedDocument(
      embeddedName: string,
      id: string,
      { invalid, strict }: Document.GetEmbeddedDocumentOptions
    ): Document.Any | PseudoDocument | undefined {
      const systemEmbeds = (this.system?.constructor as any).metadata.embedded ?? {}
      if (embeddedName in systemEmbeds) {
        const path = systemEmbeds[embeddedName]
        return foundry.utils.getProperty(this, path).get(id, { invalid, strict }) ?? null
      }
      // @ts-expect-error: mixin complaints
      return super.getEmbeddedDocument(embeddedName, id, { invalid, strict })
    }

    /* ---------------------------------------- */

    /**
     * Obtain the embedded collection of a given pseudo-document type.
     * @param {string} embeddedName   The document name of the embedded collection.
     * @returns {ModelCollection}     The embedded collection.
     */
    getEmbeddedPseudoDocumentCollection(embeddedName: string): ModelCollection {
      const collectionPath = (this.system?.constructor as any).metadata.embedded?.[embeddedName]
      if (!collectionPath) {
        throw new Error(
          `${embeddedName} is not a valid embedded Pseudo-Document within the [${'type' in this ? this.type : 'base'}] ${this.documentName} subtype!`
        )
      }
      return foundry.utils.getProperty(this, collectionPath)
    }
  }
}

export { BaseDocumentMixin }
