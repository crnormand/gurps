/**
 * @description Get multiline user input from a dialog box.
 *
 * @param {Object} options - Options for the dialog.
 * @param {string} options.title - The title of the dialog.
 * @param {string} options.label - The label for submit button, will be localized.
 * @param {number} [options.width=800] - The width of the dialog.
 * @param {number|string} [options.height='auto'] - The height of the dialog.
 * @param {string} options.placeholder - Placeholder text for the input field.
 * @param {string} options.content - The content to be displayed in the dialog.
 * @returns {Promise<Array>} - A promise that resolves with the user's input.
 */
export default async function getUserInput(options) {
  return new Promise(async resolve => {
    await new foundry.applications.api.DialogV2({
      window: {
        title: options.title,
        resizable: true,
      },
      position: {
        width: options.width ?? 800,
        height: options.height ?? 'auto',
      },
      content: await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/get-user-input.hbs', {
        block: options.content || '',
        placeholder: options.placeholder || 'GURPS.enterTextHere',
      }),
      buttons: [
        {
          action: 'import',
          label: options.label || 'GURPS.submit',
          icon: 'fa-solid fa-circle-check',
          default: true,
          callback: (_, button, __) => button.form.elements.text.value, // Resolve with the input text
        },
        {
          action: 'cancel',
          label: 'GURPS.cancel',
          icon: 'fas fa-times',
          callback: () => undefined, // Resolve with undefined if cancelled
        },
      ],
      submit: async result => resolve(result),
      form: { closeOnSubmit: true },
    }).render({ force: true })
  })
}
