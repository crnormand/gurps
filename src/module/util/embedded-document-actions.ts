import { Document } from '@gurps-types/foundry/index.js'
import { ItemType } from '@module/item/types.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'
import { AnyMutableObject } from 'fvtt-types/utils'

/* ---------------------------------------- */

type EmbeddedDocumentApplication = {
  document: Document.Any
}

/* ---------------------------------------- */

async function createEmbeddedAction(
  this: EmbeddedDocumentApplication,
  event: PointerEvent | null,
  target: HTMLElement
): Promise<void> {
  event?.preventDefault()

  const documentName = target.closest<HTMLElement>('[data-document-name]')?.dataset.documentName

  if (!documentName) {
    console.error('Could not find document name for embedded document to edit.')

    return
  }

  const createData: AnyMutableObject = { _id: foundry.utils.randomID() }
  const type = target.closest<HTMLElement>('[data-type]')?.dataset.type

  if (type) createData.type = type

  if (documentName === 'Item' && this.document.documentName === 'Actor') {
    const defaultName = foundry.documents.Item.defaultName({
      type: type as foundry.documents.Item.SubType,
      parent: this.document as Actor.Implementation,
    })

    createData.name = defaultName
  }

  if (type === ItemType.Equipment && this.document.documentName === 'Actor') {
    const carried = target.closest<HTMLElement>('[data-carried]')?.dataset.carried === 'true'

    createData.system = { carried }
  }

  await this.document.createEmbeddedDocuments(
    documentName as never,
    [createData] as never,
    {
      parent: this.document,
    } as never
  )
}

/* ---------------------------------------- */

async function getEmbeddedDocument(
  parent: Document.Any,
  target: HTMLElement
): Promise<Document.Any | PseudoDocument.Any | null> {
  const uuid = target.closest<HTMLElement>('[data-uuid]')?.dataset.uuid

  if (!uuid) {
    console.error('Could not find UUID for embedded document to edit.')

    return null
  }

  let doc: Document.Any | PseudoDocument.Any | null = null

  if (uuid.startsWith('.')) {
    doc = await fromUuid(uuid, { relative: parent })
  } else {
    doc = await fromUuid(uuid)
  }

  if (!doc) {
    console.error(`Could not find document for UUID ${uuid}.`)

    return null
  }

  return doc
}

/* ---------------------------------------- */

async function editEmbeddedAction(
  this: EmbeddedDocumentApplication,
  event: PointerEvent | null,
  target: HTMLElement
): Promise<void> {
  event?.preventDefault?.()

  const doc = await getEmbeddedDocument(this.document, target)

  if (!doc) return

  const sheet = 'sheet' in doc ? doc.sheet : null

  if (!sheet) {
    console.error(`Could not find sheet for document with UUID ${doc.uuid}.`)

    return
  }

  await sheet.render({ force: true })
}

/* ---------------------------------------- */

async function deleteEmbeddedAction(
  this: EmbeddedDocumentApplication,
  event: PointerEvent | null,
  target: HTMLElement
): Promise<void> {
  event?.preventDefault?.()

  const doc = await getEmbeddedDocument(this.document, target)

  if (!doc) return

  if ('deleteDialog' in doc && typeof doc.deleteDialog === 'function') {
    await doc.deleteDialog()
  } else {
    console.error(`Could not find delete method for document with UUID ${doc.uuid}.`)
  }
}

/* ---------------------------------------- */

async function toggleContainerAction(
  this: EmbeddedDocumentApplication,
  event: PointerEvent,
  target: HTMLElement
): Promise<void> {
  event.preventDefault()

  const doc = await getEmbeddedDocument(this.document, target)

  if (!doc) return

  if ('toggleOpen' in doc && typeof doc.toggleOpen === 'function') {
    await doc.toggleOpen()
  } else {
    console.error(
      'Tried to toggle open state of a pseudo-document or document, but the document does not have a toggleOpen function'
    )
  }
}

/* ---------------------------------------- */

export { createEmbeddedAction, deleteEmbeddedAction, editEmbeddedAction, getEmbeddedDocument, toggleContainerAction }
