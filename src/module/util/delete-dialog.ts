import { Document } from '@gurps-types/foundry/index.js'
import { isContainable } from '@module/data/mixins/containable.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'
import { InexactPartial } from 'fvtt-types/utils'

import { getGame } from './guards.js'

type DeleteOperationFor<Doc extends Document.Any | PseudoDocument.Any> =
  Doc extends Document<infer Type, infer _Schema, infer _Parent>
    ? Document.Database.DeleteOperationForName<Type>
    : PseudoDocument.DeleteOperation

/**
 * Present a Dialog form to confirm deletion of this PseudoDocument or Document.
 * @param [options] Additional options passed to `DialogV2.confirm`
 * @param [operation]  Document deletion options.
 * @returns A Promise that resolves to the deleted PseudoDocument
 */
export async function deleteDialogWithContents<Doc extends Document.Any | PseudoDocument.Any>(
  this: Doc,
  options?: InexactPartial<foundry.applications.api.DialogV2.ConfirmConfig>,
  operation?: DeleteOperationFor<Doc>
): Promise<Doc | false | null | undefined> {
  let content = options?.content

  const documentName = getGame().i18n.localize(`DOCUMENT.${this.documentName}`)
  const name = ('name' in this ? this.name : null) as string | null

  if (!content) {
    const question = getGame().i18n.localize('COMMON.AreYouSure')
    const warning = getGame().i18n.format('SIDEBAR.DeleteWarning', { documentName })

    content = `<p><strong>${question}</strong> ${warning}</p>`
  }

  if (isContainable(this)) {
    const contentsCount = this.allContents.length

    if (contentsCount > 0) {
      content += `<label>
          <input type="checkbox" name="deleteContents">
          ${game.i18n?.format('GURPS.item.deleteContents', { count: contentsCount.toString() })}
          </label>`
    }
  }

  let title = `${getGame().i18n.format('DOCUMENT.Delete', { type: documentName })}`

  if (name) title += `: ${name}`

  return foundry.applications.api.DialogV2.confirm(
    foundry.utils.mergeObject(
      {
        content,
        yes: {
          callback: async (event: PointerEvent | SubmitEvent) => {
            const deleteContents = (
              (event.currentTarget as HTMLElement).querySelector('[name="deleteContents"]') as HTMLInputElement
            )?.checked

            await this.delete({ ...operation, deleteContents } as any)
          },
        },
        window: {
          icon: 'fa-solid fa-trash',
          title,
        },
      },
      options
    ) as foundry.applications.api.DialogV2.ConfirmConfig
  ) as Promise<Doc | false | null | undefined>
}
