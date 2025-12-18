import DialogV2 from 'node_modules/fvtt-types/src/foundry/client/applications/api/dialog.mjs'

interface GetNumberInputOptions {
  title: string
  headerText: string
  promptText: string
  label: string
  okLabel?: string
  value: number
  min?: number
  max?: number
  step?: number
}

async function GetNumberInput(options: GetNumberInputOptions): Promise<number> {
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title: options.title },
      content: await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/ui/get-number-input.hbs', {
        headerText: options.headerText,
        promptText: options.promptText,
        label: options.label,
        value: options.value || 1,
        min: options.min || 1,
        max: options.max || 100,
        step: options.step || 1,
      }),
      ok: {
        label: options.okLabel || 'GURPS.submit',
        callback: (event: Event, button: HTMLButtonElement, dialog: DialogV2.Any) =>
          (button.form!.elements as any).number.valueAsNumber,
      },
    })
  } catch (err) {
    console.error('GetNumberInput: failed to open or process number input dialog.', err)
    return options.value || 1
  }
}

export { GetNumberInput, type GetNumberInputOptions }
